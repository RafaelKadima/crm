<?php

namespace App\Listeners;

use App\Enums\ActivitySourceEnum;
use App\Events\LeadOwnerAssigned;
use App\Events\LeadStageChanged;
use App\Events\TicketMessageCreated;
use App\Models\LeadActivity;

class RegisterLeadActivity
{
    /**
     * Handle LeadStageChanged event.
     */
    public function handleStageChanged(LeadStageChanged $event): void
    {
        LeadActivity::stageChanged(
            $event->lead,
            $event->oldStage,
            $event->newStage,
            $event->changedBy,
            ActivitySourceEnum::from($event->source)
        );
    }

    /**
     * Handle LeadOwnerAssigned event.
     */
    public function handleOwnerAssigned(LeadOwnerAssigned $event): void
    {
        LeadActivity::ownerAssigned(
            $event->lead,
            $event->oldOwner,
            $event->newOwner,
            $event->assignedBy,
            ActivitySourceEnum::from($event->source)
        );
    }

    /**
     * Handle TicketMessageCreated event.
     */
    public function handleMessageCreated(TicketMessageCreated $event): void
    {
        if ($event->ticket->lead) {
            LeadActivity::messageSent(
                $event->ticket->lead,
                $event->message,
                ActivitySourceEnum::from($event->message->sender_type->value === 'ia' ? 'ia' : 'user')
            );
        }
    }

    /**
     * Register the listeners for the subscriber.
     */
    public function subscribe($events): array
    {
        return [
            LeadStageChanged::class => 'handleStageChanged',
            LeadOwnerAssigned::class => 'handleOwnerAssigned',
            TicketMessageCreated::class => 'handleMessageCreated',
        ];
    }
}


