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
        'max_ai_units_month',
        'bonus_ai_units',
        'max_rag_documents_month',
        'max_audio_minutes_month',
        'max_image_analyses_month',
        'gpt4o_enabled',
        'max_storage_mb',
        'enforce_limits',
    ];

    protected function casts(): array
    {
        return [
            'enforce_limits' => 'boolean',
            'gpt4o_enabled' => 'boolean',
            'max_ai_cost_month' => 'decimal:2',
        ];
    }

    /**
     * Quotas padrão por plano (NOVOS PLANOS)
     * 
     * Essencial: R$ 800/mês - CRM básico, sem IA inclusa
     * Performance: R$ 1.399/mês - SDR com IA, 2.500 Unidades
     * Growth: R$ 1.899/mês - IA + Ads Intelligence, 4.500 Unidades + GPT-4o
     */
    public const PLAN_DEFAULTS = [
        // Planos antigos (mantidos para compatibilidade)
        'basic' => [
            'max_leads_month' => 500,
            'max_users' => 3,
            'max_channels' => 1,
            'max_ai_messages_month' => 0,
            'max_ai_cost_month' => 0,
            'max_ai_units_month' => 0,
            'max_rag_documents_month' => 0,
            'max_audio_minutes_month' => 0,
            'max_image_analyses_month' => 0,
            'gpt4o_enabled' => false,
            'max_storage_mb' => 1024,
        ],
        'ia_sdr' => [
            'max_leads_month' => 2000,
            'max_users' => 10,
            'max_channels' => 3,
            'max_ai_messages_month' => 24000,
            'max_ai_cost_month' => 100.00,
            'max_ai_units_month' => 2500,
            'max_rag_documents_month' => 10,
            'max_audio_minutes_month' => 120,
            'max_image_analyses_month' => 50,
            'gpt4o_enabled' => false,
            'max_storage_mb' => 5120,
        ],
        'enterprise' => [
            'max_leads_month' => 10000,
            'max_users' => 999,
            'max_channels' => 999,
            'max_ai_messages_month' => 999999,
            'max_ai_cost_month' => 500.00,
            'max_ai_units_month' => 10000,
            'max_rag_documents_month' => 100,
            'max_audio_minutes_month' => 500,
            'max_image_analyses_month' => 300,
            'gpt4o_enabled' => true,
            'max_storage_mb' => 20480,
        ],
        
        // NOVOS PLANOS (documento PLANOS_E_PRECIFICACAO_IA.md)
        'essencial' => [
            'max_leads_month' => 1000,
            'max_users' => 3,
            'max_channels' => 2,
            'max_ai_messages_month' => 0,
            'max_ai_cost_month' => 0,
            'max_ai_units_month' => 0,         // Sem IA inclusa (add-on)
            'max_rag_documents_month' => 0,
            'max_audio_minutes_month' => 0,
            'max_image_analyses_month' => 0,
            'gpt4o_enabled' => false,
            'max_storage_mb' => 2048,
        ],
        'performance' => [
            'max_leads_month' => 3000,
            'max_users' => 6,
            'max_channels' => 3,
            'max_ai_messages_month' => 50000,
            'max_ai_cost_month' => 150.00,
            'max_ai_units_month' => 2500,      // 2.500 Unidades/mês
            'max_rag_documents_month' => 10,   // 10 docs RAG
            'max_audio_minutes_month' => 120,  // 120 min áudio
            'max_image_analyses_month' => 50,  // 50 análises imagem
            'gpt4o_enabled' => false,          // Só 4o-mini
            'max_storage_mb' => 5120,
        ],
        'growth' => [
            'max_leads_month' => 5000,
            'max_users' => 10,
            'max_channels' => 5,
            'max_ai_messages_month' => 100000,
            'max_ai_cost_month' => 300.00,
            'max_ai_units_month' => 4500,      // 4.500 Unidades/mês
            'max_rag_documents_month' => 30,   // 30 docs RAG
            'max_audio_minutes_month' => 300,  // 300 min áudio
            'max_image_analyses_month' => 150, // 150 análises imagem
            'gpt4o_enabled' => true,           // GPT-4o habilitado (peso 12x)
            'max_storage_mb' => 10240,
        ],
    ];

    /**
     * Preços dos planos (BRL)
     */
    public const PLAN_PRICES = [
        // Antigos
        'basic' => 147.00,
        'ia_sdr' => 497.00,
        'enterprise' => 1297.00,
        // Novos
        'essencial' => 800.00,
        'performance' => 1399.00,
        'growth' => 1899.00,
    ];

    /**
     * Preços de extras (BRL)
     */
    public const EXTRA_PRICES = [
        'lead' => 0.05,           // Por lead extra
        'user_basic' => 39.00,    // Usuário extra no Basic
        'user_ia_sdr' => 29.00,   // Usuário extra no IA SDR
        'user_essencial' => 49.00,
        'user_performance' => 39.00,
        'user_growth' => 29.00,
        'channel' => 49.00,       // Canal extra
        'storage_5gb' => 29.00,   // 5GB de storage
    ];

    /**
     * Cria quota para novo tenant baseado no plano
     */
    public static function createForTenant(Tenant $tenant): self
    {
        $defaults = self::PLAN_DEFAULTS[$tenant->plan->value] ?? self::PLAN_DEFAULTS['essencial'];

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
        $defaults = self::PLAN_DEFAULTS[$newPlan->value] ?? self::PLAN_DEFAULTS['essencial'];
        
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

    /**
     * Retorna total de Unidades disponíveis (franquia + bônus)
     */
    public function getTotalAiUnitsAvailable(): int
    {
        return $this->max_ai_units_month + $this->bonus_ai_units;
    }

    /**
     * Adiciona Unidades bônus (ao comprar pacote)
     */
    public function addBonusUnits(int $units): void
    {
        $this->increment('bonus_ai_units', $units);
    }

    /**
     * Verifica se pode usar modelo GPT-4o
     */
    public function canUseGpt4o(): bool
    {
        return $this->gpt4o_enabled;
    }

    /**
     * Verifica se pode processar mais documentos RAG
     */
    public function canProcessRagDocument(): bool
    {
        if ($this->max_rag_documents_month <= 0) {
            return false;
        }

        $stats = TenantUsageStats::getCurrentMonth($this->tenant_id);
        return $stats->rag_documents_processed < $this->max_rag_documents_month;
    }

    /**
     * Verifica se pode transcrever mais áudio
     */
    public function canUseAudio(int $minutes = 1): bool
    {
        if ($this->max_audio_minutes_month <= 0) {
            return false;
        }

        $stats = TenantUsageStats::getCurrentMonth($this->tenant_id);
        return ($stats->audio_minutes_used + $minutes) <= $this->max_audio_minutes_month;
    }

    /**
     * Verifica se pode analisar mais imagens
     */
    public function canAnalyzeImage(): bool
    {
        if ($this->max_image_analyses_month <= 0) {
            return false;
        }

        $stats = TenantUsageStats::getCurrentMonth($this->tenant_id);
        return $stats->image_analyses_used < $this->max_image_analyses_month;
    }
}
