<?php

namespace App\Events;

use App\Models\GamificationTier;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTierChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public User $user,
        public ?GamificationTier $oldTier,
        public GamificationTier $newTier
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->user->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'tier.changed';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'old_tier' => $this->oldTier ? [
                'id' => $this->oldTier->id,
                'name' => $this->oldTier->name,
                'icon' => $this->oldTier->icon,
                'color' => $this->oldTier->color,
            ] : null,
            'new_tier' => [
                'id' => $this->newTier->id,
                'name' => $this->newTier->name,
                'icon' => $this->newTier->icon,
                'color' => $this->newTier->color,
            ],
            'promoted' => !$this->oldTier || $this->newTier->order > $this->oldTier->order,
        ];
    }
}
