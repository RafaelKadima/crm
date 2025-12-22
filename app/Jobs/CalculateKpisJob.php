<?php

namespace App\Jobs;

use App\Models\Kpi;
use App\Models\KpiValue;
use App\Models\KprSnapshot;
use App\Models\Kpr;
use App\Models\Tenant;
use App\Services\KpiService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CalculateKpisJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public ?string $tenantId = null,
        public ?string $period = null,
        public string $periodType = 'month'
    ) {
        $this->period = $period ?? Carbon::now()->format('Y-m');
    }

    /**
     * Execute the job.
     */
    public function handle(KpiService $kpiService): void
    {
        Log::info('Starting KPI calculation job', [
            'tenant_id' => $this->tenantId,
            'period' => $this->period,
            'period_type' => $this->periodType,
        ]);

        // Se um tenant específico foi passado, calcula apenas para ele
        if ($this->tenantId) {
            $this->calculateForTenant($this->tenantId, $kpiService);
            return;
        }

        // Caso contrário, calcula para todos os tenants ativos
        $tenants = Tenant::where('is_active', true)->get();

        foreach ($tenants as $tenant) {
            try {
                $this->calculateForTenant($tenant->id, $kpiService);
            } catch (\Exception $e) {
                Log::error('Error calculating KPIs for tenant', [
                    'tenant_id' => $tenant->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('KPI calculation job completed');
    }

    /**
     * Calcula KPIs para um tenant específico.
     */
    protected function calculateForTenant(string $tenantId, KpiService $kpiService): void
    {
        Log::debug('Calculating KPIs for tenant', ['tenant_id' => $tenantId]);

        // 1. Calcula KPIs gerais do tenant
        $kpis = Kpi::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get();

        foreach ($kpis as $kpi) {
            try {
                $kpiService->calculateKpiValue($kpi, $this->period, $this->periodType);
            } catch (\Exception $e) {
                Log::error('Error calculating KPI', [
                    'kpi_id' => $kpi->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // 2. Cria snapshots das KPRs ativas (para histórico/gráficos)
        $this->createKprSnapshots($tenantId);
    }

    /**
     * Cria snapshots diários das KPRs para histórico.
     */
    protected function createKprSnapshots(string $tenantId): void
    {
        $today = Carbon::today()->format('Y-m-d');

        $activeKprs = Kpr::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->with('assignments')
            ->get();

        foreach ($activeKprs as $kpr) {
            // Verifica se já existe snapshot para hoje
            $existingSnapshot = KprSnapshot::where('kpr_id', $kpr->id)
                ->whereDate('snapshot_date', $today)
                ->exists();

            if ($existingSnapshot) {
                continue;
            }

            // Calcula valores atuais
            $currentValue = $kpr->assignments->sum('current_value');
            $targetValue = $kpr->target_value;
            $progressPercentage = $targetValue > 0 ? ($currentValue / $targetValue) * 100 : 0;

            // Calcula dias decorridos e restantes
            $periodStart = Carbon::parse($kpr->period_start);
            $periodEnd = Carbon::parse($kpr->period_end);
            $totalDays = $periodStart->diffInDays($periodEnd);
            $elapsedDays = $periodStart->diffInDays(Carbon::today());
            $remainingDays = max(0, Carbon::today()->diffInDays($periodEnd, false));

            // Calcula valor esperado até hoje (linear)
            $expectedValue = $totalDays > 0
                ? ($targetValue * $elapsedDays / $totalDays)
                : 0;

            // Calcula projeção (extrapolação linear)
            $projectedValue = $elapsedDays > 0
                ? ($currentValue / $elapsedDays) * $totalDays
                : 0;

            // Determina status de tracking
            $trackStatus = $this->calculateTrackStatus($progressPercentage, $elapsedDays, $totalDays);

            KprSnapshot::create([
                'tenant_id' => $tenantId,
                'kpr_id' => $kpr->id,
                'snapshot_date' => $today,
                'current_value' => $currentValue,
                'target_value' => $targetValue,
                'progress_percentage' => min(100, $progressPercentage),
                'expected_value' => $expectedValue,
                'projected_value' => $projectedValue,
                'track_status' => $trackStatus,
                'metadata' => [
                    'elapsed_days' => $elapsedDays,
                    'remaining_days' => $remainingDays,
                    'total_days' => $totalDays,
                    'assignments_count' => $kpr->assignments->count(),
                ],
            ]);

            Log::debug('Created KPR snapshot', [
                'kpr_id' => $kpr->id,
                'date' => $today,
                'progress' => $progressPercentage,
                'status' => $trackStatus,
            ]);
        }
    }

    /**
     * Calcula o status de tracking baseado no progresso e tempo.
     */
    protected function calculateTrackStatus(float $progressPercentage, int $elapsedDays, int $totalDays): string
    {
        if ($totalDays <= 0) {
            return 'pending';
        }

        $expectedProgress = ($elapsedDays / $totalDays) * 100;

        // Margem de tolerância
        $margin = 10;

        if ($progressPercentage >= $expectedProgress + $margin) {
            return 'ahead';
        } elseif ($progressPercentage >= $expectedProgress - $margin) {
            return 'on_track';
        } elseif ($progressPercentage >= $expectedProgress - ($margin * 2)) {
            return 'behind';
        } else {
            return 'critical';
        }
    }
}
