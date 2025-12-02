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
    ];

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::creating(function ($stage) {
            if (empty($stage->slug)) {
                $stage->slug = Str::slug($stage->name);
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
}


