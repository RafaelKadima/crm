<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

// Usando ShouldBroadcastNow para broadcast imediato sem depender da fila
class TicketMessageCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public TicketMessage $message,
        public Ticket $ticket
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            // Canal privado para o ticket específico
            new PrivateChannel("ticket.{$this->ticket->id}"),
            // Canal privado para o lead (para atualizar o Kanban)
            new PrivateChannel("lead.{$this->ticket->lead_id}"),
            // Canal privado para o tenant (notificações gerais)
            new PrivateChannel("tenant.{$this->ticket->tenant_id}"),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'message.created';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'ticket_id' => $this->message->ticket_id,
                'sender_type' => $this->message->sender_type,
                'sender_id' => $this->message->sender_id,
                'direction' => $this->message->direction,
                'content' => $this->message->message,
                'metadata' => $this->message->metadata, // Include media metadata
                'sent_at' => $this->message->sent_at?->toIso8601String(),
                'created_at' => $this->message->created_at?->toIso8601String(),
            ],
            'ticket' => [
                'id' => $this->ticket->id,
                'lead_id' => $this->ticket->lead_id,
                'contact_id' => $this->ticket->contact_id,
                'status' => $this->ticket->status,
            ],
            'lead_id' => $this->ticket->lead_id,
            'tenant_id' => $this->ticket->tenant_id,
        ];
    }
}
