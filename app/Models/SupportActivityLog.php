<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportActivityLog extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'agent_id',
        'ticket_id',
        'lead_id',
        'action_type',
        'tool_used',
        'tool_arguments',
        'tool_result',
        'user_message',
        'agent_response',
        'error_found',
        'error_details',
        'resolution_provided',
        'resolution_summary',
        'execution_time_ms',
        'tokens_used',
    ];

    protected $casts = [
        'tool_arguments' => 'array',
        'error_details' => 'array',
        'error_found' => 'boolean',
        'resolution_provided' => 'boolean',
    ];

    // Tipos de ação
    const TYPE_DIAGNOSTIC = 'diagnostic';
    const TYPE_RESPONSE = 'response';
    const TYPE_TRANSFER = 'transfer';
    const TYPE_RESOLUTION = 'resolution';

    /**
     * Relação com tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Relação com agente
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class, 'agent_id');
    }

    /**
     * Relação com ticket
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Relação com lead
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Registra uma ação de diagnóstico (uso de ferramenta)
     */
    public static function logDiagnostic(
        string $tenantId,
        string $agentId,
        ?string $ticketId,
        ?string $leadId,
        string $toolUsed,
        array $toolArguments,
        string $toolResult,
        int $executionTimeMs,
        ?string $userMessage = null
    ): self {
        return self::create([
            'tenant_id' => $tenantId,
            'agent_id' => $agentId,
            'ticket_id' => $ticketId,
            'lead_id' => $leadId,
            'action_type' => self::TYPE_DIAGNOSTIC,
            'tool_used' => $toolUsed,
            'tool_arguments' => $toolArguments,
            'tool_result' => $toolResult,
            'execution_time_ms' => $executionTimeMs,
            'user_message' => $userMessage,
        ]);
    }

    /**
     * Registra uma resposta enviada
     */
    public static function logResponse(
        string $tenantId,
        string $agentId,
        ?string $ticketId,
        ?string $leadId,
        string $userMessage,
        string $agentResponse,
        int $tokensUsed,
        bool $errorFound = false,
        ?array $errorDetails = null,
        bool $resolutionProvided = false,
        ?string $resolutionSummary = null
    ): self {
        return self::create([
            'tenant_id' => $tenantId,
            'agent_id' => $agentId,
            'ticket_id' => $ticketId,
            'lead_id' => $leadId,
            'action_type' => self::TYPE_RESPONSE,
            'user_message' => $userMessage,
            'agent_response' => $agentResponse,
            'tokens_used' => $tokensUsed,
            'error_found' => $errorFound,
            'error_details' => $errorDetails,
            'resolution_provided' => $resolutionProvided,
            'resolution_summary' => $resolutionSummary,
        ]);
    }

    /**
     * Registra uma transferência para humano
     */
    public static function logTransfer(
        string $tenantId,
        string $agentId,
        ?string $ticketId,
        ?string $leadId,
        string $reason,
        string $diagnosis
    ): self {
        return self::create([
            'tenant_id' => $tenantId,
            'agent_id' => $agentId,
            'ticket_id' => $ticketId,
            'lead_id' => $leadId,
            'action_type' => self::TYPE_TRANSFER,
            'agent_response' => $reason,
            'resolution_summary' => $diagnosis,
        ]);
    }

    // Scopes

    public function scopeForTenant($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeForAgent($query, string $agentId)
    {
        return $query->where('agent_id', $agentId);
    }

    public function scopeForTicket($query, string $ticketId)
    {
        return $query->where('ticket_id', $ticketId);
    }

    public function scopeDiagnostics($query)
    {
        return $query->where('action_type', self::TYPE_DIAGNOSTIC);
    }

    public function scopeResponses($query)
    {
        return $query->where('action_type', self::TYPE_RESPONSE);
    }

    public function scopeTransfers($query)
    {
        return $query->where('action_type', self::TYPE_TRANSFER);
    }

    public function scopeWithErrors($query)
    {
        return $query->where('error_found', true);
    }

    public function scopeWithResolutions($query)
    {
        return $query->where('resolution_provided', true);
    }
}
