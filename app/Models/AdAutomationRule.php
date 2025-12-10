<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdAutomationRule extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ad_account_id',
        'name',
        'description',
        'scope',
        'scope_id',
        'condition',
        'action',
        'frequency',
        'cooldown_hours',
        'max_executions_per_day',
        'is_active',
        'requires_approval',
        'priority',
        'last_executed_at',
        'execution_count',
    ];

    protected $casts = [
        'condition' => 'array',
        'action' => 'array',
        'is_active' => 'boolean',
        'requires_approval' => 'boolean',
        'last_executed_at' => 'datetime',
    ];

    /**
     * Escopos disponíveis.
     */
    public const SCOPE_ACCOUNT = 'account';
    public const SCOPE_CAMPAIGN = 'campaign';
    public const SCOPE_ADSET = 'adset';
    public const SCOPE_AD = 'ad';

    /**
     * Frequências disponíveis.
     */
    public const FREQ_HOURLY = 'hourly';
    public const FREQ_DAILY = 'daily';
    public const FREQ_WEEKLY = 'weekly';

    /**
     * Tipos de ação.
     */
    public const ACTION_PAUSE_AD = 'pause_ad';
    public const ACTION_RESUME_AD = 'resume_ad';
    public const ACTION_INCREASE_BUDGET = 'increase_budget';
    public const ACTION_DECREASE_BUDGET = 'decrease_budget';
    public const ACTION_DUPLICATE_ADSET = 'duplicate_adset';
    public const ACTION_CREATE_ALERT = 'create_alert';

    /**
     * Operadores disponíveis.
     */
    public const OPERATORS = ['>', '<', '>=', '<=', '=', '!='];

    /**
     * Métricas disponíveis para condição.
     */
    public const METRICS = [
        'cpc' => 'Custo por Clique',
        'ctr' => 'Taxa de Clique',
        'cpm' => 'Custo por Mil Impressões',
        'roas' => 'Retorno sobre Gasto',
        'spend' => 'Gasto Total',
        'impressions' => 'Impressões',
        'clicks' => 'Cliques',
        'conversions' => 'Conversões',
        'cost_per_conversion' => 'Custo por Conversão',
        'frequency' => 'Frequência',
    ];

    /**
     * Conta de anúncios (opcional).
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(AdAccount::class, 'ad_account_id');
    }

    /**
     * Logs de execução.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(AdAutomationLog::class);
    }

    /**
     * Verifica se está ativa.
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Verifica se requer aprovação.
     */
    public function needsApproval(): bool
    {
        return $this->requires_approval;
    }

    /**
     * Retorna a métrica da condição.
     */
    public function getConditionMetric(): string
    {
        return $this->condition['metric'] ?? '';
    }

    /**
     * Retorna o operador da condição.
     */
    public function getConditionOperator(): string
    {
        return $this->condition['operator'] ?? '>';
    }

    /**
     * Retorna o valor da condição.
     */
    public function getConditionValue(): float
    {
        return (float) ($this->condition['value'] ?? 0);
    }

    /**
     * Retorna a duração em dias da condição.
     */
    public function getConditionDuration(): int
    {
        return (int) ($this->condition['duration_days'] ?? 1);
    }

    /**
     * Retorna o tipo de agregação.
     */
    public function getConditionAggregation(): string
    {
        return $this->condition['aggregation'] ?? 'avg';
    }

    /**
     * Retorna o tipo de ação.
     */
    public function getActionType(): string
    {
        return $this->action['type'] ?? '';
    }

    /**
     * Retorna os parâmetros da ação.
     */
    public function getActionParams(): array
    {
        return $this->action['params'] ?? [];
    }

    /**
     * Incrementa contador de execução.
     */
    public function incrementExecutionCount(): void
    {
        $this->increment('execution_count');
        $this->update(['last_executed_at' => now()]);
    }

    /**
     * Verifica se pode executar (cooldown).
     */
    public function canExecute(): bool
    {
        if (!$this->last_executed_at) {
            return true;
        }

        return $this->last_executed_at->addHours($this->cooldown_hours)->isPast();
    }

    /**
     * Scope para regras ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope por frequência.
     */
    public function scopeWithFrequency($query, string $frequency)
    {
        return $query->where('frequency', $frequency);
    }

    /**
     * Scope ordenado por prioridade.
     */
    public function scopeOrderByPriority($query)
    {
        return $query->orderBy('priority', 'desc');
    }
}

