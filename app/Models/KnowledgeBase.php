<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class KnowledgeBase extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'knowledge_base';

    protected $fillable = [
        'tenant_id',
        'context',
        'category',
        'title',
        'content',
        'summary',
        'embedding',
        'metadata',
        'tags',
        'source',
        'source_reference',
        'is_active',
        'is_verified',
        'usage_count',
        'effectiveness_score',
    ];

    protected $casts = [
        'embedding' => 'array',
        'metadata' => 'array',
        'tags' => 'array',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
        'usage_count' => 'integer',
        'effectiveness_score' => 'float',
    ];

    // Contextos disponíveis
    public const CONTEXT_SDR = 'sdr';
    public const CONTEXT_ADS = 'ads';
    public const CONTEXT_GENERAL = 'general';
    public const CONTEXT_PRODUCTS = 'products';

    // Categorias disponíveis
    public const CATEGORY_RULES = 'rules';
    public const CATEGORY_BEST_PRACTICES = 'best_practices';
    public const CATEGORY_PERFORMANCE = 'performance';
    public const CATEGORY_FAQ = 'faq';
    public const CATEGORY_OBJECTIONS = 'objections';
    public const CATEGORY_SCRIPTS = 'scripts';

    // Fontes do conhecimento
    public const SOURCE_MANUAL = 'manual';
    public const SOURCE_LEARNED = 'learned';
    public const SOURCE_FEEDBACK = 'feedback';
    public const SOURCE_PERFORMANCE = 'performance';

    /**
     * Escopo para filtrar por contexto
     */
    public function scopeContext(Builder $query, string $context): Builder
    {
        return $query->where('context', $context);
    }

    /**
     * Escopo para filtrar por categoria
     */
    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Escopo para ativos
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Escopo para verificados
     */
    public function scopeVerified(Builder $query): Builder
    {
        return $query->where('is_verified', true);
    }

    /**
     * Escopo para contexto Ads
     */
    public function scopeAds(Builder $query): Builder
    {
        return $query->where('context', self::CONTEXT_ADS);
    }

    /**
     * Escopo para contexto SDR
     */
    public function scopeSdr(Builder $query): Builder
    {
        return $query->where('context', self::CONTEXT_SDR);
    }

    /**
     * Incrementa contador de uso
     */
    public function incrementUsage(): void
    {
        $this->increment('usage_count');
    }

    /**
     * Atualiza score de efetividade
     */
    public function updateEffectivenessScore(float $score): void
    {
        // Média móvel com peso maior para o score atual
        if ($this->effectiveness_score === null) {
            $this->effectiveness_score = $score;
        } else {
            $this->effectiveness_score = ($this->effectiveness_score * 0.7) + ($score * 0.3);
        }
        $this->save();
    }
}
