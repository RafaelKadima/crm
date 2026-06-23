<?php

namespace App\Console\Commands;

use App\Models\Kpi;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use App\Services\KpiService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class BackfillDefaultKpisCommand extends Command
{
    protected $signature = 'kpis:backfill-defaults
                            {--tenant= : UUID de um tenant específico (opcional)}
                            {--only-empty : Processa apenas tenants que ainda não têm nenhum KPI}';

    protected $description = 'Inicializa os KPIs padrão do sistema para tenants que ainda não os possuem (idempotente).';

    public function handle(KpiService $kpiService): int
    {
        $tenantId = $this->option('tenant');
        $onlyEmpty = (bool) $this->option('only-empty');

        $tenants = Tenant::query()
            ->when($tenantId, fn ($q) => $q->where('id', $tenantId))
            ->orderBy('name')
            ->get();

        if ($tenants->isEmpty()) {
            $this->warn('Nenhum tenant encontrado.');

            return self::SUCCESS;
        }

        $this->info("Processando {$tenants->count()} tenant(s)...");
        $this->newLine();

        $processed = 0;
        $skipped = 0;
        $totalCreated = 0;

        foreach ($tenants as $tenant) {
            $before = Kpi::withoutGlobalScope(TenantScope::class)
                ->where('tenant_id', $tenant->id)
                ->count();

            if ($onlyEmpty && $before > 0) {
                $skipped++;
                continue;
            }

            $kpiService->initializeDefaultKpis($tenant->id);

            $after = Kpi::withoutGlobalScope(TenantScope::class)
                ->where('tenant_id', $tenant->id)
                ->count();

            $created = $after - $before;
            $totalCreated += $created;
            $processed++;

            $this->line(sprintf(
                '  %-30s KPIs: %d -> %d (+%d)',
                Str::limit($tenant->name, 28),
                $before,
                $after,
                $created
            ));
        }

        $this->newLine();
        $this->info(sprintf(
            'Concluído. Tenants processados: %d | ignorados: %d | KPIs criados: %d.',
            $processed,
            $skipped,
            $totalCreated
        ));

        return self::SUCCESS;
    }
}
