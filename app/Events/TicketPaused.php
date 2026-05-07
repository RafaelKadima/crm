<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketPaused implements ShouldBroadcastNow
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
        return 'ticket.paused';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket' => [
                'id' => $this->ticket->id,
                'lead_id' => $this->ticket->lead_id,
                'paused_at' => $this->ticket->paused_at?->toIso8601String(),
                'pause_reason' => $this->ticket->pause_reason,
                'paused_by' => $this->ticket->paused_by,
            ],
            'tenant_id' => $this->ticket->tenant_id,
        ];
    }
}
