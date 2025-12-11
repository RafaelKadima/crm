<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class AdAgentFeedback extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'ad_agent_feedback';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'feedback_type',
        'reference_id',
        'rating',
        'score',
        'original_content',
        'corrected_content',
        'comment',
        'action_type',
        'context_data',
        'is_processed',
        'processed_at',
        'learning_result',
    ];

    protected $casts = [
        'context_data' => 'array',
        'learning_result' => 'array',
        'is_processed' => 'boolean',
        'processed_at' => 'datetime',
        'score' => 'integer',
    ];

    // Tipos de feedback
    public const TYPE_CAMPAIGN = 'campaign';
    public const TYPE_CREATIVE = 'creative';
    public const TYPE_COPY = 'copy';
    public const TYPE_SUGGESTION = 'suggestion';
    public const TYPE_ACTION = 'action';
    public const TYPE_RESPONSE = 'response';

    // Ratings
    public const RATING_POSITIVE = 'positive';
    public const RATING_NEGATIVE = 'negative';
    public const RATING_NEUTRAL = 'neutral';

    // Tipos de ação
    public const ACTION_CREATE_CAMPAIGN = 'create_campaign';
    public const ACTION_GENERATE_COPY = 'generate_copy';
    public const ACTION_SUGGEST_AUDIENCE = 'suggest_audience';
    public const ACTION_OPTIMIZE_BUDGET = 'optimize_budget';
    public const ACTION_CREATE_CREATIVE = 'create_creative';

    /**
     * Relacionamento com usuário
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Escopo para não processados
     */
    public function scopeUnprocessed(Builder $query): Builder
    {
        return $query->where('is_processed', false);
    }

    /**
     * Escopo por tipo de feedback
     */
    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('feedback_type', $type);
    }

    /**
     * Escopo por rating
     */
    public function scopeWithRating(Builder $query, string $rating): Builder
    {
        return $query->where('rating', $rating);
    }

    /**
     * Escopo para positivos
     */
    public function scopePositive(Builder $query): Builder
    {
        return $query->where('rating', self::RATING_POSITIVE);
    }

    /**
     * Escopo para negativos
     */
    public function scopeNegative(Builder $query): Builder
    {
        return $query->where('rating', self::RATING_NEGATIVE);
    }

    /**
     * Marca como processado
     */
    public function markAsProcessed(array $learningResult = []): void
    {
        $this->update([
            'is_processed' => true,
            'processed_at' => now(),
            'learning_result' => $learningResult,
        ]);
    }

    /**
     * Verifica se tem correção
     */
    public function hasCorrection(): bool
    {
        return !empty($this->corrected_content);
    }

    /**
     * Calcula taxa de feedback positivo
     */
    public static function positiveRate(string $tenantId, ?string $actionType = null): float
    {
        $query = static::where('tenant_id', $tenantId);
        
        if ($actionType) {
            $query->where('action_type', $actionType);
        }
        
        $total = $query->count();
        
        if ($total === 0) {
            return 0;
        }
        
        $positive = (clone $query)->where('rating', self::RATING_POSITIVE)->count();
        
        return round(($positive / $total) * 100, 2);
    }
}

