<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiSuggestedAction extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'bi_suggested_actions';

    protected $fillable = [
        'tenant_id',
        'analysis_id',
        'target_agent',
        'action_type',
        'priority',
        'title',
        'description',
        'rationale',
        'action_payload',
        'expected_impact',
        'status',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'executed_by',
        'executed_at',
        'execution_result',
        'expires_at',
    ];

    protected $casts = [
        'action_payload' => 'array',
        'expected_impact' => 'array',
        'execution_result' => 'array',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'executed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    // Constantes para target_agent
    public const TARGET_SDR = 'sdr';
    public const TARGET_ADS = 'ads';
    public const TARGET_KNOWLEDGE = 'knowledge';
    public const TARGET_ML = 'ml';

    // Constantes para action_type
    public const ACTION_UPDATE_SCRIPT = 'update_script';
    public const ACTION_PAUSE_CAMPAIGN = 'pause_campaign';
    public const ACTION_SCALE_CAMPAIGN = 'scale_campaign';
    public const ACTION_ADD_KNOWLEDGE = 'add_knowledge';
    public const ACTION_RETRAIN_MODEL = 'retrain_model';
    public const ACTION_ADJUST_RULES = 'adjust_rules';
    public const ACTION_SEND_ALERT = 'send_alert';

    // Constantes para priority
    public const PRIORITY_LOW = 'low';
    public const PRIORITY_MEDIUM = 'medium';
    public const PRIORITY_HIGH = 'high';
    public const PRIORITY_CRITICAL = 'critical';

    // Constantes para status
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_EXECUTED = 'executed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_EXPIRED = 'expired';

    /**
     * Análise que gerou esta ação
     */
    public function analysis(): BelongsTo
    {
        return $this->belongsTo(BiAnalysis::class, 'analysis_id');
    }

    /**
     * Usuário que aprovou
     */
    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Usuário que rejeitou
     */
    public function rejectedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    /**
     * Scope para ações pendentes
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope para ações aprovadas
     */
    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    /**
     * Scope para filtrar por agente alvo
     */
    public function scopeForAgent($query, string $agent)
    {
        return $query->where('target_agent', $agent);
    }

    /**
     * Scope para filtrar por prioridade
     */
    public function scopeWithPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Scope para ações não expiradas
     */
    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    /**
     * Verifica se está expirada
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Aprova a ação
     */
    public function approve(string $userId): void
    {
        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_by' => $userId,
            'approved_at' => now(),
        ]);
    }

    /**
     * Rejeita a ação
     */
    public function reject(string $userId, string $reason): void
    {
        $this->update([
            'status' => self::STATUS_REJECTED,
            'rejected_by' => $userId,
            'rejected_at' => now(),
            'rejection_reason' => $reason,
        ]);
    }

    /**
     * Marca como executada
     */
    public function markExecuted(array $result, ?string $userId = null): void
    {
        $this->update([
            'status' => self::STATUS_EXECUTED,
            'executed_by' => $userId,
            'executed_at' => now(),
            'execution_result' => $result,
        ]);
    }

    /**
     * Marca como falha
     */
    public function markFailed(array $error): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'execution_result' => $error,
        ]);
    }

    /**
     * Cria uma nova ação sugerida
     */
    public static function suggest(
        string $tenantId,
        string $targetAgent,
        string $actionType,
        string $title,
        string $description,
        string $rationale,
        array $payload,
        string $priority = self::PRIORITY_MEDIUM,
        ?array $expectedImpact = null,
        ?string $analysisId = null,
        ?\DateTime $expiresAt = null
    ): self {
        return static::create([
            'tenant_id' => $tenantId,
            'analysis_id' => $analysisId,
            'target_agent' => $targetAgent,
            'action_type' => $actionType,
            'title' => $title,
            'description' => $description,
            'rationale' => $rationale,
            'action_payload' => $payload,
            'expected_impact' => $expectedImpact,
            'priority' => $priority,
            'status' => self::STATUS_PENDING,
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * Conta ações pendentes por prioridade
     */
    public static function countPendingByPriority(string $tenantId): array
    {
        return static::where('tenant_id', $tenantId)
            ->pending()
            ->notExpired()
            ->selectRaw('priority, COUNT(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->toArray();
    }
}

