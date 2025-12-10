<?php

namespace App\Observers;

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

