<?php

namespace App\Services;

use App\Events\TicketPaused;
use App\Events\TicketResumed;
use App\Models\Ticket;
use App\Models\TicketPauseLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Encapsula lógica de pause/resume — atualiza ticket, registra log,
 * dispara evento Reverb pra UI atualizar em tempo real.
 *
 * Idempotente: pausar um ticket já pausado não duplica log.
 */
class TicketPauseService
{
    public function pause(Ticket $ticket, User $actor, string $reason): Ticket
    {
        if ($ticket->isPaused()) {
            return $ticket;
        }

        $reason = trim($reason);
        if ($reason === '') {
            throw new \InvalidArgumentException('Motivo da pausa é obrigatório.');
        }

        return DB::transaction(function () use ($ticket, $actor, $reason) {
            $ticket->forceFill([
                'paused_at' => now(),
                'pause_reason' => $reason,
                'paused_by' => $actor->id,
            ])->save();

            TicketPauseLog::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'user_id' => $actor->id,
                'action' => 'paused',
                'reason' => $reason,
            ]);

            broadcast(new TicketPaused($ticket->fresh()))->toOthers();

            return $ticket->fresh();
        });
    }

    public function resume(Ticket $ticket, User $actor): Ticket
    {
        if (!$ticket->isPaused()) {
            return $ticket;
        }

        return DB::transaction(function () use ($ticket, $actor) {
            $ticket->forceFill([
                'paused_at' => null,
                'pause_reason' => null,
                'paused_by' => null,
            ])->save();

            TicketPauseLog::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'user_id' => $actor->id,
                'action' => 'resumed',
                'reason' => null,
            ]);

            broadcast(new TicketResumed($ticket->fresh()))->toOthers();

            return $ticket->fresh();
        });
    }
}
