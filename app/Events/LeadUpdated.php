<?php

namespace App\Events;

use App\Models\Lead;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

// Usando ShouldBroadcastNow para broadcast imediato sem depender da fila
class LeadUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Lead $lead;
    public string $action;

    /**
     * Create a new event instance.
     */
    public function __construct(Lead $lead, string $action = 'updated')
    {
        $this->lead = $lead;
        $this->action = $action;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("tenant.{$this->lead->tenant_id}"),
            new PrivateChannel("lead.{$this->lead->id}"), // 🔥 Para o chat modal do lead
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'lead.updated';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        $this->lead->load(['contact', 'owner', 'stage', 'channel', 'products']);
        
        return [
            'action' => $this->action,
            'lead' => $this->lead->toArray(),
        ];
    }
}

