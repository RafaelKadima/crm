<?php

namespace App\Services\ManagerialFunnel;

use App\Enums\FunnelCategoryEnum;
use App\Enums\LeadStatusEnum;
use App\Models\Appointment;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\PipelineStage;
use App\Models\Ticket;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Única fonte que monta dados para a Suite Gerencial de Funil.
 *
 * Controllers são finos — apenas orquestram. Toda lógica de agregação
 * (conversão entre categorias, velocity, coorte, forecast, perdas) vive aqui
 * para reutilização e consistência entre relatórios.
 */
class FunnelAggregator
{
    public function __construct(private readonly string $tenantId)
    {
    }

    /**
     * Topo do funil em 3 camadas: contatos únicos novos → conversas/tickets → leads criados.
     */
    public function topOfFunnel(Filters $filters): array
    {
        $contactsQuery = Contact::where('tenant_id', $this->tenantId);
        $ticketsQuery = Ticket::where('tenant_id', $this->tenantId);
        $leadsQuery = $this->leadsQuery($filters);

        $this->applyDateRange($contactsQuery, 'created_at', $filters);
        $this->applyDateRange($ticketsQuery, 'created_at', $filters);
        $this->applyDateRange($leadsQuery, 'created_at', $filters);

        if ($filters->channelId) {
            $ticketsQuery->where('channel_id', $filters->channelId);
        }

        return [
            'contacts_new' => (int) $contactsQuery->count(),
            'tickets_new' => (int) $ticketsQuery->count(),
            'leads_new' => (int) $leadsQuery->count(),
        ];
    }

    /**
     * Quantos leads PASSARAM por cada categoria do funil no período.
     *
     * Isso reconstrói o histórico via lead_activities (stage_changed). Um lead que
     * foi Novo → Qualificado → Proposta no período conta em TODAS as 3 categorias —
     * permite calcular conversão real entre etapas.
     */
    public function byCategory(Filters $filters): array
    {
        $categories = FunnelCategoryEnum::orderedForFunnel();
        $result = [];

        $stageMap = $this->stageFunnelMap();

        foreach ($categories as $category) {
            $stageIds = $stageMap->get($category->value, collect())->pluck('id')->all();

            if (empty($stageIds)) {
                $result[] = [
                    'category' => $category->value,
                    'label' => $category->label(),
                    'leads_passed' => 0,
                    'total_value' => 0.0,
                    'stage_ids' => [],
                ];
                continue;
            }

            $passedCount = $this->leadsPassedThroughStages($filters, $stageIds);
            $totalValue = $this->leadsValuePassedThroughStages($filters, $stageIds);

            $result[] = [
                'category' => $category->value,
                'label' => $category->label(),
                'leads_passed' => $passedCount,
                'total_value' => round((float) $totalValue, 2),
                'stage_ids' => $stageIds,
            ];
        }

        return $result;
    }

    /**
     * Agendamentos no período (Meio do funil): criados, confirmados, realizados, no-show.
     */
    public function appointments(Filters $filters): array
    {
        $query = Appointment::whereHas('lead', fn ($q) => $q->where('tenant_id', $this->tenantId));
        $this->applyDateRange($query, 'scheduled_at', $filters);

        $byStatus = (clone $query)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->toArray();

        $total = array_sum($byStatus);

        return [
            'total' => (int) $total,
            'scheduled' => (int) ($byStatus['scheduled'] ?? 0),
            'confirmed' => (int) ($byStatus['confirmed'] ?? 0),
            'completed' => (int) ($byStatus['completed'] ?? 0),
            'no_show' => (int) ($byStatus['no_show'] ?? 0),
            'cancelled' => (int) ($byStatus['cancelled'] ?? 0),
            'rescheduled' => (int) ($byStatus['rescheduled'] ?? 0),
            'show_up_rate' => $total > 0
                ? round((((int) ($byStatus['completed'] ?? 0)) / $total) * 100, 2)
                : 0,
        ];
    }

