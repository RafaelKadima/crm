<?php

namespace App\Models;

use App\Enums\PlanEnum;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantQuota extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'max_leads_month',
        'max_users',
        'max_channels',
        'max_ai_messages_month',
        'max_ai_cost_month',
        'max_storage_mb',
        'enforce_limits',
    ];

    protected function casts(): array
    {
        return [
            'enforce_limits' => 'boolean',
            'max_ai_cost_month' => 'decimal:2',
        ];
    }

    /**
     * Quotas padrão por plano
     */
    public const PLAN_DEFAULTS = [
        'basic' => [
            'max_leads_month' => 500,
            'max_users' => 3,
            'max_channels' => 1,
            'max_ai_messages_month' => 0,
            'max_ai_cost_month' => 0,
            'max_storage_mb' => 1024,
        ],
        'ia_sdr' => [
            'max_leads_month' => 2000,
            'max_users' => 10,
            'max_channels' => 3,
            'max_ai_messages_month' => 24000, // 2000 leads x 12 msgs
            'max_ai_cost_month' => 100.00,
            'max_storage_mb' => 5120,
        ],
        'enterprise' => [
            'max_leads_month' => 10000,
            'max_users' => 999,
            'max_channels' => 999,
            'max_ai_messages_month' => 999999,
            'max_ai_cost_month' => 500.00,
            'max_storage_mb' => 20480,
        ],
    ];

    /**
     * Preços dos planos (BRL)
     */
    public const PLAN_PRICES = [
        'basic' => 147.00,
        'ia_sdr' => 497.00,
        'enterprise' => 1297.00,
    ];

    /**
     * Preços de extras (BRL)
     */
    public const EXTRA_PRICES = [
        'lead' => 0.05,           // Por lead extra
        'user_basic' => 39.00,    // Usuário extra no Basic
        'user_ia_sdr' => 29.00,   // Usuário extra no IA SDR
        'channel' => 49.00,       // Canal extra
        'storage_5gb' => 29.00,   // 5GB de storage
    ];

    /**
     * Cria quota para novo tenant baseado no plano
     */
    public static function createForTenant(Tenant $tenant): self
    {
        $defaults = self::PLAN_DEFAULTS[$tenant->plan->value] ?? self::PLAN_DEFAULTS['basic'];

        return self::create([
            'tenant_id' => $tenant->id,
            ...$defaults,
        ]);
    }

    /**
     * Atualiza quota quando muda de plano
     */
    public static function updateForPlan(Tenant $tenant, PlanEnum $newPlan): void
    {
        $defaults = self::PLAN_DEFAULTS[$newPlan->value] ?? self::PLAN_DEFAULTS['basic'];
        
        self::updateOrCreate(
            ['tenant_id' => $tenant->id],
            $defaults
        );
    }

    /**
     * Retorna quota de um tenant
     */
    public static function getForTenant(string $tenantId): ?self
    {
        return self::where('tenant_id', $tenantId)->first();
    }

    /**
     * Relacionamento com tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Verifica se tenant pode criar mais usuários
     */
    public function canAddUser(): bool
    {
        $currentUsers = $this->tenant->users()->count();
        return $currentUsers < $this->max_users;
    }

    /**
     * Verifica se tenant pode adicionar mais canais
     */
    public function canAddChannel(): bool
    {
        $currentChannels = $this->tenant->channels()->count();
        return $currentChannels < $this->max_channels;
    }
}

