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
     * Incrementa uso de IA
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
}

