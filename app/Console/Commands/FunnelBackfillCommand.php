<?php

namespace App\Console\Commands;

use App\Jobs\DailyFunnelAggregateJob;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class FunnelBackfillCommand extends Command
{
    protected $signature = 'funnel:backfill
                            {--days=30 : Quantos dias para trás reprocessar}
                            {--tenant= : UUID de um tenant específico (opcional)}';

    protected $description = 'Repopula funnel_snapshots historicamente (N dias para trás) para todos os tenants ou um específico.';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $tenantId = $this->option('tenant');

        $this->info("Iniciando backfill de funnel_snapshots para os últimos {$days} dias...");

        $bar = $this->output->createProgressBar($days);
        $bar->start();

        for ($i = $days; $i >= 1; $i--) {
            $date = CarbonImmutable::today()->subDays($i)->toDateString();
            DailyFunnelAggregateJob::dispatchSync($tenantId, $date);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Backfill concluído.');

        return self::SUCCESS;
    }
}
