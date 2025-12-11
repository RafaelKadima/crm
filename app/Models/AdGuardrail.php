<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class AdGuardrail extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'rule_type',
        'scope',
        'conditions',
        'action',
        'priority',
        'is_active',
        'is_system',
        'trigger_count',
        'last_triggered_at',
    ];

    protected $casts = [
        'conditions' => 'array',
        'action' => 'array',
        'is_active' => 'boolean',
        'is_system' => 'boolean',
        'priority' => 'integer',
        'trigger_count' => 'integer',
        'last_triggered_at' => 'datetime',
    ];

    // Tipos de regra
    public const TYPE_BUDGET_LIMIT = 'budget_limit';
    public const TYPE_APPROVAL_REQUIRED = 'approval_required';
    public const TYPE_TIME_RESTRICTION = 'time_restriction';
    public const TYPE_OBJECTIVE_ALLOWED = 'objective_allowed';
    public const TYPE_CREATIVE_RULES = 'creative_rules';
    public const TYPE_AUDIENCE_RULES = 'audience_rules';
    public const TYPE_DAILY_SPEND_LIMIT = 'daily_spend_limit';
    public const TYPE_CPA_THRESHOLD = 'cpa_threshold';

    // Escopos de aplicação
    public const SCOPE_CAMPAIGN = 'campaign';
    public const SCOPE_ADSET = 'adset';
    public const SCOPE_AD = 'ad';
    public const SCOPE_ACCOUNT = 'account';
    public const SCOPE_ALL = 'all';

    // Tipos de ação
    public const ACTION_BLOCK = 'block';
    public const ACTION_WARN = 'warn';
    public const ACTION_REQUIRE_APPROVAL = 'require_approval';
    public const ACTION_MODIFY = 'modify';
    public const ACTION_NOTIFY = 'notify';

    /**
     * Escopo para regras ativas
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Escopo por tipo de regra
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('rule_type', $type);
    }

    /**
     * Escopo por escopo de aplicação
     */
    public function scopeForScope(Builder $query, string $scope): Builder
    {
        return $query->where(function ($q) use ($scope) {
            $q->where('scope', $scope)
              ->orWhere('scope', self::SCOPE_ALL);
        });
    }

    /**
     * Ordenado por prioridade
     */
    public function scopeByPriority(Builder $query): Builder
    {
        return $query->orderByDesc('priority');
    }

    /**
     * Incrementa contador de acionamento
     */
    public function recordTrigger(): void
    {
        $this->increment('trigger_count');
        $this->update(['last_triggered_at' => now()]);
    }

    /**
     * Verifica se a condição é satisfeita
     */
    public function checkConditions(array $data): bool
    {
        foreach ($this->conditions as $field => $condition) {
            $value = $data[$field] ?? null;
            
            if (is_array($condition)) {
                // Condição complexa como {"gt": 100}
                foreach ($condition as $operator => $threshold) {
                    if (!$this->evaluateOperator($value, $operator, $threshold)) {
                        return false;
                    }
                }
            } else {
                // Condição simples de igualdade
                if ($value !== $condition) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Avalia operador de comparação
     */
    protected function evaluateOperator($value, string $operator, $threshold): bool
    {
        return match ($operator) {
            'gt' => $value > $threshold,
            'gte' => $value >= $threshold,
            'lt' => $value < $threshold,
            'lte' => $value <= $threshold,
            'eq' => $value == $threshold,
            'neq' => $value != $threshold,
            'in' => in_array($value, (array) $threshold),
            'not_in' => !in_array($value, (array) $threshold),
            'contains' => str_contains((string) $value, (string) $threshold),
            default => false,
        };
    }

    /**
     * Retorna mensagem da ação
     */
    public function getActionMessage(): string
    {
        return $this->action['message'] ?? "Regra '{$this->name}' acionada.";
    }

    /**
     * Retorna tipo da ação
     */
    public function getActionType(): string
    {
        return $this->action['type'] ?? self::ACTION_BLOCK;
    }

    /**
     * Cria regras padrão para um tenant
     */
    public static function createDefaultRules(string $tenantId): void
    {
        $defaultRules = [
            [
                'name' => 'Limite de Orçamento Diário',
                'description' => 'Limita orçamento diário máximo de campanhas',
                'rule_type' => self::TYPE_BUDGET_LIMIT,
                'scope' => self::SCOPE_CAMPAIGN,
                'conditions' => ['daily_budget' => ['gt' => 1000]],
                'action' => [
                    'type' => self::ACTION_REQUIRE_APPROVAL,
                    'message' => 'Orçamento diário acima de R$1.000 requer aprovação.',
                ],
                'priority' => 100,
            ],
            [
                'name' => 'Aprovação para Campanhas Ativas',
                'description' => 'Requer aprovação para ativar campanhas automaticamente',
                'rule_type' => self::TYPE_APPROVAL_REQUIRED,
                'scope' => self::SCOPE_CAMPAIGN,
                'conditions' => ['status' => 'ACTIVE'],
                'action' => [
                    'type' => self::ACTION_REQUIRE_APPROVAL,
                    'message' => 'Ativação de campanhas requer aprovação do gestor.',
                ],
                'priority' => 90,
            ],
            [
                'name' => 'Limite de Gasto Diário da Conta',
                'description' => 'Limita gasto total diário da conta de anúncios',
                'rule_type' => self::TYPE_DAILY_SPEND_LIMIT,
                'scope' => self::SCOPE_ACCOUNT,
                'conditions' => ['total_daily_spend' => ['gt' => 5000]],
                'action' => [
                    'type' => self::ACTION_BLOCK,
                    'message' => 'Limite de R$5.000/dia atingido para a conta.',
                ],
                'priority' => 100,
            ],
        ];

        foreach ($defaultRules as $rule) {
            static::create(array_merge($rule, [
                'tenant_id' => $tenantId,
                'is_system' => true,
            ]));
        }
    }
}
