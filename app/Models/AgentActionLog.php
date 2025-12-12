<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentActionLog extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'agent_action_logs';

    protected $fillable = [
        'tenant_id',
        'agent_type',
        'entity_id',
        'entity_type',
        'action',
        'state_snapshot',
        'explanation',
        'policy_mode',
        'confidence',
        'contributing_factors',
        'was_overridden',
        'override_reason',
        'overridden_by',
        'outcome',
        'outcome_reward',
    ];

    protected $casts = [
        'state_snapshot' => 'array',
        'contributing_factors' => 'array',
        'was_overridden' => 'boolean',
        'confidence' => 'float',
        'outcome_reward' => 'float',
    ];

    // Constantes para agent_type
    public const AGENT_SDR = 'sdr';
    public const AGENT_ADS = 'ads';

    // Constantes para outcome
    public const OUTCOME_SUCCESS = 'success';
    public const OUTCOME_FAILED = 'failed';
    public const OUTCOME_PENDING = 'pending';

    /**
     * Relacionamento com o usuário que sobrescreveu
     */
    public function overriddenByUser()
    {
        return $this->belongsTo(User::class, 'overridden_by');
    }

    /**
     * Scope para ações sobrescritas
     */
    public function scopeOverridden($query)
    {
        return $query->where('was_overridden', true);
    }

    /**
     * Scope para filtrar por tipo de agente
     */
    public function scopeForAgent($query, string $agentType)
    {
        return $query->where('agent_type', $agentType);
    }

    /**
     * Loga uma ação do agente com explicação
     */
    public static function logAction(
        string $tenantId,
        string $agentType,
        string $action,
        ?string $entityId = null,
        ?string $entityType = null,
        ?array $stateSnapshot = null,
        ?string $explanation = null,
        ?string $policyMode = null,
        ?float $confidence = null,
        ?array $contributingFactors = null
    ): self {
        return static::create([
            'tenant_id' => $tenantId,
            'agent_type' => $agentType,
            'action' => $action,
            'entity_id' => $entityId,
            'entity_type' => $entityType,
            'state_snapshot' => $stateSnapshot,
            'explanation' => $explanation,
            'policy_mode' => $policyMode,
            'confidence' => $confidence,
            'contributing_factors' => $contributingFactors,
            'outcome' => self::OUTCOME_PENDING,
        ]);
    }

    /**
     * Marca ação como sobrescrita
     */
    public function markAsOverridden(string $userId, string $reason): void
    {
        $this->update([
            'was_overridden' => true,
            'overridden_by' => $userId,
            'override_reason' => $reason,
        ]);
    }

    /**
     * Define o resultado da ação
     */
    public function setOutcome(string $outcome, ?float $reward = null): void
    {
        $this->update([
            'outcome' => $outcome,
            'outcome_reward' => $reward,
        ]);
    }
}
