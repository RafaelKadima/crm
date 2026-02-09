<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Evento disparado quando um ticket fechado é reaberto
 * (por exemplo, quando um cliente envia mensagem em conversa encerrada)
 */
class TicketReopened implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
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
        return 'ticket.reopened';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'ticket' => [
                'id' => $this->ticket->id,
                'lead_id' => $this->ticket->lead_id,
                'contact_id' => $this->ticket->contact_id,
                'status' => $this->ticket->status,
                'reopened_at' => now()->toIso8601String(),
            ],
            'lead_id' => $this->ticket->lead_id,
            'tenant_id' => $this->ticket->tenant_id,
        ];
    }
}
