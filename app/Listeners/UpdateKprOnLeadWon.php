<?php

namespace App\Listeners;

use App\Events\LeadStageChanged;
use App\Models\Kpr;
use App\Models\KprAssignment;
use App\Models\PipelineStage;
use App\Models\User;
use App\Services\KprService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class UpdateKprOnLeadWon implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(
        protected KprService $kprService
    ) {}

    /**
     * Handle the event.
     *
     * Quando um lead é movido para um estágio "won", atualiza os KPRs
     * do vendedor responsável e da equipe.
     */
    public function handle(LeadStageChanged $event): void
    {
        $lead = $event->lead;
        $newStage = $event->newStage;

        // Verifica se o novo estágio é do tipo "won"
        if (!$newStage->isWon()) {
            return;
        }

        // Verifica se o estágio anterior já era "won" (para não contar duplicado)
        if ($event->oldStage && $event->oldStage->isWon()) {
            return;
        }

        $ownerId = $lead->owner_id;
        $tenantId = $lead->tenant_id;
        $value = $lead->value ?? 0;
        $pipelineId = $lead->pipeline_id;

        if (!$ownerId) {
            Log::warning('Lead won without owner', ['lead_id' => $lead->id]);
            return;
        }

        Log::info('Updating KPRs for won lead', [
            'lead_id' => $lead->id,
            'owner_id' => $ownerId,
            'value' => $value,
            'pipeline_id' => $pipelineId,
        ]);

        // Busca todas as KPRs ativas que se aplicam a este lead
        $activeKprs = Kpr::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where('period_start', '<=', now())
            ->where('period_end', '>=', now())
            ->where(function ($query) use ($pipelineId) {
                // KPRs sem pipeline específico ou com o pipeline do lead
                $query->whereNull('pipeline_id')
                      ->orWhere('pipeline_id', $pipelineId);
            })
            ->get();

        foreach ($activeKprs as $kpr) {
            $this->updateKprProgress($kpr, $ownerId, $value);
        }
    }

    /**
     * Atualiza o progresso de uma KPR específica.
     */
    protected function updateKprProgress(Kpr $kpr, string $ownerId, float $value): void
    {
        // Busca o assignment do usuário para esta KPR
        $userAssignment = KprAssignment::where('kpr_id', $kpr->id)
            ->where('assignable_type', User::class)
            ->where('assignable_id', $ownerId)
            ->first();

        if (!$userAssignment) {
            Log::debug('No KPR assignment found for user', [
                'kpr_id' => $kpr->id,
                'user_id' => $ownerId,
            ]);
            return;
        }

        // Determina o incremento baseado no tipo da KPR
        $increment = match ($kpr->type) {
            'revenue' => $value,           // Soma o valor do lead
            'deals' => 1,                  // Conta 1 deal
            'activities' => 0,             // Atividades são contadas separadamente
            'custom' => $value,            // Custom usa o valor
            default => 0,
        };

        if ($increment <= 0) {
            return;
        }

        // Atualiza o assignment do usuário
        $userAssignment->increment('current_value', $increment);
        $userAssignment->progress_percentage = min(100, ($userAssignment->current_value / $userAssignment->target_value) * 100);
        $userAssignment->save();

        Log::info('Updated user KPR assignment', [
            'assignment_id' => $userAssignment->id,
            'kpr_id' => $kpr->id,
            'user_id' => $ownerId,
            'increment' => $increment,
            'new_value' => $userAssignment->current_value,
            'progress' => $userAssignment->progress_percentage,
        ]);

        // Propaga para o assignment pai (equipe)
        if ($userAssignment->parent_assignment_id) {
            $this->updateParentAssignment($userAssignment->parent_assignment_id, $increment);
        }
    }

    /**
     * Propaga o incremento para os assignments pais (equipe → empresa).
     */
    protected function updateParentAssignment(string $parentId, float $increment): void
    {
        $parent = KprAssignment::find($parentId);

        if (!$parent) {
            return;
        }

        // Recalcula o valor atual somando todos os filhos
        $childrenSum = KprAssignment::where('parent_assignment_id', $parent->id)
            ->sum('current_value');

        $parent->current_value = $childrenSum;
        $parent->progress_percentage = min(100, ($parent->current_value / $parent->target_value) * 100);
        $parent->save();

        Log::info('Updated parent KPR assignment', [
            'assignment_id' => $parent->id,
            'new_value' => $parent->current_value,
            'progress' => $parent->progress_percentage,
        ]);

        // Continua propagando para cima se houver mais pais
        if ($parent->parent_assignment_id) {
            $this->updateParentAssignment($parent->parent_assignment_id, $increment);
        }
    }
}
