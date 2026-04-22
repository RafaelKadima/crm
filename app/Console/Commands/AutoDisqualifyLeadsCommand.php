<?php

namespace App\Console\Commands;

use App\Enums\LeadStatusEnum;
use App\Models\Lead;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Desqualifica automaticamente leads abertos parados há mais de N dias.
 *
 * Critério mais conservador que tickets: lead "parado" = sem mensagem E sem
 * update há >90 dias. Preferência por last_message_at (atividade real), fallback
 * para updated_at.
 *
 * Sub-fase 3b: dry-run default. Proteção dupla via tenants.auto_close_stale_enabled.
 */
class AutoDisqualifyLeadsCommand extends Command
{
    protected $signature = 'leads:auto-disqualify
                            {--dry-run : Só loga, não altera}
                            {--threshold=90 : Dias de inatividade}
                            {--tenant= : Limita a um tenant específico (UUID)}';

    protected $description = 'Desqualifica leads abertos há mais de N dias sem atividade (sub-fase 3b: default dry-run).';

    public function handle(): int
    {
        $threshold = (int) $this->option('threshold');
        $dryRun = $this->option('dry-run');
        $tenantId = $this->option('tenant');

        $cutoff = now()->subDays($threshold);

        $query = Lead::where('status', LeadStatusEnum::OPEN)
            ->whereRaw('COALESCE(last_message_at, updated_at) < ?', [$cutoff]);

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $candidates = $query->get(['id', 'tenant_id', 'contact_id', 'last_message_at', 'updated_at']);
        $total = $candidates->count();

        $this->info(sprintf(
            '[%s] %d leads abertos sem atividade há >%d dias%s.',
            $dryRun ? 'DRY-RUN' : 'APLICAR',
            $total,
            $threshold,
            $tenantId ? " no tenant {$tenantId}" : ''
        ));

        if ($total === 0) {
            return self::SUCCESS;
        }

        $byTenant = $candidates->groupBy('tenant_id');
        $this->newLine();
        $this->table(
            ['Tenant ID', 'Leads afetados'],
            $byTenant->map(fn ($g, $tid) => [substr($tid, 0, 8) . '...', $g->count()])->values()->all()
        );

        $logFile = storage_path('logs/auto-disqualify-leads.log');
        $logEntry = sprintf(
            "[%s] mode=%s threshold=%dd total=%d by_tenant=%s\n",
            now()->toIso8601String(),
            $dryRun ? 'dry-run' : 'apply',
            $threshold,
            $total,
            json_encode($byTenant->map->count()->toArray())
        );
        file_put_contents($logFile, $logEntry, FILE_APPEND);

        if ($dryRun) {
            $this->warn('Dry-run: nenhum lead foi desqualificado.');
            return self::SUCCESS;
        }

        $optedInTenants = DB::table('tenants')
            ->where('auto_close_stale_enabled', true)
            ->pluck('id')
            ->toArray();

        $toDisqualify = $candidates->filter(fn ($l) => in_array($l->tenant_id, $optedInTenants));
        $skipped = $total - $toDisqualify->count();

        if ($skipped > 0) {
            $this->warn(sprintf(
                '%d leads pulados — tenants sem auto_close_stale_enabled=true.',
                $skipped
            ));
        }

        if ($toDisqualify->isEmpty()) {
            $this->info('Nada a desqualificar.');
            return self::SUCCESS;
        }

        $ids = $toDisqualify->pluck('id');
        $affected = Lead::whereIn('id', $ids)->update([
            'status' => LeadStatusEnum::DISQUALIFIED,
        ]);

        Log::channel('single')->info('Auto-disqualify leads executed', [
            'threshold_days' => $threshold,
            'disqualified' => $affected,
            'tenant_filter' => $tenantId,
        ]);
        file_put_contents($logFile, sprintf(
            "[%s] DISQUALIFIED %d leads (opted-in tenants)\n",
            now()->toIso8601String(),
            $affected
        ), FILE_APPEND);

        $this->info("✓ {$affected} leads desqualificados.");
        return self::SUCCESS;
    }
}
