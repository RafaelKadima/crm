<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Disparado quando o status de um ticket muda fora do fluxo de reabertura.
 * Hoje é usado pela transição `pending` → `open` (primeiro atendente abriu),
 * mas serve como evento genérico de mudança de status para o frontend
 * sincronizar a inbox em tempo real.
 */
class TicketStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Ticket $ticket,
        public string $previousStatus,
    ) {}

    /**
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
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
        return 'ticket.status_changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'ticket' => [
                'id' => $this->ticket->id,
                'lead_id' => $this->ticket->lead_id,
                'contact_id' => $this->ticket->contact_id,
                'assigned_user_id' => $this->ticket->assigned_user_id,
                'status' => $this->ticket->status,
                'first_viewed_at' => $this->ticket->first_viewed_at?->toIso8601String(),
                'first_viewer_id' => $this->ticket->first_viewer_id,
            ],
            'previous_status' => $this->previousStatus,
            'lead_id' => $this->ticket->lead_id,
            'tenant_id' => $this->ticket->tenant_id,
        ];
    }
}
