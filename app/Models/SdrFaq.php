<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SdrFaq extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'sdr_agent_id',
        'question',
        'answer',
        'keywords',
        'priority',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'keywords' => 'array',
            'priority' => 'integer',
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
}

