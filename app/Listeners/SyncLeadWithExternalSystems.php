<?php

namespace App\Listeners;

use App\Events\LeadCreated;
use App\Events\LeadOwnerAssigned;
use App\Events\LeadStageChanged;
use App\Jobs\SendToExternalSystemJob;

class SyncLeadWithExternalSystems
{
    /**
     * Handle LeadCreated event.
     */
    public function handleLeadCreated(LeadCreated $event): void
    {
        $this->dispatchSync($event->lead, 'lead_created');
    }

    /**
     * Handle LeadStageChanged event.
     */
    public function handleStageChanged(LeadStageChanged $event): void
    {
        $this->dispatchSync($event->lead, 'lead_stage_changed', $event->newStage->id);
    }

    /**
     * Handle LeadOwnerAssigned event.
     */
    public function handleOwnerAssigned(LeadOwnerAssigned $event): void
    {
        $this->dispatchSync($event->lead, 'lead_owner_assigned');
    }

    /**
     * Dispatch sync job.
     *
     * @param mixed $lead O lead a ser sincronizado
     * @param string $triggerEvent O evento que disparou
     * @param string|null $stageId O ID do estagio (para lead_stage_changed)
     */
    protected function dispatchSync($lead, string $triggerEvent, ?string $stageId = null): void
    {
        // Carrega relacionamentos necessarios para o mapeamento
        $lead->load(['contact', 'pipeline', 'stage', 'owner', 'channel', 'tenant']);

        SendToExternalSystemJob::dispatch($lead, $lead->tenant_id, $triggerEvent, $stageId);
    }

    /**
     * Register the listeners for the subscriber.
     */
    public function subscribe($events): array
    {
        return [
            LeadCreated::class => 'handleLeadCreated',
            LeadStageChanged::class => 'handleStageChanged',
            LeadOwnerAssigned::class => 'handleOwnerAssigned',
        ];
    }
}


