<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdAutomationLog extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ad_automation_rule_id',
        'entity_type',
        'entity_id',
        'entity_name',
        'action_type',
        'action_params',
        'previous_state',
        'new_state',
        'status',
        'error_message',
        'metrics_snapshot',
        'approved_by',
        'approved_at',
        'can_rollback',
        'rolled_back_at',
        'rolled_back_by',
        'executed_at',
    ];

    protected $casts = [
        'action_params' => 'array',
        'previous_state' => 'array',
        'new_state' => 'array',
        'metrics_snapshot' => 'array',
        'can_rollback' => 'boolean',
        'approved_at' => 'datetime',
        'rolled_back_at' => 'datetime',
        'executed_at' => 'datetime',
    ];

    /**
     * Status possíveis.
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_EXECUTED = 'executed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_ROLLED_BACK = 'rolled_back';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    /**
     * Regra de automação.
     */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(AdAutomationRule::class, 'ad_automation_rule_id');
    }

    /**
     * Usuário que aprovou.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Usuário que fez rollback.
     */
    public function rollbacker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rolled_back_by');
    }

    /**
     * Retorna a entidade relacionada.
     */
    public function entity()
    {
        return match($this->entity_type) {
            'campaign' => $this->belongsTo(AdCampaign::class, 'entity_id'),
            'adset' => $this->belongsTo(AdAdset::class, 'entity_id'),
            'ad' => $this->belongsTo(AdAd::class, 'entity_id'),
            default => null,
        };
    }

    /**
     * Verifica se foi executado.
     */
    public function wasExecuted(): bool
    {
        return $this->status === self::STATUS_EXECUTED;
    }

    /**
     * Verifica se pode fazer rollback.
     */
    public function canRollback(): bool
    {
        return $this->can_rollback 
            && $this->wasExecuted() 
            && !$this->rolled_back_at;
    }

    /**
     * Verifica se está pendente aprovação.
     */
    public function isPendingApproval(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Marca como executado.
     */
    public function markAsExecuted(): void
    {
        $this->update([
            'status' => self::STATUS_EXECUTED,
            'executed_at' => now(),
        ]);
    }

    /**
     * Marca como falhou.
     */
    public function markAsFailed(string $error): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $error,
        ]);
    }

    /**
     * Marca como rolled back.
     */
    public function markAsRolledBack(string $userId): void
    {
        $this->update([
            'status' => self::STATUS_ROLLED_BACK,
            'rolled_back_at' => now(),
            'rolled_back_by' => $userId,
        ]);
    }

    /**
     * Aprova a ação.
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
     * Rejeita a ação.
     */
    public function reject(): void
    {
        $this->update([
            'status' => self::STATUS_REJECTED,
        ]);
    }

    /**
     * Scope para pendentes.
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope para executados.
     */
    public function scopeExecuted($query)
    {
        return $query->where('status', self::STATUS_EXECUTED);
    }

    /**
     * Scope para falhos.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Scope com rollback disponível.
     */
    public function scopeRollbackable($query)
    {
        return $query->where('can_rollback', true)
            ->where('status', self::STATUS_EXECUTED)
            ->whereNull('rolled_back_at');
    }
}

