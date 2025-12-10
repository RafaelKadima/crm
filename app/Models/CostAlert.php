<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CostAlert extends Model
{
    use HasUuids;

    // Tipos de alerta
    public const TYPE_QUOTA_WARNING = 'quota_warning';
    public const TYPE_QUOTA_EXCEEDED = 'quota_exceeded';
    public const TYPE_COST_WARNING = 'cost_warning';
    public const TYPE_COST_EXCEEDED = 'cost_exceeded';

    // Recursos monitorados
    public const RESOURCE_LEADS = 'leads';
    public const RESOURCE_AI_MESSAGES = 'ai_messages';
    public const RESOURCE_AI_COST = 'ai_cost';
    public const RESOURCE_STORAGE = 'storage';
    public const RESOURCE_USERS = 'users';
    public const RESOURCE_CHANNELS = 'channels';

    // Status
    public const STATUS_ACTIVE = 'active';
    public const STATUS_ACKNOWLEDGED = 'acknowledged';
    public const STATUS_RESOLVED = 'resolved';

    protected $fillable = [
        'tenant_id',
        'type',
        'resource',
        'threshold_percent',
        'current_value',
        'limit_value',
        'status',
        'acknowledged_by',
        'acknowledged_at',
    ];

    protected function casts(): array
    {
        return [
            'current_value' => 'decimal:4',
            'limit_value' => 'decimal:4',
            'acknowledged_at' => 'datetime',
        ];
    }

    /**
     * Cria alerta se não existir um similar hoje
     */
    public static function createIfNotExists(
        string $tenantId,
        string $type,
        string $resource,
        int $threshold,
        float $currentValue,
        float $limitValue
    ): ?self {
        // Evita duplicatas no mesmo dia
        $exists = self::where('tenant_id', $tenantId)
            ->where('resource', $resource)
            ->where('threshold_percent', $threshold)
            ->whereDate('created_at', today())
            ->exists();

        if ($exists) {
            return null;
        }

        return self::create([
            'tenant_id' => $tenantId,
            'type' => $type,
            'resource' => $resource,
            'threshold_percent' => $threshold,
            'current_value' => $currentValue,
            'limit_value' => $limitValue,
            'status' => self::STATUS_ACTIVE,
        ]);
    }

    /**
     * Relacionamento com tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Relacionamento com usuário que reconheceu
     */
    public function acknowledgedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    /**
     * Reconhece o alerta
     */
    public function acknowledge(string $userId): void
    {
        $this->update([
            'status' => self::STATUS_ACKNOWLEDGED,
            'acknowledged_by' => $userId,
            'acknowledged_at' => now(),
        ]);
    }

    /**
     * Resolve o alerta
     */
    public function resolve(): void
    {
        $this->update(['status' => self::STATUS_RESOLVED]);
    }

    /**
     * Verifica se está ativo
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Retorna descrição legível do alerta
     */
    public function getDescriptionAttribute(): string
    {
        $resourceNames = [
            self::RESOURCE_LEADS => 'Leads',
            self::RESOURCE_AI_MESSAGES => 'Mensagens de IA',
            self::RESOURCE_AI_COST => 'Custo de IA',
            self::RESOURCE_STORAGE => 'Armazenamento',
            self::RESOURCE_USERS => 'Usuários',
            self::RESOURCE_CHANNELS => 'Canais',
        ];

        $resourceName = $resourceNames[$this->resource] ?? $this->resource;

        if ($this->type === self::TYPE_QUOTA_EXCEEDED || $this->type === self::TYPE_COST_EXCEEDED) {
            return "{$resourceName}: limite atingido ({$this->current_value}/{$this->limit_value})";
        }

        return "{$resourceName}: {$this->threshold_percent}% do limite usado ({$this->current_value}/{$this->limit_value})";
    }

    /**
     * Retorna severidade do alerta
     */
    public function getSeverityAttribute(): string
    {
        if ($this->threshold_percent >= 100) {
            return 'critical';
        }
        if ($this->threshold_percent >= 90) {
            return 'high';
        }
        return 'medium';
    }

    /**
     * Scope para alertas ativos
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope para alertas não reconhecidos
     */
    public function scopeUnacknowledged($query)
    {
        return $query->whereIn('status', [self::STATUS_ACTIVE]);
    }
}