    /**
     * Totais de fim de funil: ganhos (com valor) vs perdidos vs desqualificados.
     */
    public function bottomOfFunnel(Filters $filters): array
    {
        $leadsQuery = $this->leadsQuery($filters);
        $this->applyDateRange($leadsQuery, 'updated_at', $filters);

        $won = (clone $leadsQuery)->where('status', LeadStatusEnum::WON);
        $lost = (clone $leadsQuery)->where('status', LeadStatusEnum::LOST);
        $disqualified = (clone $leadsQuery)->where('status', LeadStatusEnum::DISQUALIFIED);

        return [
            'won_count' => (int) (clone $won)->count(),
            'won_value' => round((float) (clone $won)->sum('value'), 2),
            'lost_count' => (int) (clone $lost)->count(),
            'lost_value' => round((float) (clone $lost)->sum('value'), 2),
            'disqualified_count' => (int) (clone $disqualified)->count(),
            'disqualified_value' => round((float) (clone $disqualified)->sum('value'), 2),
        ];
    }

    /**
     * Taxas de conversão entre categorias consecutivas do funil.
     * Ex: [arrived → qualified: 48%, qualified → scheduled: 62%, ...]
     */
    public function conversionRates(array $byCategory): array
    {
        $rates = [];
        for ($i = 0; $i < count($byCategory) - 1; $i++) {
            $from = $byCategory[$i];
            $to = $byCategory[$i + 1];
            $rate = $from['leads_passed'] > 0
                ? round(($to['leads_passed'] / $from['leads_passed']) * 100, 2)
                : 0;
            $rates[] = [
                'from' => $from['category'],
                'to' => $to['category'],
                'rate' => $rate,
            ];
        }
        return $rates;
    }

    /**
     * Pareto de motivos de perda no período.
     */
    public function lossesByReason(Filters $filters): array
    {
        $query = Lead::where('leads.tenant_id', $this->tenantId)
            ->where('leads.status', LeadStatusEnum::LOST);
        if ($filters->dateFrom) {
            $query->whereDate('leads.updated_at', '>=', $filters->dateFrom);
        }
        if ($filters->dateTo) {
            $query->whereDate('leads.updated_at', '<=', $filters->dateTo);
        }
        if ($filters->ownerId) {
            $query->where('leads.owner_id', $filters->ownerId);
        }
        if ($filters->channelId) {
            $query->where('leads.channel_id', $filters->channelId);
        }

        $rows = $query
            ->leftJoin('lost_reasons', 'leads.lost_reason_id', '=', 'lost_reasons.id')
            ->select(
                'leads.lost_reason_id',
                'lost_reasons.name as reason_name',
                'lost_reasons.color as reason_color',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(leads.value) as total_value')
            )
            ->groupBy('leads.lost_reason_id', 'lost_reasons.name', 'lost_reasons.color')
            ->orderByDesc(DB::raw('COUNT(*)'))
            ->get();

        return $rows->map(fn ($r) => [
            'lost_reason_id' => $r->lost_reason_id,
            'reason_name' => $r->reason_name ?? 'Sem motivo registrado',
            'reason_color' => $r->reason_color,
            'count' => (int) $r->count,
            'total_value' => round((float) ($r->total_value ?? 0), 2),
        ])->all();
    }

