<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdCampaign extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ad_account_id',
        'platform_campaign_id',
        'name',
        'objective',
        'status',
        'daily_budget',
        'lifetime_budget',
        'budget_type',
        'start_date',
        'end_date',
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
        'spend' => 'decimal:2',
        'ctr' => 'decimal:4',
        'cpc' => 'decimal:4',
        'cpm' => 'decimal:4',
        'roas' => 'decimal:4',
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
     * Conta de anúncios.
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(AdAccount::class, 'ad_account_id');
    }

    /**
     * Conjuntos de anúncios.
     */
    public function adsets(): HasMany
    {
        return $this->hasMany(AdAdset::class);
    }

    /**
     * Histórico de métricas.
     */
    public function metricsHistory(): HasMany
    {
        return $this->hasMany(AdMetricsHistory::class, 'entity_id')
            ->where('entity_type', 'campaign');
    }

    /**
     * Insights relacionados.
     */
    public function insights(): HasMany
    {
        return $this->hasMany(AdInsight::class, 'entity_id')
            ->where('entity_type', 'campaign');
    }

    /**
     * Verifica se está ativa.
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
        return $this->budget_type === 'daily' 
            ? (float) $this->daily_budget 
            : (float) $this->lifetime_budget;
    }

    /**
     * Scope para campanhas ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope para campanhas com gasto.
     */
    public function scopeWithSpend($query)
    {
        return $query->where('spend', '>', 0);
    }
}

