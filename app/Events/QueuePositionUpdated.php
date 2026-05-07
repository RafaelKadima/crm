<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class QueuePositionUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Ticket $ticket) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("ticket.{$this->ticket->id}"),
            new PrivateChannel("lead.{$this->ticket->lead_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.queue_position_updated';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticket->id,
            'queue_position' => $this->ticket->queue_position,
            'queue_position_message' => $this->ticket->queue_position_message,
        ];
    }
}
