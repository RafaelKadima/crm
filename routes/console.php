<?php

use App\Jobs\ProcessScheduledTasks;
use App\Jobs\Ads\SyncAdMetricsJob;
use App\Jobs\Ads\ProcessAdsAutomationJob;
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
