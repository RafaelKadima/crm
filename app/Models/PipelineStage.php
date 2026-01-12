<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PipelineStage extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * Tipos de estágio disponíveis.
     */
    public const TYPE_OPEN = 'open';    // Estágio normal do funil
    public const TYPE_WON = 'won';      // Lead ganho
    public const TYPE_LOST = 'lost';    // Lead perdido

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'pipeline_id',
        'name',
        'slug',
        'order',
        'color',
        'gtm_event_key',
        'stage_type',
        'probability',
        'kpi_weight',
        'counts_for_goal',
    ];

    /**
     * The attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'probability' => 'integer',
            'kpi_weight' => 'integer',
            'counts_for_goal' => 'boolean',
        ];
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function ($stage) {
            if (empty($stage->slug)) {
                $baseSlug = Str::slug($stage->name);
                $slug = $baseSlug;
                $counter = 1;

                // Verificar se o slug já existe no pipeline e gerar um único
                while (static::where('pipeline_id', $stage->pipeline_id)
                    ->where('slug', $slug)
                    ->exists()
                ) {
                    $counter++;
                    $slug = $baseSlug . '-' . $counter;
                }

                $stage->slug = $slug;
            }
        });
    }

    /**
     * Pipeline deste estágio.
     */
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    /**
     * Leads neste estágio.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'stage_id');
    }

    /**
     * Próximo estágio no pipeline.
     */
    public function nextStage(): ?PipelineStage
    {
        return static::where('pipeline_id', $this->pipeline_id)
            ->where('order', '>', $this->order)
            ->orderBy('order')
            ->first();
    }

    /**
     * Estágio anterior no pipeline.
     */
    public function previousStage(): ?PipelineStage
    {
        return static::where('pipeline_id', $this->pipeline_id)
            ->where('order', '<', $this->order)
            ->orderByDesc('order')
            ->first();
    }

    /**
     * Verifica se é o primeiro estágio.
     */
    public function isFirst(): bool
    {
        return $this->previousStage() === null;
    }

    /**
     * Verifica se é o último estágio.
     */
    public function isLast(): bool
    {
        return $this->nextStage() === null;
    }

    /**
     * Verifica se é estágio de ganho.
     */
    public function isWon(): bool
    {
        return $this->stage_type === self::TYPE_WON;
    }

    /**
     * Verifica se é estágio de perda.
     */
    public function isLost(): bool
    {
        return $this->stage_type === self::TYPE_LOST;
    }

    /**
     * Verifica se é estágio de fechamento (ganho ou perdido).
     */
    public function isClosed(): bool
    {
        return in_array($this->stage_type, [self::TYPE_WON, self::TYPE_LOST]);
    }

    /**
     * Verifica se é estágio aberto/normal.
     */
    public function isOpen(): bool
    {
        return $this->stage_type === self::TYPE_OPEN;
    }

    /**
     * Verifica se este estágio contribui para metas.
     */
    public function contributesToGoal(): bool
    {
        return $this->counts_for_goal || $this->isWon();
    }

    /**
     * Scope para estágios de ganho.
     */
    public function scopeWon($query)
    {
        return $query->where('stage_type', self::TYPE_WON);
    }

    /**
     * Scope para estágios de perda.
     */
    public function scopeLost($query)
    {
        return $query->where('stage_type', self::TYPE_LOST);
    }

    /**
     * Scope para estágios abertos.
     */
    public function scopeOpen($query)
    {
        return $query->where('stage_type', self::TYPE_OPEN);
    }

    /**
     * Templates de atividades para este estágio.
     */
    public function activityTemplates(): HasMany
    {
        return $this->hasMany(StageActivityTemplate::class, 'stage_id');
    }
}


