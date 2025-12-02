<?php

namespace App\Events;

use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadStageChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Lead $lead,
        public PipelineStage $oldStage,
        public PipelineStage $newStage,
        public ?User $changedBy = null,
        public string $source = 'user' // user, ia, system
    ) {}
}


