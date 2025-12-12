<?php

namespace App\Models;

use App\Services\AiUnitsService;
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
        'ai_units',
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
            'ai_units' => 'decimal:2',
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
     * Calcula Unidades de IA consumidas
     */
    public static function calculateUnits(string $model, int $totalTokens): float
    {
        $unitsService = app(AiUnitsService::class);
        return $unitsService->tokensToUnits($totalTokens, $model);
    }

    /**
     * Registra uso de IA
     */
    public static function logUsage(array $data): self
    {
        $model = $data['model'] ?? 'gpt-4o-mini';
        $inputTokens = $data['input_tokens'] ?? 0;
        $outputTokens = $data['output_tokens'] ?? 0;
        $totalTokens = $inputTokens + $outputTokens;

        // Calcula custos
        $costs = self::calculateCost($model, $inputTokens, $outputTokens);
        
        // Calcula Unidades de IA
        $aiUnits = self::calculateUnits($model, $totalTokens);

        $log = self::create([
            'tenant_id' => $data['tenant_id'],
            'lead_id' => $data['lead_id'] ?? null,
            'ticket_id' => $data['ticket_id'] ?? null,
            'agent_id' => $data['agent_id'] ?? null,
            'model' => $model,
            'input_tokens' => $inputTokens,
            'output_tokens' => $outputTokens,
            'total_tokens' => $totalTokens,
            'cost_usd' => $costs['cost_usd'],
            'cost_brl' => $costs['cost_brl'],
            'ai_units' => $aiUnits,
            'action_type' => $data['action_type'] ?? null,
            'response_time_ms' => $data['response_time_ms'] ?? null,
            'from_cache' => $data['from_cache'] ?? false,
            'metadata' => $data['metadata'] ?? null,
            'created_at' => now(),
        ]);

        // Atualiza estatísticas agregadas COM Unidades
        TenantUsageStats::incrementAiUsageWithUnits(
            $data['tenant_id'],
            $log->total_tokens,
            $log->cost_brl,
            $log->ai_units,
            $model
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

    /**
     * Retorna uso agregado por modelo em um período
     */
    public static function getUsageByModel(string $tenantId, ?string $startDate = null, ?string $endDate = null): array
    {
        $query = self::where('tenant_id', $tenantId)
            ->selectRaw('model, SUM(total_tokens) as tokens, SUM(ai_units) as units, SUM(cost_brl) as cost, COUNT(*) as calls');

        if ($startDate) {
            $query->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('created_at', '<=', $endDate);
        }

        return $query->groupBy('model')->get()->toArray();
    }

    /**
     * Retorna uso agregado por dia
     */
    public static function getDailyUsage(string $tenantId, int $days = 30): array
    {
        return self::where('tenant_id', $tenantId)
            ->where('created_at', '>=', now()->subDays($days))
            ->selectRaw('DATE(created_at) as date, SUM(ai_units) as units, SUM(cost_brl) as cost, COUNT(*) as calls')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->toArray();
    }
}
