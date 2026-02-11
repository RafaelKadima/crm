<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Scopes\TenantScope;
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
        // Bypass TenantScope porque broadcast não tem contexto de auth
        // Isso garante que o Lead seja carregado mesmo em contexto de queue/webhook
        $ticket = Ticket::withoutGlobalScope(TenantScope::class)
            ->with(['lead' => fn($q) => $q->withoutGlobalScope(TenantScope::class)])
            ->find($this->ticket->id);

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
                'id' => $ticket->id,
                'lead_id' => $ticket->lead_id,
                'contact_id' => $ticket->contact_id,
                'status' => $ticket->status,
            ],
            'lead_id' => $ticket->lead_id,
            'tenant_id' => $ticket->tenant_id,
            // Para filtrar notificações por usuário responsável
            'owner_id' => $ticket->lead?->owner_id,
            'assigned_user_id' => $ticket->assigned_user_id,
        ];
    }
}
