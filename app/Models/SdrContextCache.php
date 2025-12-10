<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SdrContextCache extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'sdr_context_cache';

    protected $fillable = [
        'sdr_agent_id',
        'cache_key',
        'provider',
        'cache_id',
        'content_hash',
        'token_count',
        'expires_at',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'token_count' => 'integer',
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
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
     * Verifica se expirou
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Verifica se é válido
     */
    public function isValid(string $contentHash): bool
    {
        return !$this->isExpired() && $this->content_hash === $contentHash;
    }
}

