<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdInsight extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'entity_type',
        'entity_id',
        'entity_name',
        'type',
        'severity',
        'title',
        'description',
        'recommendation',
        'data',
        'suggested_action',
        'status',
        'actioned_by',
        'actioned_at',
        'action_notes',
        'expires_at',
    ];

    protected $casts = [
        'data' => 'array',
        'suggested_action' => 'array',
        'actioned_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /**
     * Tipos de insight.
     */
    public const TYPE_PERFORMANCE_DROP = 'performance_drop';
    public const TYPE_OPPORTUNITY = 'opportunity';
    public const TYPE_BUDGET_ALERT = 'budget_alert';
    public const TYPE_WINNER_AD = 'winner_ad';
    public const TYPE_SUGGESTION = 'suggestion';
    public const TYPE_ANOMALY = 'anomaly';

    /**
     * Níveis de severidade.
     */
    public const SEVERITY_INFO = 'info';
    public const SEVERITY_WARNING = 'warning';
    public const SEVERITY_CRITICAL = 'critical';
    public const SEVERITY_SUCCESS = 'success';

    /**
     * Status possíveis.
     */
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPLIED = 'applied';
    public const STATUS_DISMISSED = 'dismissed';
    public const STATUS_EXPIRED = 'expired';

    /**
     * Usuário que tomou ação.
     */
    public function actioner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actioned_by');
    }

    /**
     * Retorna a entidade relacionada.
     */
    public function entity()
    {
        return match($this->entity_type) {
            'account' => $this->belongsTo(AdAccount::class, 'entity_id'),
            'campaign' => $this->belongsTo(AdCampaign::class, 'entity_id'),
            'adset' => $this->belongsTo(AdAdset::class, 'entity_id'),
            'ad' => $this->belongsTo(AdAd::class, 'entity_id'),
            default => null,
        };
    }

    /**
     * Verifica se está pendente.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Verifica se expirou.
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Verifica se tem ação sugerida.
     */
    public function hasSuggestedAction(): bool
    {
        return !empty($this->suggested_action);
    }

    /**
     * Verifica se é crítico.
     */
    public function isCritical(): bool
    {
        return $this->severity === self::SEVERITY_CRITICAL;
    }

    /**
     * Aplica o insight.
     */
    public function markAsApplied(string $userId, ?string $notes = null): void
    {
        $this->update([
            'status' => self::STATUS_APPLIED,
            'actioned_by' => $userId,
            'actioned_at' => now(),
            'action_notes' => $notes,
        ]);
    }

    /**
     * Dispensa o insight.
     */
    public function dismiss(string $userId, ?string $notes = null): void
    {
        $this->update([
            'status' => self::STATUS_DISMISSED,
            'actioned_by' => $userId,
            'actioned_at' => now(),
            'action_notes' => $notes,
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
     * Scope para não expirados.
     */
    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    /**
     * Scope por severidade.
     */
    public function scopeWithSeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope por tipo.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope críticos.
     */
    public function scopeCritical($query)
    {
        return $query->where('severity', self::SEVERITY_CRITICAL);
    }

    /**
     * Scope ativos (pendentes e não expirados).
     */
    public function scopeActive($query)
    {
        return $query->pending()->notExpired();
    }
}

