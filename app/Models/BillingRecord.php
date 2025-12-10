<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingRecord extends Model
{
    use HasUuids;

    // Status de pagamento
    public const STATUS_PENDING = 'pending';
    public const STATUS_PAID = 'paid';
    public const STATUS_OVERDUE = 'overdue';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'tenant_id',
        'year',
        'month',
        'plan',
        'base_price',
        'extra_leads_cost',
        'extra_ai_cost',
        'extra_users_cost',
        'total_cost',
        'breakdown',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'extra_leads_cost' => 'decimal:2',
            'extra_ai_cost' => 'decimal:2',
            'extra_users_cost' => 'decimal:2',
            'total_cost' => 'decimal:2',
            'breakdown' => 'array',
        ];
    }

    /**
     * Gera registro de faturamento para um tenant
     */
    public static function generateForTenant(Tenant $tenant, int $year, int $month): self
    {
        $quota = TenantQuota::getForTenant($tenant->id);
        $stats = TenantUsageStats::getForPeriod($tenant->id, $year, $month);

        $basePrice = TenantQuota::PLAN_PRICES[$tenant->plan->value] ?? 0;
        $extraLeadsCost = 0;
        $extraAiCost = 0;
        $extraUsersCost = 0;
        $breakdown = [];

        if ($stats && $quota) {
            // Calcula custo de leads extras
            if ($stats->leads_created > $quota->max_leads_month) {
                $extraLeads = $stats->leads_created - $quota->max_leads_month;
                $extraLeadsCost = $extraLeads * TenantQuota::EXTRA_PRICES['lead'];
                $breakdown['extra_leads'] = [
                    'quantity' => $extraLeads,
                    'unit_price' => TenantQuota::EXTRA_PRICES['lead'],
                    'total' => $extraLeadsCost,
                ];
            }

            // Calcula custo de IA extra (se ultrapassou o limite incluído)
            if ($quota->max_ai_cost_month > 0 && $stats->ai_cost_brl > $quota->max_ai_cost_month) {
                $extraAiCost = $stats->ai_cost_brl - $quota->max_ai_cost_month;
                $breakdown['extra_ai'] = [
                    'included' => $quota->max_ai_cost_month,
                    'used' => $stats->ai_cost_brl,
                    'extra' => $extraAiCost,
                ];
            }

            // Calcula custo de usuários extras
            $userCount = $tenant->users()->count();
            if ($userCount > $quota->max_users) {
                $extraUsers = $userCount - $quota->max_users;
                $userPrice = $tenant->plan->value === 'basic' 
                    ? TenantQuota::EXTRA_PRICES['user_basic']
                    : TenantQuota::EXTRA_PRICES['user_ia_sdr'];
                $extraUsersCost = $extraUsers * $userPrice;
                $breakdown['extra_users'] = [
                    'quantity' => $extraUsers,
                    'unit_price' => $userPrice,
                    'total' => $extraUsersCost,
                ];
            }
        }

        $totalCost = $basePrice + $extraLeadsCost + $extraAiCost + $extraUsersCost;

        $breakdown['summary'] = [
            'base_price' => $basePrice,
            'extra_leads_cost' => $extraLeadsCost,
            'extra_ai_cost' => $extraAiCost,
            'extra_users_cost' => $extraUsersCost,
            'total' => $totalCost,
        ];

        if ($stats) {
            $breakdown['usage'] = [
                'leads_created' => $stats->leads_created,
                'ai_messages' => $stats->ai_messages_sent,
                'ai_cost' => $stats->ai_cost_brl,
            ];
        }

        return self::updateOrCreate(
            [
                'tenant_id' => $tenant->id,
                'year' => $year,
                'month' => $month,
            ],
            [
                'plan' => $tenant->plan->value,
                'base_price' => $basePrice,
                'extra_leads_cost' => $extraLeadsCost,
                'extra_ai_cost' => $extraAiCost,
                'extra_users_cost' => $extraUsersCost,
                'total_cost' => $totalCost,
                'breakdown' => $breakdown,
                'status' => self::STATUS_PENDING,
            ]
        );
    }

    /**
     * Relacionamento com tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Marca como pago
     */
    public function markAsPaid(): void
    {
        $this->update(['status' => self::STATUS_PAID]);
    }

    /**
     * Marca como atrasado
     */
    public function markAsOverdue(): void
    {
        $this->update(['status' => self::STATUS_OVERDUE]);
    }

    /**
     * Retorna período formatado
     */
    public function getPeriodAttribute(): string
    {
        return sprintf('%04d-%02d', $this->year, $this->month);
    }

    /**
     * Verifica se está pendente
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Verifica se está pago
     */
    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }
}

