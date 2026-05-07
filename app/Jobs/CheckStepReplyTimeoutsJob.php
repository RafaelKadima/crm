<?php

namespace App\Jobs;

use App\Services\StepReplyEngine;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Roda no scheduler a cada 1min e marca como `timed_out` execuções
 * que estão paradas em wait_input/branch além do timeout configurado.
 *
 * Idempotente — chamar múltiplas vezes sem rodar duas vezes a mesma
 * lógica (StepReplyEngine::timeoutCheck filtra por status=running).
 */
class CheckStepReplyTimeoutsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60;
    public int $tries = 1;

    public function handle(StepReplyEngine $engine): void
    {
        $count = $engine->timeoutCheck();
        if ($count > 0) {
            Log::info('[StepReply] Executions timed out', ['count' => $count]);
        }
    }
}
