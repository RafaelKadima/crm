<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class AdConversion extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'ad_campaign_id',
        'ad_adset_id',
        'ad_ad_id',
        'lead_id',
        'contact_id',
        'event_type',
        'gtm_event_key',
        'value',
        'currency',
        'utm_data',
        'attribution_model',
        'attribution_weight',
        'stage_from',
        'stage_to',
        'days_to_convert',
        'metadata',
        'converted_at',
    ];

    protected $casts = [
        'utm_data' => 'array',
        'metadata' => 'array',
        'value' => 'decimal:2',
        'attribution_weight' => 'float',
        'days_to_convert' => 'integer',
        'converted_at' => 'datetime',
    ];

    // Tipos de evento
    public const EVENT_PURCHASE = 'purchase';
    public const EVENT_LEAD = 'lead';
    public const EVENT_SCHEDULE = 'schedule';
    public const EVENT_QUALIFIED = 'qualified';
    public const EVENT_CONTACT = 'contact';
    public const EVENT_VIEW_CONTENT = 'view_content';
    public const EVENT_ADD_TO_CART = 'add_to_cart';
    public const EVENT_INITIATE_CHECKOUT = 'initiate_checkout';

    // Modelos de atribuição
    public const ATTRIBUTION_LAST_CLICK = 'last_click';
    public const ATTRIBUTION_FIRST_CLICK = 'first_click';
    public const ATTRIBUTION_LINEAR = 'linear';
    public const ATTRIBUTION_TIME_DECAY = 'time_decay';

    /**
     * Relacionamento com campanha
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(AdCampaign::class, 'ad_campaign_id');
    }

    /**
     * Relacionamento com adset
     */
    public function adset(): BelongsTo
    {
        return $this->belongsTo(AdAdset::class, 'ad_adset_id');
    }

    /**
     * Relacionamento com anúncio
     */
    public function ad(): BelongsTo
    {
        return $this->belongsTo(AdAd::class, 'ad_ad_id');
    }

    /**
     * Relacionamento com lead
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Relacionamento com contato
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Escopo por tipo de evento
     */
    public function scopeEventType(Builder $query, string $eventType): Builder
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Escopo para purchases
     */
    public function scopePurchases(Builder $query): Builder
    {
        return $query->where('event_type', self::EVENT_PURCHASE);
    }

    /**
     * Escopo por período
     */
    public function scopeInPeriod(Builder $query, string $startDate, string $endDate): Builder
    {
        return $query->whereBetween('converted_at', [$startDate, $endDate]);
    }

    /**
     * Escopo por campanha
     */
    public function scopeForCampaign(Builder $query, string $campaignId): Builder
    {
        return $query->where('ad_campaign_id', $campaignId);
    }

    /**
     * Calcula valor total de conversões
     */
    public static function totalValue(string $tenantId, ?string $campaignId = null): float
    {
        $query = static::where('tenant_id', $tenantId);
        
        if ($campaignId) {
            $query->where('ad_campaign_id', $campaignId);
        }
        
        return $query->sum('value') ?? 0;
    }

    /**
     * Conta conversões por tipo
     */
    public static function countByType(string $tenantId, string $eventType, ?string $campaignId = null): int
    {
        $query = static::where('tenant_id', $tenantId)
            ->where('event_type', $eventType);
        
        if ($campaignId) {
            $query->where('ad_campaign_id', $campaignId);
        }
        
        return $query->count();
    }
}
