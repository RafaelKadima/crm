<?php

namespace App\Listeners;

use App\Events\LeadOwnerAssigned;
use App\Events\LeadStageChanged;
use App\Jobs\SendToExternalSystemJob;

class SyncLeadWithExternalSystems
{
    /**
     * Handle LeadStageChanged event.
     */
    public function handleStageChanged(LeadStageChanged $event): void
    {
        $this->dispatchSync($event->lead);
    }

    /**
     * Handle LeadOwnerAssigned event.
     */
    public function handleOwnerAssigned(LeadOwnerAssigned $event): void
    {
        $this->dispatchSync($event->lead);
    }

    /**
     * Dispatch sync job.
     */
    protected function dispatchSync($lead): void
    {
        // Carrega relacionamentos necessários para o mapeamento
        $lead->load(['contact', 'pipeline', 'stage', 'owner']);

        SendToExternalSystemJob::dispatch($lead, $lead->tenant_id);
    }

    /**
     * Register the listeners for the subscriber.
     */
    public function subscribe($events): array
    {
        return [
            LeadStageChanged::class => 'handleStageChanged',
            LeadOwnerAssigned::class => 'handleOwnerAssigned',
        ];
    }
}


