<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    use HasUuids;

    public $timestamps = false;
    
    protected $fillable = [
        'tenant_id',
        'lead_id',
        'ticket_id',
        'agent_id',
        'model',
        'input_tokens',
        'output_tokens',
        'total_tokens',
        'cost_usd',
        'cost_brl',
        'action_type',
        'response_time_ms',
        'from_cache',
        'metadata',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'cost_usd' => 'decimal:6',
            'cost_brl' => 'decimal:4',
            'from_cache' => 'boolean',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Preços por modelo (USD por 1M tokens)
     */
    public const MODEL_PRICES = [
        'gpt-4o-mini' => ['input' => 0.15, 'output' => 0.60],
        'gpt-4o' => ['input' => 2.50, 'output' => 10.00],
        'gpt-4-turbo' => ['input' => 10.00, 'output' => 30.00],
        'gpt-3.5-turbo' => ['input' => 0.50, 'output' => 1.50],
        'text-embedding-3-small' => ['input' => 0.02, 'output' => 0],
        'text-embedding-3-large' => ['input' => 0.13, 'output' => 0],
    ];

    /**
     * Calcula o custo baseado no modelo e tokens
     */
    public static function calculateCost(string $model, int $inputTokens, int $outputTokens): array
    {
        $prices = self::MODEL_PRICES[$model] ?? self::MODEL_PRICES['gpt-4o-mini'];
        
        $costUsd = (($inputTokens / 1_000_000) * $prices['input']) + 
                   (($outputTokens / 1_000_000) * $prices['output']);
        
        $exchangeRate = config('services.openai.exchange_rate', 6.0);
        $costBrl = $costUsd * $exchangeRate;

        return [
            'cost_usd' => round($costUsd, 6),
            'cost_brl' => round($costBrl, 4),
        ];
    }

    /**
     * Registra uso de IA
     */
    public static function logUsage(array $data): self
    {
        $costs = self::calculateCost(
            $data['model'] ?? 'gpt-4o-mini',
            $data['input_tokens'] ?? 0,
            $data['output_tokens'] ?? 0
        );

        $log = self::create([
            'tenant_id' => $data['tenant_id'],
            'lead_id' => $data['lead_id'] ?? null,
            'ticket_id' => $data['ticket_id'] ?? null,
            'agent_id' => $data['agent_id'] ?? null,
            'model' => $data['model'] ?? 'gpt-4o-mini',
            'input_tokens' => $data['input_tokens'] ?? 0,
            'output_tokens' => $data['output_tokens'] ?? 0,
            'total_tokens' => ($data['input_tokens'] ?? 0) + ($data['output_tokens'] ?? 0),
            'cost_usd' => $costs['cost_usd'],
            'cost_brl' => $costs['cost_brl'],
            'action_type' => $data['action_type'] ?? null,
            'response_time_ms' => $data['response_time_ms'] ?? null,
            'from_cache' => $data['from_cache'] ?? false,
            'metadata' => $data['metadata'] ?? null,
            'created_at' => now(),
        ]);

        // Atualiza estatísticas agregadas
        TenantUsageStats::incrementAiUsage(
            $data['tenant_id'],
            $log->total_tokens,
            $log->cost_brl
        );

        return $log;
    }

    /**
     * Relacionamento com tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Relacionamento com lead
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Relacionamento com ticket
     */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    /**
     * Relacionamento com agente SDR
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class, 'agent_id');
    }
}

