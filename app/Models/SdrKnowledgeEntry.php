<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SdrKnowledgeEntry extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'sdr_agent_id',
        'title',
        'content',
        'category',
        'tags',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Agente SDR
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class, 'sdr_agent_id');
    }

    /**
     * Scope: Ativos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Por categoria
     */
    public function scopeCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}

