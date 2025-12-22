<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PointRule extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * Tipos de ações disponíveis.
     */
    public const ACTION_TYPES = [
        'activity_completed' => 'Atividade Completada',
        'deal_won' => 'Deal Ganho',
        'deal_lost' => 'Deal Perdido',
        'stage_advanced' => 'Avançou Etapa',
        'call_made' => 'Ligação Realizada',
        'meeting_completed' => 'Reunião Realizada',
        'proposal_sent' => 'Proposta Enviada',
        'deal_value_threshold' => 'Deal Acima de Valor',
        'first_response' => 'Primeira Resposta',
        'task_completed' => 'Tarefa Completada',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'action_type',
        'entity_type',
        'entity_id',
        'points',
        'multiplier',
        'conditions',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'points' => 'integer',
            'multiplier' => 'decimal:2',
            'conditions' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Transações de pontos usando esta regra.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class, 'point_rule_id');
    }

    /**
     * Calcula os pontos com multiplicador.
     */
    public function calculatePoints(): int
    {
        return (int) round($this->points * ($this->multiplier ?? 1));
    }

    /**
     * Verifica se as condições são atendidas.
     */
    public function checkConditions(?array $context = null): bool
    {
        if (empty($this->conditions) || !$context) {
            return true;
        }

        // Verifica valor mínimo do deal
        if (isset($this->conditions['min_value'])) {
            $dealValue = $context['deal_value'] ?? 0;
            if ($dealValue < $this->conditions['min_value']) {
                return false;
            }
        }

        // Verifica valor máximo do deal
        if (isset($this->conditions['max_value'])) {
            $dealValue = $context['deal_value'] ?? 0;
            if ($dealValue > $this->conditions['max_value']) {
                return false;
            }
        }

        // Verifica tipo de atividade específico
        if (isset($this->conditions['activity_type'])) {
            $activityType = $context['activity_type'] ?? null;
            if ($activityType !== $this->conditions['activity_type']) {
                return false;
            }
        }

        return true;
    }

    /**
     * Scope para regras ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para regras de um tipo de ação.
     */
    public function scopeForAction($query, string $actionType)
    {
        return $query->where('action_type', $actionType);
    }

    /**
     * Encontra a melhor regra para uma ação.
     */
    public static function findBestRule(string $tenantId, string $actionType, ?array $context = null): ?self
    {
        return static::where('tenant_id', $tenantId)
            ->active()
            ->forAction($actionType)
            ->orderByDesc('points')
            ->get()
            ->first(fn($rule) => $rule->checkConditions($context));
    }
}
