<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdMetricsHistory extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'ad_metrics_history';

    protected $fillable = [
        'tenant_id',
        'entity_type',
        'entity_id',
        'date',
        'spend',
        'impressions',
        'clicks',
        'conversions',
        'conversion_value',
        'ctr',
        'cpc',
        'cpm',
        'roas',
        'cost_per_conversion',
        'reach',
        'frequency',
        'likes',
        'comments',
        'shares',
        'video_views',
        'video_views_25',
        'video_views_50',
        'video_views_75',
        'video_views_100',
        'extra_metrics',
    ];

    protected $casts = [
        'date' => 'date',
        'spend' => 'decimal:2',
        'conversion_value' => 'decimal:2',
        'ctr' => 'decimal:4',
        'cpc' => 'decimal:4',
        'cpm' => 'decimal:4',
        'roas' => 'decimal:4',
        'cost_per_conversion' => 'decimal:4',
        'frequency' => 'decimal:2',
        'extra_metrics' => 'array',
    ];

    /**
     * Tipos de entidade.
     */
    public const ENTITY_CAMPAIGN = 'campaign';
    public const ENTITY_ADSET = 'adset';
    public const ENTITY_AD = 'ad';

    /**
     * Retorna a entidade relacionada.
     */
    public function entity()
    {
        return match($this->entity_type) {
            self::ENTITY_CAMPAIGN => $this->belongsTo(AdCampaign::class, 'entity_id'),
            self::ENTITY_ADSET => $this->belongsTo(AdAdset::class, 'entity_id'),
            self::ENTITY_AD => $this->belongsTo(AdAd::class, 'entity_id'),
            default => null,
        };
    }

    /**
     * Scope por tipo de entidade.
     */
    public function scopeForCampaigns($query)
    {
        return $query->where('entity_type', self::ENTITY_CAMPAIGN);
    }

    public function scopeForAdsets($query)
    {
        return $query->where('entity_type', self::ENTITY_ADSET);
    }

    public function scopeForAds($query)
    {
        return $query->where('entity_type', self::ENTITY_AD);
    }

    /**
     * Scope por período.
     */
    public function scopeInPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope últimos X dias.
     */
    public function scopeLastDays($query, int $days)
    {
        return $query->where('date', '>=', now()->subDays($days)->toDateString());
    }

    /**
     * Calcula média de uma métrica para uma entidade.
     */
    public static function avgMetric(string $entityType, string $entityId, string $metric, int $days = 7): float
    {
        return static::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->lastDays($days)
            ->avg($metric) ?? 0;
    }

    /**
     * Calcula soma de uma métrica para uma entidade.
     */
    public static function sumMetric(string $entityType, string $entityId, string $metric, int $days = 7): float
    {
        return static::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->lastDays($days)
            ->sum($metric) ?? 0;
    }
}

