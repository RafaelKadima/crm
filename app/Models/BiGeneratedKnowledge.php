<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BiGeneratedKnowledge extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'bi_generated_knowledge';

    protected $fillable = [
        'tenant_id',
        'analysis_id',
        'knowledge_type',
        'category',
        'title',
        'content',
        'metadata',
        'supporting_data',
        'confidence',
        'added_to_rag',
        'added_to_rag_at',
        'used_for_training',
        'used_for_training_at',
        'is_active',
        'valid_until',
    ];

    protected $casts = [
        'metadata' => 'array',
        'supporting_data' => 'array',
        'confidence' => 'float',
        'added_to_rag' => 'boolean',
        'added_to_rag_at' => 'datetime',
        'used_for_training' => 'boolean',
        'used_for_training_at' => 'datetime',
        'is_active' => 'boolean',
        'valid_until' => 'datetime',
    ];

    // Constantes para knowledge_type
    public const TYPE_INSIGHT = 'insight';
    public const TYPE_PATTERN = 'pattern';
    public const TYPE_BEST_PRACTICE = 'best_practice';
    public const TYPE_WARNING = 'warning';
    public const TYPE_ANOMALY = 'anomaly';

    // Constantes para category
    public const CATEGORY_SALES = 'sales';
    public const CATEGORY_SUPPORT = 'support';
    public const CATEGORY_MARKETING = 'marketing';
    public const CATEGORY_FINANCIAL = 'financial';
    public const CATEGORY_OPERATIONS = 'operations';

    /**
     * Análise que gerou este conhecimento
     */
    public function analysis(): BelongsTo
    {
        return $this->belongsTo(BiAnalysis::class, 'analysis_id');
    }

    /**
     * Scope para conhecimentos ativos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('valid_until')
                  ->orWhere('valid_until', '>', now());
            });
    }

    /**
     * Scope para filtrar por tipo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('knowledge_type', $type);
    }

    /**
     * Scope para filtrar por categoria
     */
    public function scopeInCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope para não adicionados ao RAG
     */
    public function scopeNotInRag($query)
    {
        return $query->where('added_to_rag', false);
    }

    /**
     * Scope para não usados em treinamento
     */
    public function scopeNotUsedForTraining($query)
    {
        return $query->where('used_for_training', false);
    }

    /**
     * Scope para alta confiança
     */
    public function scopeHighConfidence($query, float $threshold = 0.7)
    {
        return $query->where('confidence', '>=', $threshold);
    }

    /**
     * Marca como adicionado ao RAG
     */
    public function markAddedToRag(): void
    {
        $this->update([
            'added_to_rag' => true,
            'added_to_rag_at' => now(),
        ]);
    }

    /**
     * Marca como usado para treinamento
     */
    public function markUsedForTraining(): void
    {
        $this->update([
            'used_for_training' => true,
            'used_for_training_at' => now(),
        ]);
    }

    /**
     * Desativa o conhecimento
     */
    public function deactivate(): void
    {
        $this->update(['is_active' => false]);
    }

    /**
     * Cria novo conhecimento gerado
     */
    public static function generate(
        string $tenantId,
        string $type,
        string $category,
        string $title,
        string $content,
        float $confidence = 0.5,
        ?array $metadata = null,
        ?array $supportingData = null,
        ?string $analysisId = null,
        ?\DateTime $validUntil = null
    ): self {
        return static::create([
            'tenant_id' => $tenantId,
            'analysis_id' => $analysisId,
            'knowledge_type' => $type,
            'category' => $category,
            'title' => $title,
            'content' => $content,
            'confidence' => $confidence,
            'metadata' => $metadata,
            'supporting_data' => $supportingData,
            'valid_until' => $validUntil,
            'is_active' => true,
        ]);
    }

    /**
     * Busca conhecimentos relevantes para contexto
     */
    public static function findRelevant(string $tenantId, string $category, int $limit = 10): \Illuminate\Database\Eloquent\Collection
    {
        return static::where('tenant_id', $tenantId)
            ->active()
            ->inCategory($category)
            ->highConfidence()
            ->orderByDesc('confidence')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Formata para adicionar ao RAG
     */
    public function toRagFormat(): array
    {
        return [
            'content' => $this->content,
            'context' => "bi_{$this->knowledge_type}",
            'category' => $this->category,
            'metadata' => [
                'source' => 'bi_agent',
                'knowledge_id' => $this->id,
                'type' => $this->knowledge_type,
                'confidence' => $this->confidence,
                'generated_at' => $this->created_at->toIso8601String(),
            ],
        ];
    }
}

