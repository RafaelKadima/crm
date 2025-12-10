<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SdrInteraction extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'sdr_agent_id',
        'lead_id',
        'ticket_id',
        'user_message',
        'agent_response',
        'context_used',
        'tokens_input',
        'tokens_output',
        'cost',
        'response_time_ms',
        'feedback',
    ];

    protected function casts(): array
    {
        return [
            'context_used' => 'array',
            'tokens_input' => 'integer',
            'tokens_output' => 'integer',
            'cost' => 'decimal:6',
            'response_time_ms' => 'integer',
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
     * Lead
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Ticket
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Custo total em tokens
     */
    public function getTotalTokensAttribute(): int
    {
        return ($this->tokens_input ?? 0) + ($this->tokens_output ?? 0);
    }

    /**
     * Scope: Feedback positivo
     */
    public function scopePositive($query)
    {
        return $query->where('feedback', 'positive');
    }

    /**
     * Scope: Feedback negativo
     */
    public function scopeNegative($query)
    {
        return $query->where('feedback', 'negative');
    }
}

