<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pipeline extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'is_default',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    /**
     * Estágios do pipeline.
     */
    public function stages(): HasMany
    {
        return $this->hasMany(PipelineStage::class)->orderBy('order');
    }

    /**
     * Leads neste pipeline.
     */
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    /**
     * Primeiro estágio do pipeline.
     */
    public function firstStage(): ?PipelineStage
    {
        return $this->stages()->orderBy('order')->first();
    }

    /**
     * Último estágio do pipeline.
     */
    public function lastStage(): ?PipelineStage
    {
        return $this->stages()->orderByDesc('order')->first();
    }

    /**
     * Define este pipeline como padrão (remove de outros).
     */
    public function setAsDefault(): void
    {
        // Remove o padrão dos outros pipelines do tenant
        static::where('tenant_id', $this->tenant_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        $this->update(['is_default' => true]);
    }
}


