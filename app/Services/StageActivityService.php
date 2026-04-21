<?php

namespace App\Services;

use App\Events\DealActivityCompleted;
use App\Models\DealStageActivity;
use App\Models\Lead;
use App\Models\PipelineStage;
use App\Models\StageActivityTemplate;
use App\Models\User;
use Illuminate\Support\Collection;

class StageActivityService
{
    public function __construct(
        protected GamificationService $gamificationService
    ) {}

    /**
     * Quando lead muda de etapa, gera atividades configuradas.
     */
    public function onLeadStageChanged(Lead $lead, PipelineStage $newStage): Collection
    {
        $templates = StageActivityTemplate::forStage($newStage->id)->get();
        $activities = collect();

        foreach ($templates as $template) {
            $activity = $template->generateForLead($lead);
            $activities->push($activity);
        }

        return $activities;
    }

    /**
     * Verifica se o lead pode avançar de etapa.
     * Retorna info sobre atividades obrigatórias pendentes.
     */
    public function canAdvanceStage(Lead $lead): array
    {
        $pendingRequired = DealStageActivity::forLeadStage($lead->id, $lead->stage_id)
            ->requiredPending()
            ->count();

        return [
            'can_advance' => $pendingRequired === 0,
            'pending_required_count' => $pendingRequired,
            'pending_required' => $pendingRequired > 0
                ? DealStageActivity::forLeadStage($lead->id, $lead->stage_id)
                    ->requiredPending()
                    ->with('template')
                    ->get()
                : collect(),
        ];
    }

    /**
     * Retorna o progresso das atividades da etapa atual.
     */
    public function getStageProgress(Lead $lead): array
    {
        $activities = DealStageActivity::forLeadStage($lead->id, $lead->stage_id)
            ->with('template')
            ->get();

        return $this->buildProgressFromActivities($activities);
    }

    /**
     * Retorna progresso de múltiplos leads em uma única query.
     *
     * Usado pelo kanban para evitar N+1 (1 request por card) que estourava
     * o rate limiter. Retorna mapa ['lead_id' => progress_array].
     *
     * Leads sem atividades (ou que não existem) voltam como progresso vazio
     * (total=0) para o frontend tratar igual à versão single.
     */
    public function getBatchStageProgress(array $leadIds): array
    {
        if (empty($leadIds)) {
            return [];
        }

        // Busca stage_id atual de cada lead em uma query
        $leads = Lead::whereIn('id', $leadIds)
            ->get(['id', 'stage_id'])
            ->keyBy('id');

        if ($leads->isEmpty()) {
            return [];
        }

        // Busca todas as activities da STAGE ATUAL de cada lead em uma query
        // (pair-matching via whereIn tuplas compatível com Postgres)
        $pairs = $leads->map(fn ($l) => [$l->id, $l->stage_id])
            ->filter(fn ($p) => $p[1] !== null)
            ->values()
            ->all();

        $activitiesByLead = collect();
        if (!empty($pairs)) {
            $activitiesByLead = DealStageActivity::where(function ($q) use ($pairs) {
                foreach ($pairs as [$leadId, $stageId]) {
                    $q->orWhere(function ($sub) use ($leadId, $stageId) {
                        $sub->where('lead_id', $leadId)->where('stage_id', $stageId);
                    });
                }
            })->with('template')->get()->groupBy('lead_id');
        }

        $result = [];
        foreach ($leadIds as $id) {
            $activities = $activitiesByLead->get($id, collect());
            $result[$id] = $this->buildProgressFromActivities($activities);
        }

        return $result;
    }

    /**
     * Monta o payload de progresso a partir de uma coleção de activities.
     * Compartilhado entre getStageProgress (single) e getBatchStageProgress (batch).
     */
    private function buildProgressFromActivities($activities): array
    {
        $total = $activities->count();
        $completed = $activities->where('status', 'completed')->count();
        $pending = $activities->where('status', 'pending')->count();
        $skipped = $activities->where('status', 'skipped')->count();

        $requiredTotal = $activities->filter(fn ($a) => $a->isRequired())->count();
        $requiredCompleted = $activities->filter(fn ($a) => $a->isRequired() && $a->isCompleted())->count();
        $requiredPending = $requiredTotal - $requiredCompleted;

        $percentage = $total > 0 ? round(($completed / $total) * 100) : 0;

        return [
            'total' => $total,
            'completed' => $completed,
            'pending' => $pending,
            'skipped' => $skipped,
            'required_total' => $requiredTotal,
            'required_completed' => $requiredCompleted,
            'required_pending' => $requiredPending,
            'percentage' => $percentage,
            'can_advance' => $requiredPending === 0,
        ];
    }

    /**
     * Completa uma atividade.
     */
    public function completeActivity(DealStageActivity $activity, User $user): DealStageActivity
    {
        $activity->markCompleted($user);

        // Carrega o lead para usar no evento
        $activity->load('lead', 'template');

        // Dispara evento para gamificação
        event(new DealActivityCompleted($activity, $user, $activity->points_earned));

        // Registra pontos se configurado
        if ($activity->points_earned > 0) {
            $this->gamificationService->awardPoints(
                $user,
                'activity_completed',
                $activity,
                "Completou: {$activity->template->title}"
            );
        }

        return $activity->fresh();
    }

    /**
     * Pula uma atividade (só se não for obrigatória).
     */
    public function skipActivity(DealStageActivity $activity): DealStageActivity
    {
        if ($activity->isRequired()) {
            throw new \Exception('Não é possível pular uma atividade obrigatória.');
        }

        $activity->markSkipped();

        return $activity->fresh();
    }

    /**
     * Retorna as atividades de um lead para a etapa atual.
     */
    public function getActivitiesForCurrentStage(Lead $lead): Collection
    {
        return DealStageActivity::forLeadStage($lead->id, $lead->stage_id)
            ->with(['template', 'completedByUser'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Retorna todas as atividades de um lead (todas as etapas).
     */
    public function getAllActivitiesForLead(Lead $lead): Collection
    {
        return DealStageActivity::where('lead_id', $lead->id)
            ->with(['template', 'stage', 'completedByUser'])
            ->orderBy('created_at')
            ->get();
    }

    /**
     * Reordena os templates de atividade de um estágio.
     */
    public function reorderTemplates(PipelineStage $stage, array $orderedIds): void
    {
        foreach ($orderedIds as $index => $templateId) {
            StageActivityTemplate::where('id', $templateId)
                ->where('stage_id', $stage->id)
                ->update(['order' => $index]);
        }
    }
}
