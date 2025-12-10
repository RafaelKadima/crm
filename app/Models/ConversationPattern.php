<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Padrões de conversa bem-sucedidos
 * Usado para ML e melhoria contínua
 */
class ConversationPattern extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'conversation_patterns';

    protected $fillable = [
        'tenant_id',
        'agent_id',
        'pattern_type',
        'pattern_name',
        'pattern_description',
        'trigger_phrases',
        'successful_responses',
        'context_conditions',
        'times_used',
        'times_successful',
        'success_rate',
        'avg_conversion_impact',
        'is_active',
        'priority',
    ];

    protected $casts = [
        'trigger_phrases' => 'array',
        'successful_responses' => 'array',
        'context_conditions' => 'array',
        'success_rate' => 'float',
        'avg_conversion_impact' => 'float',
        'is_active' => 'boolean',
    ];

    public function agent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class, 'agent_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('pattern_type', $type);
    }

    public function scopeSuccessful($query, float $minRate = 0.6)
    {
        return $query->where('success_rate', '>=', $minRate);
    }

    // Métodos
    public function recordUsage(bool $wasSuccessful): void
    {
        $this->increment('times_used');
        if ($wasSuccessful) {
            $this->increment('times_successful');
        }
        $this->updateSuccessRate();
    }

    public function updateSuccessRate(): void
    {
        if ($this->times_used > 0) {
            $this->success_rate = $this->times_successful / $this->times_used;
            $this->save();
        }
    }

    public function addSuccessfulResponse(string $response, array $context = []): void
    {
        $responses = $this->successful_responses ?? [];
        $responses[] = [
            'response' => $response,
            'context' => $context,
            'added_at' => now()->toIso8601String(),
        ];
        $this->successful_responses = array_slice($responses, -10); // Mantém últimas 10
        $this->save();
    }

    public function getRandomSuccessfulResponse(): ?string
    {
        $responses = $this->successful_responses ?? [];
        if (empty($responses)) {
            return null;
        }
        return $responses[array_rand($responses)]['response'] ?? null;
    }

    // Tipos de padrão disponíveis
    public static function getPatternTypes(): array
    {
        return [
            'greeting' => 'Saudação/Abertura',
            'qualification' => 'Qualificação',
            'objection_handling' => 'Tratamento de Objeções',
            'scheduling' => 'Agendamento',
            'follow_up' => 'Follow-up',
            'closing' => 'Fechamento',
            'rescue' => 'Resgate de Lead Frio',
        ];
    }
}

