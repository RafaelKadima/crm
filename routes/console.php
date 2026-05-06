<?php

use App\Jobs\CalculateKpisJob;
use App\Jobs\CheckStepReplyTimeoutsJob;
use App\Jobs\DailyFunnelAggregateJob;
use App\Jobs\ProcessScheduledTasks;
use App\Jobs\RecalculateQueuePositionsJob;
use App\Jobs\Ads\SyncAdMetricsJob;
use App\Jobs\Ads\ProcessAdsAutomationJob;
use App\Modules\Meta\Jobs\RefreshMetaTokenJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// =============================================================================
// SCHEDULED TASKS
// =============================================================================

// Processa tarefas agendadas (lembretes, follow-ups) a cada 5 minutos
Schedule::job(new ProcessScheduledTasks)->everyFiveMinutes()->withoutOverlapping();

// Recalcula posições visíveis na fila + avg_response_time (1min)
Schedule::job(new RecalculateQueuePositionsJob)->everyMinute()->withoutOverlapping(2);

// Verifica timeouts de StepReply executions (wait_input/branch)
Schedule::job(new CheckStepReplyTimeoutsJob)->everyMinute()->withoutOverlapping(2);

// Limpa tokens expirados diariamente
Schedule::command('sanctum:prune-expired --hours=24')->daily();

// Limpa jobs falhados antigos semanalmente
Schedule::command('queue:prune-failed --hours=168')->weekly();

// =============================================================================
// ADS INTELLIGENCE - SCHEDULED JOBS
// =============================================================================

// Sincroniza métricas de Ads diariamente às 6h (coleta dados do dia anterior)
Schedule::job(new SyncAdMetricsJob)->dailyAt('06:00')->withoutOverlapping();

// Processa regras de automação a cada hora
Schedule::job(new ProcessAdsAutomationJob)->hourly()->withoutOverlapping();

// Sincronização adicional às 12h e 18h para dados mais atualizados
Schedule::job(new SyncAdMetricsJob(null, now()->toDateString()))->dailyAt('12:00')->withoutOverlapping();
Schedule::job(new SyncAdMetricsJob(null, now()->toDateString()))->dailyAt('18:00')->withoutOverlapping();

// =============================================================================
// KPR / KPI - SCHEDULED JOBS
// =============================================================================

// Calcula KPIs e cria snapshots de KPRs diariamente às 1h da manhã
Schedule::job(new CalculateKpisJob)->dailyAt('01:00')->withoutOverlapping();

// Recalcula KPIs no início de cada mês (para consolidar mês anterior)
Schedule::job(new CalculateKpisJob(
    tenantId: null,
    period: now()->subMonth()->format('Y-m'),
    periodType: 'month'
))->monthlyOn(1, '02:00')->withoutOverlapping();

// =============================================================================
// META INTEGRATION - SCHEDULED JOBS
// =============================================================================

// Renova tokens Meta que estão próximos de expirar (menos de 7 dias)
Schedule::job(new RefreshMetaTokenJob)->dailyAt('03:00')->withoutOverlapping();

// =============================================================================
// SUITE GERENCIAL DE FUNIL
// =============================================================================

// Agrega snapshots de funil do dia anterior às 03:30 (depois de Meta refresh)
Schedule::job(new DailyFunnelAggregateJob())->dailyAt('03:30')->withoutOverlapping();

// =============================================================================
// AUTO-FECHAMENTO (sub-fase 3b: SEMPRE dry-run por agora)
// =============================================================================
// Roda diariamente em dry-run para popular storage/logs/auto-close-*.log com o
// que SERIA fechado. Nenhum dado é modificado. Ao avaliar os logs por alguns dias
// e decidir ativar de verdade, promover para --no-dry-run (sub-fase 3c) — e os
// tenants precisam ter auto_close_stale_enabled=true (opt-in explícito).
Schedule::command('tickets:auto-close --dry-run')->dailyAt('04:00')->withoutOverlapping();
Schedule::command('leads:auto-disqualify --dry-run')->dailyAt('04:15')->withoutOverlapping();
