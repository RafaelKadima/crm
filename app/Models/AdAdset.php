<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdAdset extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ad_campaign_id',
        'platform_adset_id',
        'name',
        'status',
        'daily_budget',
        'lifetime_budget',
        'bid_strategy',
        'bid_amount',
        'start_date',
        'end_date',
        'targeting',
        'optimization_goal',
        'spend',
        'impressions',
        'clicks',
        'conversions',
        'ctr',
        'cpc',
        'cpm',
        'roas',
        'metadata',
        'last_sync_at',
    ];

    protected $casts = [
        'daily_budget' => 'decimal:2',
        'lifetime_budget' => 'decimal:2',
        'bid_amount' => 'decimal:2',
        'spend' => 'decimal:2',
        'ctr' => 'decimal:4',
        'cpc' => 'decimal:4',
        'cpm' => 'decimal:4',
        'roas' => 'decimal:4',
        'targeting' => 'array',
        'metadata' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
        'last_sync_at' => 'datetime',
    ];

    /**
     * Status possíveis.
     */
    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_PAUSED = 'PAUSED';
    public const STATUS_DELETED = 'DELETED';
    public const STATUS_ARCHIVED = 'ARCHIVED';

    /**
     * Campanha pai.
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(AdCampaign::class, 'ad_campaign_id');
    }

    /**
     * Anúncios do conjunto.
     */
    public function ads(): HasMany
    {
        return $this->hasMany(AdAd::class);
    }

    /**
     * Histórico de métricas.
     */
    public function metricsHistory(): HasMany
    {
        return $this->hasMany(AdMetricsHistory::class, 'entity_id')
            ->where('entity_type', 'adset');
    }

    /**
     * Insights relacionados.
     */
    public function insights(): HasMany
    {
        return $this->hasMany(AdInsight::class, 'entity_id')
            ->where('entity_type', 'adset');
    }

    /**
     * Verifica se está ativo.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Retorna orçamento atual.
     */
    public function getCurrentBudget(): float
    {
        if ($this->daily_budget) {
            return (float) $this->daily_budget;
        }
        return (float) $this->lifetime_budget;
    }

    /**
     * Scope para adsets ativos.
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}