    /**
     * Heatmap: em qual categoria o lead morreu (último stage antes de virar Lost),
     * cruzado com motivo da perda.
     */
    public function lossesHeatmap(Filters $filters): array
    {
        $query = Lead::where('leads.tenant_id', $this->tenantId)
            ->where('leads.status', LeadStatusEnum::LOST)
            ->whereNotNull('leads.stage_id');
        if ($filters->dateFrom) {
            $query->whereDate('leads.updated_at', '>=', $filters->dateFrom);
        }
        if ($filters->dateTo) {
            $query->whereDate('leads.updated_at', '<=', $filters->dateTo);
        }

        $rows = $query
            ->leftJoin('pipeline_stages', 'leads.stage_id', '=', 'pipeline_stages.id')
            ->leftJoin('lost_reasons', 'leads.lost_reason_id', '=', 'lost_reasons.id')
            ->select(
                'pipeline_stages.funnel_category',
                'lost_reasons.name as reason_name',
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('pipeline_stages.funnel_category', 'lost_reasons.name')
            ->get();

        return $rows->map(fn ($r) => [
            'funnel_category' => $r->funnel_category ?? FunnelCategoryEnum::UNMAPPED->value,
            'reason_name' => $r->reason_name ?? 'Sem motivo',
            'count' => (int) $r->count,
        ])->all();
    }

    /**
     * Velocity: tempo médio que leads passam em cada categoria, reconstruído de lead_activities.
     */
    public function velocity(Filters $filters): array
    {
        $stageMap = $this->stageFunnelMap();

        $leadIds = $this->leadsQuery($filters)
            ->when($filters->dateFrom, fn ($q) => $q->whereDate('created_at', '>=', $filters->dateFrom))
            ->when($filters->dateTo, fn ($q) => $q->whereDate('created_at', '<=', $filters->dateTo))
            ->pluck('id');

        if ($leadIds->isEmpty()) {
            return $this->emptyVelocity();
        }

        $activities = LeadActivity::where('tenant_id', $this->tenantId)
            ->where('type', 'stage_changed')
            ->whereIn('lead_id', $leadIds)
            ->orderBy('lead_id')
            ->orderBy('created_at')
            ->get(['lead_id', 'data', 'created_at']);

        $stageToCategory = [];
        foreach ($stageMap as $category => $stages) {
            foreach ($stages as $stage) {
                $stageToCategory[$stage->id] = $category;
            }
        }

        $categoryTimes = [];
        $byLead = $activities->groupBy('lead_id');

        foreach ($byLead as $leadActivities) {
            $prev = null;
            foreach ($leadActivities as $activity) {
                $data = is_array($activity->data) ? $activity->data : json_decode($activity->data, true);
                $toStageId = $data['to_stage_id'] ?? $data['new_stage_id'] ?? null;

                if ($prev) {
                    $prevCategory = $stageToCategory[$prev['stage_id']] ?? null;
                    if ($prevCategory) {
                        $seconds = $activity->created_at->getTimestamp() - $prev['entered_at']->getTimestamp();
                        $categoryTimes[$prevCategory][] = max(0, $seconds);
                    }
                }

                if ($toStageId) {
                    $prev = ['stage_id' => $toStageId, 'entered_at' => $activity->created_at];
                }
            }
        }

        $result = [];
        foreach (FunnelCategoryEnum::orderedForFunnel() as $category) {
            $samples = $categoryTimes[$category->value] ?? [];
            $avg = !empty($samples) ? array_sum($samples) / count($samples) : 0;
            $result[] = [
                'category' => $category->value,
                'label' => $category->label(),
                'avg_seconds' => (int) $avg,
                'avg_days' => round($avg / 86400, 2),
                'samples' => count($samples),
            ];
        }

        return $result;
    }

    /**
     * Forecast ponderado: valor esperado = Σ(value × probability) de leads abertos.
     */
    public function forecast(Filters $filters): array
    {
        $query = Lead::where('leads.tenant_id', $this->tenantId)
            ->where('leads.status', LeadStatusEnum::OPEN)
            ->whereNotNull('leads.stage_id');

        if ($filters->pipelineId) {
            $query->where('leads.pipeline_id', $filters->pipelineId);
        }
        if ($filters->ownerId) {
            $query->where('leads.owner_id', $filters->ownerId);
        }
        if ($filters->channelId) {
            $query->where('leads.channel_id', $filters->channelId);
        }

        $rows = $query
            ->join('pipeline_stages', 'leads.stage_id', '=', 'pipeline_stages.id')
            ->select(
                'leads.stage_id',
                'pipeline_stages.name as stage_name',
                'pipeline_stages.probability',
                'pipeline_stages.funnel_category',
                DB::raw('COUNT(*) as leads_count'),
                DB::raw('SUM(leads.value) as total_value'),
                DB::raw('SUM(leads.value * (pipeline_stages.probability / 100.0)) as weighted_value')
            )
            ->groupBy('leads.stage_id', 'pipeline_stages.name', 'pipeline_stages.probability', 'pipeline_stages.funnel_category')
            ->orderBy('pipeline_stages.probability', 'desc')
            ->get();

        $totalWeighted = (float) $rows->sum('weighted_value');
        $totalRaw = (float) $rows->sum('total_value');
        $totalLeads = (int) $rows->sum('leads_count');

        return [
            'total_weighted_value' => round($totalWeighted, 2),
            'total_raw_value' => round($totalRaw, 2),
            'total_open_leads' => $totalLeads,
            'by_stage' => $rows->map(fn ($r) => [
                'stage_id' => $r->stage_id,
                'stage_name' => $r->stage_name,
                'funnel_category' => $r->funnel_category,
                'probability' => (int) $r->probability,
                'leads_count' => (int) $r->leads_count,
                'total_value' => round((float) $r->total_value, 2),
                'weighted_value' => round((float) $r->weighted_value, 2),
            ])->all(),
        ];
    }

    /**
     * Coorte por canal: para leads que chegaram em cada mês, quantos % avançaram em cada categoria.
     */
    public function cohortByChannel(Filters $filters): array
    {
        $leads = Lead::where('leads.tenant_id', $this->tenantId)
            ->when($filters->pipelineId, fn ($q) => $q->where('leads.pipeline_id', $filters->pipelineId))
            ->when($filters->ownerId, fn ($q) => $q->where('leads.owner_id', $filters->ownerId))
            ->when($filters->channelId, fn ($q) => $q->where('leads.channel_id', $filters->channelId))
            ->when($filters->dateFrom, fn ($q) => $q->whereDate('leads.created_at', '>=', $filters->dateFrom))
            ->when($filters->dateTo, fn ($q) => $q->whereDate('leads.created_at', '<=', $filters->dateTo))
            ->leftJoin('channels', 'leads.channel_id', '=', 'channels.id')
            ->select(
                'leads.id',
                'leads.channel_id',
                'channels.name as channel_name',
                'channels.type as channel_type',
                DB::raw($this->monthExpression('leads.created_at') . ' as cohort_month'),
                'leads.status'
            )
            ->get();

        $cohorts = [];
        foreach ($leads->groupBy(['cohort_month', 'channel_id']) as $month => $byChannel) {
            foreach ($byChannel as $channelId => $group) {
                $first = $group->first();
                $total = $group->count();
                $won = $group->where('status', LeadStatusEnum::WON->value)->count();

                $cohorts[] = [
                    'cohort_month' => $month,
                    'channel_id' => $channelId,
                    'channel_name' => $first->channel_name ?? 'Sem canal',
                    'channel_type' => $first->channel_type ?? 'outros',
                    'total_leads' => $total,
                    'won_leads' => $won,
                    'conversion_rate' => $total > 0 ? round(($won / $total) * 100, 2) : 0,
                ];
            }
        }

        return $cohorts;
    }

    /**
     * Drill-down: lista leads contados em uma célula específica do funil.
     */
    public function drillDown(Filters $filters, FunnelCategoryEnum $category, int $limit = 50): Collection
    {
        $stageIds = $this->stageFunnelMap()->get($category->value, collect())->pluck('id');

        if ($stageIds->isEmpty()) {
            return collect();
        }

        $leadIds = LeadActivity::where('tenant_id', $this->tenantId)
            ->where('type', 'stage_changed')
            ->when($filters->dateFrom, fn ($q) => $q->whereDate('created_at', '>=', $filters->dateFrom))
            ->when($filters->dateTo, fn ($q) => $q->whereDate('created_at', '<=', $filters->dateTo))
            ->where(function ($q) use ($stageIds) {
                foreach ($stageIds as $id) {
                    $q->orWhereJsonContains('data->to_stage_id', $id)
                      ->orWhereJsonContains('data->new_stage_id', $id);
                }
            })
            ->pluck('lead_id')
            ->unique();

        return Lead::where('tenant_id', $this->tenantId)
            ->whereIn('id', $leadIds)
            ->with(['contact:id,name,phone', 'owner:id,name', 'stage:id,name,funnel_category'])
            ->limit($limit)
            ->get();
    }

    // ===== Helpers privados =====

    private function leadsQuery(Filters $filters)
    {
        $q = Lead::where('tenant_id', $this->tenantId);

        if ($filters->pipelineId) {
            $q->where('pipeline_id', $filters->pipelineId);
        }
        if ($filters->ownerId) {
            $q->where('owner_id', $filters->ownerId);
        }
        if ($filters->channelId) {
            $q->where('channel_id', $filters->channelId);
        }
        if ($filters->queueId) {
            $q->where('queue_id', $filters->queueId);
        }

        return $q;
    }

    private function applyDateRange($query, string $column, Filters $filters): void
    {
        if ($filters->dateFrom) {
            $query->whereDate($column, '>=', $filters->dateFrom);
        }
        if ($filters->dateTo) {
            $query->whereDate($column, '<=', $filters->dateTo);
        }
    }

    private function stageFunnelMap(): Collection
    {
        $query = PipelineStage::where('tenant_id', $this->tenantId)
            ->where('funnel_category', '!=', FunnelCategoryEnum::UNMAPPED->value);

        return $query->get()->groupBy(fn ($s) => $s->funnel_category?->value ?? 'unmapped');
    }

    private function leadsPassedThroughStages(Filters $filters, array $stageIds): int
    {
        $query = LeadActivity::where('tenant_id', $this->tenantId)
            ->where('type', 'stage_changed')
            ->where(function ($q) use ($stageIds) {
                foreach ($stageIds as $id) {
                    $q->orWhereJsonContains('data->to_stage_id', $id)
                      ->orWhereJsonContains('data->new_stage_id', $id);
                }
            });

        if ($filters->dateFrom) {
            $query->whereDate('created_at', '>=', $filters->dateFrom);
        }
        if ($filters->dateTo) {
            $query->whereDate('created_at', '<=', $filters->dateTo);
        }

        return (int) $query->distinct('lead_id')->count('lead_id');
    }

    private function leadsValuePassedThroughStages(Filters $filters, array $stageIds): float
    {
        $leadIds = LeadActivity::where('tenant_id', $this->tenantId)
            ->where('type', 'stage_changed')
            ->where(function ($q) use ($stageIds) {
                foreach ($stageIds as $id) {
                    $q->orWhereJsonContains('data->to_stage_id', $id)
                      ->orWhereJsonContains('data->new_stage_id', $id);
                }
            })
            ->when($filters->dateFrom, fn ($q) => $q->whereDate('created_at', '>=', $filters->dateFrom))
            ->when($filters->dateTo, fn ($q) => $q->whereDate('created_at', '<=', $filters->dateTo))
            ->distinct('lead_id')
            ->pluck('lead_id');

        if ($leadIds->isEmpty()) {
            return 0.0;
        }

        return (float) Lead::where('tenant_id', $this->tenantId)
            ->whereIn('id', $leadIds)
            ->sum('value');
    }

    /**
     * Expressão SQL que retorna o mês no formato YYYY-MM, cross-DB (PostgreSQL / SQLite).
     */
    private function monthExpression(string $column): string
    {
        $driver = DB::connection()->getDriverName();
        return match ($driver) {
            'pgsql' => "TO_CHAR({$column}, 'YYYY-MM')",
            'sqlite' => "strftime('%Y-%m', {$column})",
            'mysql', 'mariadb' => "DATE_FORMAT({$column}, '%Y-%m')",
            default => "SUBSTR({$column}, 1, 7)",
        };
    }

    private function emptyVelocity(): array
    {
        return collect(FunnelCategoryEnum::orderedForFunnel())
            ->map(fn ($c) => [
                'category' => $c->value,
                'label' => $c->label(),
                'avg_seconds' => 0,
                'avg_days' => 0,
                'samples' => 0,
            ])
            ->all();
    }

    /**
     * Para Δ% comparando período atual vs período anterior de mesmo tamanho.
     */
    public static function previousPeriodFilters(Filters $filters): Filters
    {
        if (!$filters->dateFrom || !$filters->dateTo) {
            return $filters;
        }

        $from = CarbonImmutable::parse($filters->dateFrom);
        $to = CarbonImmutable::parse($filters->dateTo);
        $days = $from->diffInDays($to) + 1;

        return $filters->withDates(
            $from->subDays($days)->toDateString(),
            $from->subDay()->toDateString()
        );
    }
}
