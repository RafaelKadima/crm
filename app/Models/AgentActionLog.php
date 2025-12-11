<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Log estruturado de ações executadas pelo agente SDR.
 * Usado para auditoria, análise de performance e ML.
 */
class AgentActionLog extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'sdr_agent_id',
        'ticket_id',
        'lead_id',
        'action_type',
        'action_data',
        'trigger_message',
        'response_text',
        'model_used',
        'tokens_used',
        'latency_ms',
        'success',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'action_data' => 'array',
            'tokens_used' => 'integer',
            'latency_ms' => 'integer',
            'success' => 'boolean',
        ];
    }

    // ==================== RELACIONAMENTOS ====================

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sdrAgent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    // ==================== SCOPES ====================

    public function scopeSuccessful($query)
    {
        return $query->where('success', true);
    }

    public function scopeFailed($query)
    {
        return $query->where('success', false);
    }

    public function scopeByActionType($query, string $type)
    {
        return $query->where('action_type', $type);
    }

    public function scopeByAgent($query, string $agentId)
    {
        return $query->where('sdr_agent_id', $agentId);
    }

    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    // ==================== MÉTODOS ESTÁTICOS ====================

    /**
     * Registra uma ação do agente
     */
    public static function logAction(
        SdrAgent $agent,
        string $actionType,
        array $options = []
    ): self {
        return self::create([
            'tenant_id' => $agent->tenant_id,
            'sdr_agent_id' => $agent->id,
            'ticket_id' => $options['ticket_id'] ?? null,
            'lead_id' => $options['lead_id'] ?? null,
            'action_type' => $actionType,
            'action_data' => $options['action_data'] ?? null,
            'trigger_message' => $options['trigger_message'] ?? null,
            'response_text' => $options['response_text'] ?? null,
            'model_used' => $options['model_used'] ?? null,
            'tokens_used' => $options['tokens_used'] ?? null,
            'latency_ms' => $options['latency_ms'] ?? null,
            'success' => $options['success'] ?? true,
            'error_message' => $options['error_message'] ?? null,
        ]);
    }

    /**
     * Retorna estatísticas do agente
     */
    public static function getAgentStats(string $agentId, int $days = 30): array
    {
        $logs = self::where('sdr_agent_id', $agentId)
            ->where('created_at', '>=', now()->subDays($days))
            ->get();

        return [
            'total_actions' => $logs->count(),
            'successful' => $logs->where('success', true)->count(),
            'failed' => $logs->where('success', false)->count(),
            'by_type' => $logs->groupBy('action_type')->map->count(),
            'avg_latency_ms' => $logs->avg('latency_ms'),
            'total_tokens' => $logs->sum('tokens_used'),
        ];
    }
}



