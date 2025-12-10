<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdAd extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'ad_ads';

    protected $fillable = [
        'tenant_id',
        'ad_adset_id',
        'ad_creative_id',
        'platform_ad_id',
        'name',
        'status',
        'headline',
        'description',
        'primary_text',
        'call_to_action',
        'destination_url',
        'preview_url',
        'spend',
        'impressions',
        'clicks',
        'conversions',
        'conversion_value',
        'ctr',
        'cpc',
        'cpm',
        'roas',
        'frequency',
        'reach',
        'performance_score',
        'performance_label',
        'metadata',
        'last_sync_at',
    ];

    protected $casts = [
        'spend' => 'decimal:2',
        'conversion_value' => 'decimal:2',
        'ctr' => 'decimal:4',
        'cpc' => 'decimal:4',
        'cpm' => 'decimal:4',
        'roas' => 'decimal:4',
        'frequency' => 'decimal:2',
        'performance_score' => 'decimal:2',
        'metadata' => 'array',
        'last_sync_at' => 'datetime',
    ];

    /**
     * Status possíveis.
     */
    public const STATUS_ACTIVE = 'ACTIVE';
    public const STATUS_PAUSED = 'PAUSED';
    public const STATUS_DELETED = 'DELETED';
    public const STATUS_ARCHIVED = 'ARCHIVED';
    public const STATUS_PENDING_REVIEW = 'PENDING_REVIEW';
    public const STATUS_DISAPPROVED = 'DISAPPROVED';

    /**
     * Labels de performance.
     */
    public const PERF_WINNER = 'winner';
    public const PERF_AVERAGE = 'average';
    public const PERF_UNDERPERFORMING = 'underperforming';

    /**
     * Conjunto de anúncios pai.
     */
    public function adset(): BelongsTo
    {
        return $this->belongsTo(AdAdset::class, 'ad_adset_id');
    }

    /**
     * Criativo associado.
     */
    public function creative(): BelongsTo
    {
        return $this->belongsTo(AdCreative::class, 'ad_creative_id');
    }

    /**
     * Histórico de métricas.
     */
    public function metricsHistory(): HasMany
    {
        return $this->hasMany(AdMetricsHistory::class, 'entity_id')
            ->where('entity_type', 'ad');
    }

    /**
     * Insights relacionados.
     */
    public function insights(): HasMany
    {
        return $this->hasMany(AdInsight::class, 'entity_id')
            ->where('entity_type', 'ad');
    }

    /**
     * Logs de automação.
     */
    public function automationLogs(): HasMany
    {
        return $this->hasMany(AdAutomationLog::class, 'entity_id')
            ->where('entity_type', 'ad');
    }

    /**
     * Verifica se está ativo.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Verifica se é um winner.
     */
    public function isWinner(): bool
    {
        return $this->performance_label === self::PERF_WINNER;
    }

    /**
     * Verifica se está underperforming.
     */
    public function isUnderperforming(): bool
    {
        return $this->performance_label === self::PERF_UNDERPERFORMING;
    }

    /**
     * Retorna a campanha (via adset).
     */
    public function getCampaignAttribute()
    {
        return $this->adset?->campaign;
    }

    /**
     * Retorna a conta (via adset -> campaign).
     */
    public function getAccountAttribute()
    {
        return $this->campaign?->account;
    }

    /**
     * Scope para ads ativos.
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope para winners.
     */
    public function scopeWinners($query)
    {
        return $query->where('performance_label', self::PERF_WINNER);
    }

    /**
     * Scope para underperforming.
     */
    public function scopeUnderperforming($query)
    {
        return $query->where('performance_label', self::PERF_UNDERPERFORMING);
    }

    /**
     * Scope ordenado por performance.
     */
    public function scopeOrderByPerformance($query, string $direction = 'desc')
    {
        return $query->orderBy('performance_score', $direction);
    }
}

