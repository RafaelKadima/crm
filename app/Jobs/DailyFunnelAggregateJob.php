<?php

namespace App\Jobs;

use App\Enums\FunnelCategoryEnum;
use App\Enums\LeadStatusEnum;
use App\Models\FunnelSnapshot;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\PipelineStage;
use App\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Agrega dados de funil para um dia específico em funnel_snapshots.
 *
 * Idempotente: pode ser re-executado para o mesmo dia sem duplicar
 * (upsert pela chave única de dimensões).
 */
class DailyFunnelAggregateJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 900;

    public function __construct(
        public readonly ?string $tenantId = null,
        public readonly ?string $date = null,
    ) {
    }

    public function handle(): void
    {
        $date = $this->date
            ? CarbonImmutable::parse($this->date)
            : CarbonImmutable::yesterday();

        $tenants = $this->tenantId
            ? Tenant::where('id', $this->tenantId)->get()
            : Tenant::all();

        foreach ($tenants as $tenant) {
            $this->aggregateTenant($tenant->id, $date);
        }
    }

    private function aggregateTenant(string $tenantId, CarbonImmutable $date): void
    {
        $dayStart = $date->startOfDay();
        $dayEnd = $date->endOfDay();

        // Mapeamento stage → categoria para este tenant
        $stagesByCategory = PipelineStage::where('tenant_id', $tenantId)
            ->get()
            ->groupBy(fn ($s) => $s->funnel_category?->value ?? FunnelCategoryEnum::UNMAPPED->value);

        // Atividades stage_changed do dia — derivamos entries por categoria
        $activities = LeadActivity::where('tenant_id', $tenantId)
            ->where('type', 'stage_changed')
            ->whereBetween('created_at', [$dayStart, $dayEnd])
            ->get(['lead_id', 'data']);

        $leadIds = $activities->pluck('lead_id')->unique();
        $leadsById = Lead::where('tenant_id', $tenantId)
            ->whereIn('id', $leadIds)
            ->get(['id', 'value', 'pipeline_id', 'channel_id', 'owner_id'])
            ->keyBy('id');

        $stageToCategory = [];
        foreach ($stagesByCategory as $category => $stages) {
            foreach ($stages as $stage) {
                $stageToCategory[$stage->id] = $category;
            }
        }

        $buckets = [];

        foreach ($activities as $activity) {
            $data = is_array($activity->data) ? $activity->data : (json_decode($activity->data, true) ?: []);
            $toStageId = $data['to_stage_id'] ?? $data['new_stage_id'] ?? null;
            if (!$toStageId) {
                continue;
            }
            $category = $stageToCategory[$toStageId] ?? FunnelCategoryEnum::UNMAPPED->value;
            $lead = $leadsById->get($activity->lead_id);
            if (!$lead) {
                continue;
            }

            $key = implode('|', [
                $lead->pipeline_id,
                $lead->channel_id ?? '',
                $lead->owner_id ?? '',
                $category,
            ]);

            if (!isset($buckets[$key])) {
                $buckets[$key] = [
                    'pipeline_id' => $lead->pipeline_id,
                    'channel_id' => $lead->channel_id,
                    'owner_id' => $lead->owner_id,
                    'funnel_category' => $category,
                    'leads_entered' => 0,
                    'value_entered' => 0.0,
                    'unique_leads' => [],
                ];
            }

            if (!isset($buckets[$key]['unique_leads'][$lead->id])) {
                $buckets[$key]['unique_leads'][$lead->id] = true;
                $buckets[$key]['leads_entered']++;
                $buckets[$key]['value_entered'] += (float) $lead->value;
            }
        }

        DB::transaction(function () use ($buckets, $tenantId, $dayStart) {
            // Limpa o dia antes de inserir (idempotência simples)
            FunnelSnapshot::where('tenant_id', $tenantId)
                ->whereDate('snapshot_date', $dayStart->toDateString())
                ->delete();

            foreach ($buckets as $bucket) {
                FunnelSnapshot::create([
                    'tenant_id' => $tenantId,
                    'snapshot_date' => $dayStart->toDateString(),
                    'pipeline_id' => $bucket['pipeline_id'],
                    'channel_id' => $bucket['channel_id'],
                    'owner_id' => $bucket['owner_id'],
                    'funnel_category' => $bucket['funnel_category'],
                    'leads_entered' => $bucket['leads_entered'],
                    'leads_exited' => 0,
                    'value_entered' => $bucket['value_entered'],
                    'avg_time_in_category_seconds' => 0,
                    'samples_for_avg' => 0,
                ]);
            }
        });
    }
}
