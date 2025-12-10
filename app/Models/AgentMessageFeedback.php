<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Feedback de mensagens do agente (👍/👎)
 * Usado para aprendizado contínuo
 */
class AgentMessageFeedback extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'agent_message_feedback';

    protected $fillable = [
        'tenant_id',
        'message_id',
        'ticket_id',
        'lead_id',
        'agent_id',
        'evaluated_by',
        'rating',
        'original_response',
        'corrected_response',
        'feedback_reason',
        'tags',
        'lead_message',
        'detected_intent',
        'context_snapshot',
        'processed_for_learning',
        'processed_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'context_snapshot' => 'array',
        'processed_for_learning' => 'boolean',
        'processed_at' => 'datetime',
    ];

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class, 'agent_id');
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluated_by');
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(TicketMessage::class, 'message_id');
    }

    // Scopes
    public function scopePositive($query)
    {
        return $query->where('rating', 'positive');
    }

    public function scopeNegative($query)
    {
        return $query->where('rating', 'negative');
    }

    public function scopeUnprocessed($query)
    {
        return $query->where('processed_for_learning', false);
    }

    public function scopeForAgent($query, string $agentId)
    {
        return $query->where('agent_id', $agentId);
    }
}

