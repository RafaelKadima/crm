<?php

namespace App\Observers;

use App\Enums\TicketStatusEnum;
use App\Models\Ticket;
use App\Models\TenantUsageStats;
use Illuminate\Support\Facades\Log;

class TicketObserver
{
    /**
     * Handle the Ticket "created" event.
     */
    public function created(Ticket $ticket): void
    {
        TenantUsageStats::incrementTickets($ticket->tenant_id);

        Log::debug('Ticket created - usage tracked', [
            'ticket_id' => $ticket->id,
            'tenant_id' => $ticket->tenant_id,
        ]);
    }

    /**
     * Handle the Ticket "updating" event.
     *
     * Rastreia reaberturas de forma CENTRALIZADA: incrementa reopen_count e
     * marca reopened_at sempre que um ticket sai do estado "fechado". Cobre
     * todos os caminhos (WhatsApp, Instagram, fila, transferência, reopen()),
     * que reabrem via $ticket->update([...]) — base da métrica "taxa de
     * reabertura" no Relatório de Atendimento.
     */
    public function updating(Ticket $ticket): void
    {
        $statusReopen = $ticket->isDirty('status')
            && $this->statusValue($ticket->getOriginal('status')) === TicketStatusEnum::CLOSED->value
            && $this->statusValue($ticket->status) !== TicketStatusEnum::CLOSED->value;

        $closedAtReopen = $ticket->isDirty('closed_at')
            && $ticket->getOriginal('closed_at') !== null
            && $ticket->closed_at === null;

        if (($statusReopen || $closedAtReopen) && ! $ticket->isDirty('reopen_count')) {
            $ticket->reopen_count = ((int) $ticket->getOriginal('reopen_count')) + 1;
            $ticket->reopened_at = now();
        }
    }

    /**
     * Normaliza o status (enum ou string) para seu valor escalar.
     */
    private function statusValue($status): ?string
    {
        return $status instanceof TicketStatusEnum ? $status->value : $status;
    }

    /**
     * Handle the Ticket "updated" event.
     */
    public function updated(Ticket $ticket): void
    {
        // Se foi fechado, incrementa contador de tickets fechados
        if ($ticket->isDirty('status') && $ticket->status === 'closed') {
            TenantUsageStats::incrementClosedTickets($ticket->tenant_id);
        }
    }
}

