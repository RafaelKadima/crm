<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Perguntas detectadas automaticamente
 * Para geração de FAQs automáticas
 */
class AgentDetectedQuestion extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'agent_detected_questions';

    protected $fillable = [
        'tenant_id',
        'agent_id',
        'question',
        'question_embedding',
        'occurrence_count',
        'variations',
        'suggested_answer',
        'answer_confidence',
        'status',
        'approved_by',
        'converted_to_faq_id',
        'first_seen_at',
        'last_seen_at',
        'ticket_ids',
    ];

    protected $casts = [
        'variations' => 'array',
        'ticket_ids' => 'array',
        'answer_confidence' => 'float',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class, 'agent_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function convertedFaq(): BelongsTo
    {
        return $this->belongsTo(SdrFaq::class, 'converted_to_faq_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeFrequent($query, int $minOccurrences = 3)
    {
        return $query->where('occurrence_count', '>=', $minOccurrences);
    }

    public function scopeForAgent($query, string $agentId)
    {
        return $query->where('agent_id', $agentId);
    }

    // Métodos
    public function incrementOccurrence(string $ticketId, ?string $variation = null): void
    {
        $this->increment('occurrence_count');
        $this->last_seen_at = now();
        
        // Adiciona ticket ao histórico
        $ticketIds = $this->ticket_ids ?? [];
        if (!in_array($ticketId, $ticketIds)) {
            $ticketIds[] = $ticketId;
            $this->ticket_ids = array_slice($ticketIds, -50); // Mantém últimos 50
        }
        
        // Adiciona variação se diferente
        if ($variation && $variation !== $this->question) {
            $variations = $this->variations ?? [];
            if (!in_array($variation, $variations)) {
                $variations[] = $variation;
                $this->variations = array_slice($variations, -20); // Mantém últimas 20
            }
        }
        
        $this->save();
    }

    public function convertToFaq(): ?SdrFaq
    {
        if ($this->status === 'converted' || !$this->suggested_answer) {
            return null;
        }

        $faq = SdrFaq::create([
            'tenant_id' => $this->tenant_id,
            'sdr_agent_id' => $this->agent_id,
            'question' => $this->question,
            'answer' => $this->suggested_answer,
            'is_active' => true,
            'metadata' => [
                'auto_generated' => true,
                'source' => 'detected_question',
                'occurrence_count' => $this->occurrence_count,
                'variations' => $this->variations,
            ],
        ]);

        $this->update([
            'status' => 'converted',
            'converted_to_faq_id' => $faq->id,
        ]);

        return $faq;
    }
}

