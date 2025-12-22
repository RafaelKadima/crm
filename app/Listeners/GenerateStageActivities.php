<?php

namespace App\Listeners;

use App\Events\LeadStageChanged;
use App\Services\GamificationService;
use App\Services\StageActivityService;

class GenerateStageActivities
{
    /**
     * Create the event listener.
     */
    public function __construct(
        protected StageActivityService $stageActivityService,
        protected GamificationService $gamificationService
    ) {}

    /**
     * Handle the event.
     */
    public function handle(LeadStageChanged $event): void
    {
        // Gera atividades para a nova etapa
        $this->stageActivityService->onLeadStageChanged($event->lead, $event->newStage);

        // Concede pontos por avançar de etapa (se tiver usuário)
        if ($event->changedBy) {
            $this->gamificationService->awardPoints(
                $event->changedBy,
                'stage_advanced',
                $event->newStage,
                "Avançou lead para: {$event->newStage->name}"
            );
        }
    }
}
