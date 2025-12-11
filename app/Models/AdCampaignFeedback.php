<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class AdCampaignFeedback extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'ad_campaign_feedback';

    protected $fillable = [
        'tenant_id',
        'ad_campaign_id',
        'user_id',
        'rating',
        'score',
        'feedback',
        'categories',
        'learned_insight',
        'is_processed',
        'processed_at',
    ];

    protected $casts = [
        'categories' => 'array',
        'score' => 'integer',
        'is_processed' => 'boolean',
        'processed_at' => 'datetime',
    ];

    // Ratings
    public const RATING_POSITIVE = 'positive';
    public const RATING_NEGATIVE = 'negative';
    public const RATING_NEUTRAL = 'neutral';

    // Categorias de feedback
    public const CATEGORY_CREATIVE = 'creative';
    public const CATEGORY_COPY = 'copy';
    public const CATEGORY_TARGETING = 'targeting';
    public const CATEGORY_BUDGET = 'budget';
    public const CATEGORY_TIMING = 'timing';
    public const CATEGORY_PERFORMANCE = 'performance';

    /**
     * Relacionamento com campanha
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(AdCampaign::class, 'ad_campaign_id');
    }

    /**
     * Relacionamento com usuário
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Escopo para feedback positivo
     */
    public function scopePositive(Builder $query): Builder
    {
        return $query->where('rating', self::RATING_POSITIVE);
    }

    /**
     * Escopo para feedback negativo
     */
    public function scopeNegative(Builder $query): Builder
    {
        return $query->where('rating', self::RATING_NEGATIVE);
    }

    /**
     * Escopo para feedback não processado
     */
    public function scopeUnprocessed(Builder $query): Builder
    {
        return $query->where('is_processed', false);
    }

    /**
     * Escopo por categoria
     */
    public function scopeInCategory(Builder $query, string $category): Builder
    {
        return $query->whereJsonContains('categories', $category);
    }

    /**
     * Marca como processado
     */
    public function markAsProcessed(?string $insight = null): void
    {
        $this->update([
            'is_processed' => true,
            'processed_at' => now(),
            'learned_insight' => $insight,
        ]);
    }

    /**
     * Verifica se é feedback positivo
     */
    public function isPositive(): bool
    {
        return $this->rating === self::RATING_POSITIVE;
    }

    /**
     * Verifica se é feedback negativo
     */
    public function isNegative(): bool
    {
        return $this->rating === self::RATING_NEGATIVE;
    }

    /**
     * Obtém resumo do feedback para processamento
     */
    public function getSummaryForProcessing(): array
    {
        return [
            'id' => $this->id,
            'campaign_id' => $this->ad_campaign_id,
            'rating' => $this->rating,
            'score' => $this->score,
            'feedback' => $this->feedback,
            'categories' => $this->categories,
            'campaign' => $this->campaign ? [
                'name' => $this->campaign->name,
                'objective' => $this->campaign->objective,
                'daily_budget' => $this->campaign->daily_budget,
                'status' => $this->campaign->status,
            ] : null,
        ];
    }
}

