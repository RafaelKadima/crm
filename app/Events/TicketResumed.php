<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketResumed implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Ticket $ticket) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("ticket.{$this->ticket->id}"),
            new PrivateChannel("lead.{$this->ticket->lead_id}"),
            new PrivateChannel("tenant.{$this->ticket->tenant_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.resumed';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket' => [
                'id' => $this->ticket->id,
                'lead_id' => $this->ticket->lead_id,
                'resumed_at' => now()->toIso8601String(),
            ],
            'tenant_id' => $this->ticket->tenant_id,
        ];
    }
}
