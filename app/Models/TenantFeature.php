<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantFeature extends Model
{
    use HasUuids;

    protected $fillable = [
        'tenant_id',
        'feature_key',
        'is_enabled',
        'config',
        'enabled_at',
        'disabled_at',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'config' => 'array',
        'enabled_at' => 'datetime',
        'disabled_at' => 'datetime',
    ];

    /**
     * Tenant dono da feature.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Lista de features disponíveis no sistema.
     */
    public static function getAvailableFeatures(): array
    {
        return [
            'sdr_ia' => [
                'name' => 'SDR com IA',
                'description' => 'Agente de vendas automatizado com inteligência artificial',
                'icon' => 'bot',
            ],
            'landing_pages' => [
                'name' => 'Landing Pages',
                'description' => 'Criação de páginas de captura de leads',
                'icon' => 'layout',
            ],
            'whatsapp' => [
                'name' => 'WhatsApp Business',
                'description' => 'Integração com WhatsApp Business API',
                'icon' => 'message-square',
            ],
            'instagram' => [
                'name' => 'Instagram DM',
                'description' => 'Integração com Instagram Direct Messages',
                'icon' => 'instagram',
            ],
            'appointments' => [
                'name' => 'Agendamentos',
                'description' => 'Sistema de agendamento de reuniões',
                'icon' => 'calendar',
            ],
            'reports_advanced' => [
                'name' => 'Relatórios Avançados',
                'description' => 'Relatórios detalhados e analytics',
                'icon' => 'bar-chart',
            ],
            'automation' => [
                'name' => 'Automações',
                'description' => 'Workflows e automações personalizadas',
                'icon' => 'zap',
            ],
            'api_access' => [
                'name' => 'Acesso à API',
                'description' => 'Acesso à API para integrações customizadas',
                'icon' => 'code',
            ],
            'multi_pipeline' => [
                'name' => 'Múltiplos Pipelines',
                'description' => 'Criar múltiplos funis de vendas',
                'icon' => 'git-branch',
            ],
            'products' => [
                'name' => 'Catálogo de Produtos',
                'description' => 'Gerenciamento de produtos e serviços',
                'icon' => 'package',
            ],
            'groups' => [
                'name' => 'Grupos/Franquias',
                'description' => 'Gerenciamento de múltiplas unidades',
                'icon' => 'users',
            ],
            'ads_intelligence' => [
                'name' => 'Ads Intelligence',
                'description' => 'Gestão inteligente de campanhas Meta/Google Ads com automação',
                'icon' => 'trending-up',
            ],
            'bi_agent' => [
                'name' => 'BI Agent',
                'description' => 'Analista de Business Intelligence com previsão de Churn e LTV',
                'icon' => 'pie-chart',
            ],
            'viral_content' => [
                'name' => 'Viral Content Creator',
                'description' => 'IA para criação de roteiros virais baseados em tendências',
                'icon' => 'video',
            ],
        ];
    }

    /**
     * Ativa uma feature para um tenant.
     */
    public static function enableForTenant(string $tenantId, string $featureKey, array $config = []): self
    {
        return static::updateOrCreate(
            ['tenant_id' => $tenantId, 'feature_key' => $featureKey],
            [
                'is_enabled' => true,
                'config' => $config,
                'enabled_at' => now(),
                'disabled_at' => null,
            ]
        );
    }

    /**
     * Desativa uma feature para um tenant.
     */
    public static function disableForTenant(string $tenantId, string $featureKey): self
    {
        return static::updateOrCreate(
            ['tenant_id' => $tenantId, 'feature_key' => $featureKey],
            [
                'is_enabled' => false,
                'disabled_at' => now(),
            ]
        );
    }

    /**
     * Verifica se um tenant tem uma feature habilitada.
     */
    public static function tenantHasFeature(string $tenantId, string $featureKey): bool
    {
        return static::where('tenant_id', $tenantId)
            ->where('feature_key', $featureKey)
            ->where('is_enabled', true)
            ->exists();
    }

    /**
     * Retorna todas as features de um tenant.
     */
    public static function getTenantFeatures(string $tenantId): array
    {
        $enabledFeatures = static::where('tenant_id', $tenantId)
            ->where('is_enabled', true)
            ->pluck('feature_key')
            ->toArray();

        $allFeatures = static::getAvailableFeatures();

        $result = [];
        foreach ($allFeatures as $key => $feature) {
            $result[$key] = array_merge($feature, [
                'is_enabled' => in_array($key, $enabledFeatures),
            ]);
        }

        return $result;
    }
}

