<?php

namespace App\Jobs;

use App\Enums\TicketStatusEnum;
use App\Events\QueuePositionUpdated;
use App\Models\Queue;
use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Recalcula queue_position e queue_position_message dos tickets pending
 * em cada fila + atualiza avg_response_time_minutes da fila.
 *
 * Roda a cada 60s pelo scheduler. Idempotente — só atualiza linhas
 * quando o valor calculado difere do persistido (reduz writes + Reverb).
 *
 * Estratégia:
 *   1. Pra cada fila ativa do tenant, pegar tickets PENDING ordenados
 *      por queue_entered_at ASC (FIFO).
 *   2. Atribuir position 1, 2, 3...
 *   3. Atualizar avg_response_time da fila com base nos últimos 50
 *      tickets fechados (closed_at - queue_entered_at).
 *   4. Disparar event QueuePositionUpdated por ticket que mudou
 *      (cliente vê em real-time via Reverb).
 */
class RecalculateQueuePositionsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;
    public int $tries = 1;

    public function handle(): void
    {
        Queue::query()
            ->where('is_active', true)
            ->chunkById(50, function ($queues) {
                foreach ($queues as $queue) {
                    try {
                        $this->processQueue($queue);
                    } catch (\Throwable $e) {
                        Log::error('RecalculateQueuePositionsJob: queue failed', [
                            'queue_id' => $queue->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
    }

    protected function processQueue(Queue $queue): void
    {
        // 1. Atualiza avg_response_time — média dos últimos 50 tickets fechados.
        // Subquery: pega os 50 mais recentes; outer SELECT calcula a média.
        // (Não dá pra usar Eloquent ->avg() diretamente porque ele ignora o
        // SELECT do query builder e gera um novo SELECT AVG(coluna).)
        $sub = Ticket::query()
            ->where('tenant_id', $queue->tenant_id)
            ->where('channel_id', $queue->channel_id)
            ->where('status', TicketStatusEnum::CLOSED)
            ->whereNotNull('closed_at')
            ->whereNotNull('queue_entered_at')
            ->orderByDesc('closed_at')
            ->limit(50)
            ->selectRaw('EXTRACT(EPOCH FROM (closed_at - queue_entered_at)) / 60 AS minutes');

        $avgMinutes = (int) round(
            (float) (DB::query()->fromSub($sub, 't')->avg('t.minutes') ?? 0)
        );

        if ($queue->avg_response_time_minutes !== $avgMinutes) {
            $queue->update(['avg_response_time_minutes' => $avgMinutes]);
        }

        // 2. Recalcula posições dos tickets PENDING
        $pending = Ticket::query()
            ->where('tenant_id', $queue->tenant_id)
            ->where('channel_id', $queue->channel_id)
            ->where('status', TicketStatusEnum::PENDING)
            ->whereNull('paused_at')
            ->orderBy('queue_entered_at', 'asc')
            ->orderBy('created_at', 'asc') // tiebreaker
            ->get(['id', 'queue_position', 'queue_position_message', 'tenant_id', 'lead_id']);

        $position = 1;
        foreach ($pending as $ticket) {
            $estimatedMinutes = $avgMinutes * $position;
            $message = $this->buildMessage($position, $estimatedMinutes);

            if ($ticket->queue_position === $position && $ticket->queue_position_message === $message) {
                $position++;
                continue;
            }

            $ticket->forceFill([
                'queue_position' => $position,
                'queue_position_message' => $message,
            ])->save();

            broadcast(new QueuePositionUpdated($ticket))->toOthers();

            $position++;
        }
    }

    protected function buildMessage(int $position, int $estimatedMinutes): string
    {
        $ordinal = match ($position) {
            1 => '1º',
            2 => '2º',
            3 => '3º',
            default => "{$position}º",
        };

        if ($estimatedMinutes <= 0) {
            return "Você é o {$ordinal} na fila.";
        }

        if ($estimatedMinutes < 60) {
            return "Você é o {$ordinal} na fila — ~{$estimatedMinutes}min de espera.";
        }

        $hours = (int) floor($estimatedMinutes / 60);
        $rem = $estimatedMinutes % 60;
        $time = $rem > 0 ? "{$hours}h{$rem}min" : "{$hours}h";

        return "Você é o {$ordinal} na fila — ~{$time} de espera.";
    }
}
