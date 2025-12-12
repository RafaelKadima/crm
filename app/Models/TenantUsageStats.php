<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantUsageStats extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'year',
        'month',
        'leads_created',
        'leads_qualified',
        'leads_converted',
        'ai_messages_sent',
        'ai_total_tokens',
        'ai_cost_usd',
        'ai_cost_brl',
        'ai_units_used',
        'ai_units_4o_mini',
        'ai_units_4o',
        'rag_documents_processed',
        'audio_minutes_used',
        'image_analyses_used',
        'tickets_created',
        'tickets_closed',
        'messages_inbound',
        'messages_outbound',
        'storage_used_bytes',
    ];

    protected function casts(): array
    {
        return [
            'ai_cost_usd' => 'decimal:4',
            'ai_cost_brl' => 'decimal:2',
            'ai_units_used' => 'decimal:2',
            'ai_units_4o_mini' => 'decimal:2',
            'ai_units_4o' => 'decimal:2',
        ];
    }

    /**
     * Obtém ou cria estatísticas do mês atual
     */
    public static function getCurrentMonth(string $tenantId): self
    {
        return self::firstOrCreate([
            'tenant_id' => $tenantId,
            'year' => now()->year,
            'month' => now()->month,
        ]);
    }

    /**
     * Obtém estatísticas de um período específico
     */
    public static function getForPeriod(string $tenantId, int $year, int $month): ?self
    {
        return self::where('tenant_id', $tenantId)
            ->where('year', $year)
            ->where('month', $month)
            ->first();
    }

    /**
     * Incrementa contador de leads criados
     */
    public static function incrementLeads(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('leads_created', $count);
    }

    /**
     * Incrementa contador de leads qualificados
     */
    public static function incrementQualifiedLeads(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('leads_qualified', $count);
    }

    /**
     * Incrementa contador de leads convertidos
     */
    public static function incrementConvertedLeads(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('leads_converted', $count);
    }

    /**
     * Incrementa uso de IA (versão antiga - mantida para compatibilidade)
     */
    public static function incrementAiUsage(string $tenantId, int $tokens, float $costBrl): void
    {
        $stats = self::getCurrentMonth($tenantId);
        $stats->increment('ai_messages_sent');
        $stats->increment('ai_total_tokens', $tokens);
        
        // Para valores decimais, precisamos atualizar manualmente
        $stats->update([
            'ai_cost_brl' => $stats->ai_cost_brl + $costBrl,
            'ai_cost_usd' => $stats->ai_cost_usd + ($costBrl / 6.0),
        ]);
    }

    /**
     * Incrementa uso de IA com Unidades (NOVO)
     * 
     * @param string $tenantId ID do tenant
     * @param int $tokens Total de tokens usados
     * @param float $costBrl Custo em BRL
     * @param float $units Unidades de IA consumidas
     * @param string $model Modelo usado (gpt-4o-mini, gpt-4o, etc.)
     */
    public static function incrementAiUsageWithUnits(
        string $tenantId,
        int $tokens,
        float $costBrl,
        float $units,
        string $model = 'gpt-4o-mini'
    ): void {
        $stats = self::getCurrentMonth($tenantId);
        $stats->increment('ai_messages_sent');
        $stats->increment('ai_total_tokens', $tokens);
        
        // Determina qual campo de breakdown atualizar
        $unitsField = match (true) {
            str_contains($model, '4o-mini') => 'ai_units_4o_mini',
            str_contains($model, '4o') => 'ai_units_4o',
            default => 'ai_units_4o_mini',
        };
        
        $stats->update([
            'ai_cost_brl' => $stats->ai_cost_brl + $costBrl,
            'ai_cost_usd' => $stats->ai_cost_usd + ($costBrl / 6.0),
            'ai_units_used' => $stats->ai_units_used + $units,
            $unitsField => $stats->$unitsField + $units,
        ]);
    }

    /**
     * Incrementa documentos RAG processados
     */
    public static function incrementRagDocuments(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('rag_documents_processed', $count);
    }

    /**
     * Incrementa minutos de áudio usados
     */
    public static function incrementAudioMinutes(string $tenantId, int $minutes): void
    {
        self::getCurrentMonth($tenantId)->increment('audio_minutes_used', $minutes);
    }

    /**
     * Incrementa análises de imagem
     */
    public static function incrementImageAnalyses(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('image_analyses_used', $count);
    }

    /**
     * Incrementa tickets criados
     */
    public static function incrementTickets(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('tickets_created', $count);
    }

    /**
     * Incrementa tickets fechados
     */
    public static function incrementClosedTickets(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('tickets_closed', $count);
    }

    /**
     * Incrementa mensagens recebidas
     */
    public static function incrementInboundMessages(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('messages_inbound', $count);
    }

    /**
     * Incrementa mensagens enviadas
     */
    public static function incrementOutboundMessages(string $tenantId, int $count = 1): void
    {
        self::getCurrentMonth($tenantId)->increment('messages_outbound', $count);
    }

    /**
     * Atualiza storage usado
     */
    public static function updateStorageUsed(string $tenantId, int $bytes): void
    {
        self::getCurrentMonth($tenantId)->update(['storage_used_bytes' => $bytes]);
    }

    /**
     * Relacionamento com tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Retorna período formatado
     */
    public function getPeriodAttribute(): string
    {
        return sprintf('%04d-%02d', $this->year, $this->month);
    }

    /**
     * Retorna histórico dos últimos N meses
     */
    public static function getHistory(string $tenantId, int $months = 12): \Illuminate\Database\Eloquent\Collection
    {
        return self::where('tenant_id', $tenantId)
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->take($months)
            ->get();
    }

    /**
     * Retorna uso de Unidades vs quota
     */
    public function getAiUnitsUsageVsQuota(): array
    {
        $quota = TenantQuota::getForTenant($this->tenant_id);
        
        if (!$quota) {
            return [
                'used' => $this->ai_units_used,
                'limit' => 0,
                'bonus' => 0,
                'total_available' => 0,
                'percentage' => 0,
                'remaining' => 0,
            ];
        }

        $totalAvailable = $quota->getTotalAiUnitsAvailable();
        $percentage = $totalAvailable > 0 
            ? round(($this->ai_units_used / $totalAvailable) * 100, 1) 
            : 0;

        return [
            'used' => round($this->ai_units_used, 2),
            'limit' => $quota->max_ai_units_month,
            'bonus' => $quota->bonus_ai_units,
            'total_available' => $totalAvailable,
            'percentage' => min($percentage, 100),
            'remaining' => max(0, $totalAvailable - $this->ai_units_used),
            'breakdown' => [
                '4o_mini' => round($this->ai_units_4o_mini, 2),
                '4o' => round($this->ai_units_4o, 2),
            ],
        ];
    }
}
