<?php

namespace App\Console\Commands;

use App\Enums\TicketStatusEnum;
use App\Models\Ticket;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Auto-fecha tickets abertos parados há mais de N dias sem atualização.
 *
 * Sub-fase 3b do plano de adoção: roda em --dry-run por padrão.
 * Sem flag tenants.auto_close_stale_enabled=true (sub-fase 3c), NÃO fecha
 * de verdade mesmo sem --dry-run — é proteção dupla contra ativação acidental.
 *
 * Logs em storage/logs/auto-close-tickets.log via channel dedicado.
 */
class AutoCloseTicketsCommand extends Command
{
    protected $signature = 'tickets:auto-close
                            {--dry-run : Só loga, não fecha nada}
                            {--threshold=30 : Dias de inatividade para considerar stale}
                            {--tenant= : Limita a um tenant específico (UUID)}';

    protected $description = 'Auto-fecha tickets abertos há mais de N dias sem atualização (sub-fase 3b: default dry-run).';

    public function handle(): int
    {
        $threshold = (int) $this->option('threshold');
        $dryRun = $this->option('dry-run');
        $tenantId = $this->option('tenant');

        $query = Ticket::where('status', TicketStatusEnum::OPEN)
            ->where('updated_at', '<', now()->subDays($threshold));

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $candidates = $query->get(['id', 'tenant_id', 'contact_id', 'updated_at']);

        $total = $candidates->count();
        $this->info(sprintf(
            '[%s] %d tickets abertos há >%d dias%s.',
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
            ['Tenant ID', 'Tickets afetados'],
            $byTenant->map(fn ($g, $tid) => [substr($tid, 0, 8) . '...', $g->count()])->values()->all()
        );

        // Log detalhado em arquivo dedicado (sempre, mesmo em dry-run)
        $logFile = storage_path('logs/auto-close-tickets.log');
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
            $this->warn('Dry-run: nenhum ticket foi fechado.');
            return self::SUCCESS;
        }

        // Proteção: sem opt-in explícito do tenant (sub-fase 3c), não fecha.
        // Tenants sem auto_close_stale_enabled=true são SEMPRE tratados como dry-run,
        // mesmo se o command foi chamado sem --dry-run.
        $optedInTenants = DB::table('tenants')
            ->where('auto_close_stale_enabled', true)
            ->pluck('id')
            ->toArray();

        $toClose = $candidates->filter(fn ($t) => in_array($t->tenant_id, $optedInTenants));
        $skipped = $total - $toClose->count();

        if ($skipped > 0) {
            $this->warn(sprintf(
                '%d tickets pulados — tenants sem auto_close_stale_enabled=true (sub-fase 3c).',
                $skipped
            ));
        }

        if ($toClose->isEmpty()) {
            $this->info('Nada a fechar.');
            return self::SUCCESS;
        }

        $ids = $toClose->pluck('id');
        $affected = Ticket::whereIn('id', $ids)->update([
            'status' => TicketStatusEnum::CLOSED,
            'closed_at' => now(),
        ]);

        Log::channel('single')->info('Auto-close tickets executed', [
            'threshold_days' => $threshold,
            'closed' => $affected,
            'tenant_filter' => $tenantId,
        ]);
        file_put_contents($logFile, sprintf(
            "[%s] CLOSED %d tickets (opted-in tenants)\n",
            now()->toIso8601String(),
            $affected
        ), FILE_APPEND);

        $this->info("✓ {$affected} tickets fechados.");
        return self::SUCCESS;
    }
}
