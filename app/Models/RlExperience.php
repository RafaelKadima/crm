<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RlExperience extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'rl_experiences';

    protected $fillable = [
        'tenant_id',
        'agent_type',
        'entity_id',
        'state',
        'action',
        'reward',
        'next_state',
        'is_terminal',
        'reward_received',
        'policy_mode',
        'action_confidence',
    ];

    protected $casts = [
        'state' => 'array',
        'next_state' => 'array',
        'is_terminal' => 'boolean',
        'reward_received' => 'boolean',
        'reward' => 'float',
        'action_confidence' => 'float',
    ];

    // Constantes para agent_type
    public const AGENT_SDR = 'sdr';
    public const AGENT_ADS = 'ads';

    // Constantes para policy_mode
    public const MODE_RULE_BASED = 'RULE_BASED';
    public const MODE_BANDIT = 'BANDIT';
    public const MODE_DQN = 'DQN';

    /**
     * Scope para filtrar por tipo de agente
     */
    public function scopeForAgent($query, string $agentType)
    {
        return $query->where('agent_type', $agentType);
    }

    /**
     * Scope para experiências que ainda não receberam reward
     */
    public function scopePendingReward($query)
    {
        return $query->where('reward_received', false);
    }

    /**
     * Scope para experiências com reward
     */
    public function scopeWithReward($query)
    {
        return $query->where('reward_received', true);
    }

    /**
     * Conta experiências por tenant e agente
     */
    public static function countForTenant(string $tenantId, string $agentType): int
    {
        return static::where('tenant_id', $tenantId)
            ->where('agent_type', $agentType)
            ->where('reward_received', true)
            ->count();
    }

    /**
     * Adiciona reward a uma experiência pendente
     */
    public function addReward(float $reward, ?array $nextState = null): void
    {
        $this->update([
            'reward' => $reward,
            'next_state' => $nextState,
            'reward_received' => true,
        ]);
    }
}

