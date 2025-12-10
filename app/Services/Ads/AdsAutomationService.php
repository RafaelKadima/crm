<?php

namespace App\Services\Ads;

use App\Models\AdAd;
use App\Models\AdAdset;
use App\Models\AdAutomationLog;
use App\Models\AdAutomationRule;
use App\Models\AdCampaign;
use App\Models\AdInsight;
use App\Models\AdMetricsHistory;
use App\Models\Tenant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class AdsAutomationService
{
    protected MetaAdsService $metaAdsService;

    public function __construct(MetaAdsService $metaAdsService)
    {
        $this->metaAdsService = $metaAdsService;
    }

    /**
     * Avalia e executa regras para um tenant.
     */
    public function evaluateRules(Tenant $tenant): array
    {
        $rules = AdAutomationRule::where('tenant_id', $tenant->id)
            ->active()
            ->orderByPriority()
            ->get();

        $results = [
            'evaluated' => 0,
            'executed' => 0,
            'pending_approval' => 0,
            'failed' => 0,
        ];

        foreach ($rules as $rule) {
            if (!$rule->canExecute()) {
                continue;
            }

            $entities = $this->getEntitiesForRule($rule);

            foreach ($entities as $entity) {
                $results['evaluated']++;

                if ($this->evaluateCondition($rule, $entity)) {
                    try {
                        $log = $this->createActionLog($rule, $entity);

                        if ($rule->needsApproval()) {
                            $results['pending_approval']++;
                        } else {
                            $this->executeAction($log);
                            $results['executed']++;
                        }
                    } catch (\Exception $e) {
                        Log::error('Automation execution failed', [
                            'rule_id' => $rule->id,
                            'entity_id' => $entity->id,
                            'error' => $e->getMessage(),
                        ]);
                        $results['failed']++;
                    }
                }
            }
        }

        return $results;
    }

    /**
     * Retorna entidades afetadas pela regra.
     */
    protected function getEntitiesForRule(AdAutomationRule $rule): Collection
    {
        $query = match($rule->scope) {
            AdAutomationRule::SCOPE_AD => AdAd::where('tenant_id', $rule->tenant_id)->active(),
            AdAutomationRule::SCOPE_ADSET => AdAdset::where('tenant_id', $rule->tenant_id)->active(),
            AdAutomationRule::SCOPE_CAMPAIGN => AdCampaign::where('tenant_id', $rule->tenant_id)->active(),
            default => collect(),
        };

        // Filtra por conta se especificado
        if ($rule->ad_account_id) {
            if ($rule->scope === AdAutomationRule::SCOPE_CAMPAIGN) {
                $query->where('ad_account_id', $rule->ad_account_id);
            } elseif ($rule->scope === AdAutomationRule::SCOPE_ADSET) {
                $query->whereHas('campaign', fn($q) => $q->where('ad_account_id', $rule->ad_account_id));
            } elseif ($rule->scope === AdAutomationRule::SCOPE_AD) {
                $query->whereHas('adset.campaign', fn($q) => $q->where('ad_account_id', $rule->ad_account_id));
            }
        }

        // Filtra por entidade específica se especificado
        if ($rule->scope_id) {
            $query->where('id', $rule->scope_id);
        }

        return $query->get();
    }

    /**
     * Avalia se a condição da regra é satisfeita.
     */
    protected function evaluateCondition(AdAutomationRule $rule, $entity): bool
    {
        $metric = $rule->getConditionMetric();
        $operator = $rule->getConditionOperator();
        $targetValue = $rule->getConditionValue();
        $duration = $rule->getConditionDuration();
        $aggregation = $rule->getConditionAggregation();

        $entityType = match(get_class($entity)) {
            AdAd::class => 'ad',
            AdAdset::class => 'adset',
            AdCampaign::class => 'campaign',
            default => null,
        };

        if (!$entityType) {
            return false;
        }

        $value = $this->getMetricValue($entityType, $entity->id, $metric, $duration, $aggregation);

        return $this->compareValues($value, $operator, $targetValue);
    }

    /**
     * Obtém valor de uma métrica.
     */
    public function getMetricValue(string $entityType, string $entityId, string $metric, int $days, string $aggregation = 'avg'): float
    {
        $query = AdMetricsHistory::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('date', '>=', now()->subDays($days)->toDateString());

        return match($aggregation) {
            'avg' => $query->avg($metric) ?? 0,
            'sum' => $query->sum($metric) ?? 0,
            'min' => $query->min($metric) ?? 0,
            'max' => $query->max($metric) ?? 0,
            'last' => $query->orderBy('date', 'desc')->value($metric) ?? 0,
            default => 0,
        };
    }

    /**
     * Compara valores com operador.
     */
    protected function compareValues(float $value, string $operator, float $target): bool
    {
        return match($operator) {
            '>' => $value > $target,
            '<' => $value < $target,
            '>=' => $value >= $target,
            '<=' => $value <= $target,
            '=' => abs($value - $target) < 0.0001,
            '!=' => abs($value - $target) >= 0.0001,
            default => false,
        };
    }

    /**
     * Cria log de ação.
     */
    protected function createActionLog(AdAutomationRule $rule, $entity): AdAutomationLog
    {
        $entityType = match(get_class($entity)) {
            AdAd::class => 'ad',
            AdAdset::class => 'adset',
            AdCampaign::class => 'campaign',
            default => 'unknown',
        };

        // Captura estado anterior
        $previousState = $this->captureState($entity, $rule->getActionType());

        // Captura métricas atuais
        $metricsSnapshot = [
            'spend' => $entity->spend,
            'impressions' => $entity->impressions,
            'clicks' => $entity->clicks,
            'conversions' => $entity->conversions,
            'ctr' => $entity->ctr,
            'cpc' => $entity->cpc,
            'cpm' => $entity->cpm,
            'roas' => $entity->roas,
        ];

        return AdAutomationLog::create([
            'tenant_id' => $rule->tenant_id,
            'ad_automation_rule_id' => $rule->id,
            'entity_type' => $entityType,
            'entity_id' => $entity->id,
            'entity_name' => $entity->name,
            'action_type' => $rule->getActionType(),
            'action_params' => $rule->getActionParams(),
            'previous_state' => $previousState,
            'status' => $rule->needsApproval() 
                ? AdAutomationLog::STATUS_PENDING 
                : AdAutomationLog::STATUS_EXECUTED,
            'metrics_snapshot' => $metricsSnapshot,
            'can_rollback' => $this->canRollback($rule->getActionType()),
        ]);
    }

    /**
     * Captura estado atual para rollback.
     */
    protected function captureState($entity, string $actionType): array
    {
        return match($actionType) {
            AdAutomationRule::ACTION_PAUSE_AD, 
            AdAutomationRule::ACTION_RESUME_AD => ['status' => $entity->status],
            AdAutomationRule::ACTION_INCREASE_BUDGET,
            AdAutomationRule::ACTION_DECREASE_BUDGET => [
                'daily_budget' => $entity->daily_budget,
                'lifetime_budget' => $entity->lifetime_budget,
            ],
            default => [],
        };
    }

    /**
     * Verifica se ação pode ser revertida.
     */
    protected function canRollback(string $actionType): bool
    {
        return in_array($actionType, [
            AdAutomationRule::ACTION_PAUSE_AD,
            AdAutomationRule::ACTION_RESUME_AD,
            AdAutomationRule::ACTION_INCREASE_BUDGET,
            AdAutomationRule::ACTION_DECREASE_BUDGET,
        ]);
    }

    /**
     * Executa uma ação.
     */
    public function executeAction(AdAutomationLog $log): bool
    {
        try {
            $entity = $this->getEntity($log->entity_type, $log->entity_id);

            if (!$entity) {
                $log->markAsFailed('Entidade não encontrada');
                return false;
            }

            $newState = match($log->action_type) {
                AdAutomationRule::ACTION_PAUSE_AD => $this->executePauseAd($entity),
                AdAutomationRule::ACTION_RESUME_AD => $this->executeResumeAd($entity),
                AdAutomationRule::ACTION_INCREASE_BUDGET => $this->executeIncreaseBudget($entity, $log->action_params),
                AdAutomationRule::ACTION_DECREASE_BUDGET => $this->executeDecreaseBudget($entity, $log->action_params),
                AdAutomationRule::ACTION_DUPLICATE_ADSET => $this->executeDuplicateAdset($entity),
                AdAutomationRule::ACTION_CREATE_ALERT => $this->executeCreateAlert($entity, $log),
                default => null,
            };

            if ($newState === null) {
                $log->markAsFailed('Ação não suportada');
                return false;
            }

            $log->update([
                'new_state' => $newState,
                'status' => AdAutomationLog::STATUS_EXECUTED,
                'executed_at' => now(),
            ]);

            // Incrementa contador da regra
            $log->rule->incrementExecutionCount();

            return true;

        } catch (\Exception $e) {
            $log->markAsFailed($e->getMessage());
            return false;
        }
    }

    /**
     * Pausa um anúncio.
     */
    protected function executePauseAd(AdAd $ad): array
    {
        $this->metaAdsService->pauseAd($ad);
        return ['status' => 'PAUSED'];
    }

    /**
     * Ativa um anúncio.
     */
    protected function executeResumeAd(AdAd $ad): array
    {
        $this->metaAdsService->resumeAd($ad);
        return ['status' => 'ACTIVE'];
    }

    /**
     * Aumenta orçamento.
     */
    protected function executeIncreaseBudget($entity, array $params): array
    {
        $percent = $params['percent'] ?? 20;
        $currentBudget = $entity->getCurrentBudget();
        $newBudget = $currentBudget * (1 + ($percent / 100));

        if ($entity instanceof AdAdset) {
            $budgetType = $entity->daily_budget ? 'daily' : 'lifetime';
            $this->metaAdsService->updateBudget($entity, $newBudget, $budgetType);
        }

        return [
            'daily_budget' => $entity->daily_budget ? $newBudget : null,
            'lifetime_budget' => $entity->lifetime_budget ? $newBudget : null,
        ];
    }

    /**
     * Reduz orçamento.
     */
    protected function executeDecreaseBudget($entity, array $params): array
    {
        $percent = $params['percent'] ?? 10;
        $currentBudget = $entity->getCurrentBudget();
        $newBudget = $currentBudget * (1 - ($percent / 100));

        if ($entity instanceof AdAdset) {
            $budgetType = $entity->daily_budget ? 'daily' : 'lifetime';
            $this->metaAdsService->updateBudget($entity, $newBudget, $budgetType);
        }

        return [
            'daily_budget' => $entity->daily_budget ? $newBudget : null,
            'lifetime_budget' => $entity->lifetime_budget ? $newBudget : null,
        ];
    }

    /**
     * Duplica um adset.
     */
    protected function executeDuplicateAdset(AdAdset $adset): array
    {
        $newAdset = $this->metaAdsService->duplicateAdset($adset);

        return [
            'new_adset_id' => $newAdset?->id,
            'new_platform_id' => $newAdset?->platform_adset_id,
        ];
    }

    /**
     * Cria um alerta/insight.
     */
    protected function executeCreateAlert($entity, AdAutomationLog $log): array
    {
        $message = $log->action_params['message'] ?? 'Alerta automático';

        $entityType = match(get_class($entity)) {
            AdAd::class => 'ad',
            AdAdset::class => 'adset',
            AdCampaign::class => 'campaign',
            default => 'unknown',
        };

        AdInsight::create([
            'tenant_id' => $log->tenant_id,
            'entity_type' => $entityType,
            'entity_id' => $entity->id,
            'entity_name' => $entity->name,
            'type' => AdInsight::TYPE_SUGGESTION,
            'severity' => AdInsight::SEVERITY_INFO,
            'title' => "Alerta: {$entity->name}",
            'description' => $message,
            'data' => [
                'automation_rule_id' => $log->ad_automation_rule_id,
                'automation_log_id' => $log->id,
            ],
            'expires_at' => now()->addDays(7),
        ]);

        return ['insight_created' => true];
    }

    /**
     * Obtém entidade por tipo e ID.
     */
    protected function getEntity(string $type, string $id)
    {
        return match($type) {
            'ad' => AdAd::find($id),
            'adset' => AdAdset::find($id),
            'campaign' => AdCampaign::find($id),
            default => null,
        };
    }

    /**
     * Faz rollback de uma ação.
     */
    public function rollback(AdAutomationLog $log, string $userId): bool
    {
        if (!$log->canRollback()) {
            return false;
        }

        try {
            $entity = $this->getEntity($log->entity_type, $log->entity_id);

            if (!$entity) {
                return false;
            }

            $previousState = $log->previous_state;

            match($log->action_type) {
                AdAutomationRule::ACTION_PAUSE_AD => $this->metaAdsService->resumeAd($entity),
                AdAutomationRule::ACTION_RESUME_AD => $this->metaAdsService->pauseAd($entity),
                AdAutomationRule::ACTION_INCREASE_BUDGET,
                AdAutomationRule::ACTION_DECREASE_BUDGET => $this->rollbackBudget($entity, $previousState),
                default => null,
            };

            $log->markAsRolledBack($userId);

            return true;

        } catch (\Exception $e) {
            Log::error('Rollback failed', [
                'log_id' => $log->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Reverte alteração de orçamento.
     */
    protected function rollbackBudget($entity, array $previousState): void
    {
        if ($entity instanceof AdAdset) {
            $budget = $previousState['daily_budget'] ?? $previousState['lifetime_budget'];
            $type = isset($previousState['daily_budget']) ? 'daily' : 'lifetime';
            
            if ($budget) {
                $this->metaAdsService->updateBudget($entity, $budget, $type);
            }
        }
    }

    /**
     * Aprova uma ação pendente.
     */
    public function approveAction(AdAutomationLog $log, string $userId): bool
    {
        if (!$log->isPendingApproval()) {
            return false;
        }

        $log->approve($userId);
        return $this->executeAction($log);
    }

    /**
     * Rejeita uma ação pendente.
     */
    public function rejectAction(AdAutomationLog $log): bool
    {
        if (!$log->isPendingApproval()) {
            return false;
        }

        $log->reject();
        return true;
    }
}

