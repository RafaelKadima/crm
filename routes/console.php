<?php

use App\Jobs\ProcessScheduledTasks;
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
