<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserReward extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * Status possíveis.
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [
        self::STATUS_PENDING => 'Pendente',
        self::STATUS_APPROVED => 'Aprovado',
        self::STATUS_DELIVERED => 'Entregue',
        self::STATUS_REJECTED => 'Rejeitado',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'user_id',
        'reward_id',
        'tier_id',
        'status',
        'requested_at',
        'approved_at',
        'approved_by',
        'delivered_at',
        'notes',
        'period',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'approved_at' => 'datetime',
            'delivered_at' => 'datetime',
        ];
    }

    /**
     * Usuário que solicitou.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Recompensa solicitada.
     */
    public function reward(): BelongsTo
    {
        return $this->belongsTo(Reward::class);
    }

    /**
     * Tier no momento da solicitação.
     */
    public function tier(): BelongsTo
    {
        return $this->belongsTo(GamificationTier::class, 'tier_id');
    }

    /**
     * Usuário que aprovou.
     */
    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Verifica se está pendente.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Verifica se foi aprovado.
     */
    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * Verifica se foi entregue.
     */
    public function isDelivered(): bool
    {
        return $this->status === self::STATUS_DELIVERED;
    }

    /**
     * Aprova a solicitação.
     */
    public function approve(User $approver, ?string $notes = null): void
    {
        $this->update([
            'status' => self::STATUS_APPROVED,
            'approved_at' => now(),
            'approved_by' => $approver->id,
            'notes' => $notes,
        ]);
    }

    /**
     * Marca como entregue.
     */
    public function markDelivered(?string $notes = null): void
    {
        $this->update([
            'status' => self::STATUS_DELIVERED,
            'delivered_at' => now(),
            'notes' => $notes ?? $this->notes,
        ]);
    }

    /**
     * Rejeita a solicitação.
     */
    public function reject(User $rejecter, string $reason): void
    {
        $this->update([
            'status' => self::STATUS_REJECTED,
            'approved_by' => $rejecter->id,
            'notes' => $reason,
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
     * Scope para aprovados (aguardando entrega).
     */
    public function scopeApproved($query)
    {
        return $query->where('status', self::STATUS_APPROVED);
    }
}
