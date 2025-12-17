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
     * Mapa de sub-funções disponíveis por módulo.
     * Cada módulo pode ter várias sub-funções que podem ser habilitadas individualmente.
     */
    public static function getModuleFunctions(): array
    {
        return [
            'ads_intelligence' => [
                'ads.dashboard' => ['name' => 'Dashboard Ads', 'description' => 'Visão geral de campanhas e métricas'],
                'ads.create_campaign' => ['name' => 'Criar Campanha (IA)', 'description' => 'Criar campanhas com assistente IA'],
                'ads.chat' => ['name' => 'Chat com Agente', 'description' => 'Conversar com agente de Ads'],
                'ads.creatives' => ['name' => 'Criativos', 'description' => 'Gerenciar imagens e vídeos'],
                'ads.campaigns' => ['name' => 'Campanhas', 'description' => 'Listar e visualizar campanhas'],
                'ads.insights' => ['name' => 'Insights IA', 'description' => 'Insights gerados pela IA'],
                'ads.automation' => ['name' => 'Automações', 'description' => 'Regras de automação'],
                'ads.knowledge' => ['name' => 'Base de Conhecimento', 'description' => 'Documentos e referências'],
                'ads.guardrails' => ['name' => 'Guardrails', 'description' => 'Regras de controle'],
                'ads.accounts' => ['name' => 'Contas de Anúncio', 'description' => 'Gerenciar contas Meta/Google'],
            ],
            'sdr_ia' => [
                'sdr.agents' => ['name' => 'Agentes IA', 'description' => 'Gerenciar agentes SDR'],
                'sdr.documents' => ['name' => 'Documentos', 'description' => 'Base de conhecimento dos agentes'],
                'sdr.faqs' => ['name' => 'FAQs', 'description' => 'Perguntas frequentes'],
                'sdr.rules' => ['name' => 'Regras', 'description' => 'Regras de estágio e escalação'],
            ],
            'bi_agent' => [
                'bi.dashboard' => ['name' => 'Dashboard BI', 'description' => 'Visão geral de Business Intelligence'],
                'bi.analyst' => ['name' => 'Analista IA', 'description' => 'Chat com analista de BI'],
                'bi.actions' => ['name' => 'Ações Pendentes', 'description' => 'Fila de aprovação de ações'],
                'bi.reports' => ['name' => 'Relatórios', 'description' => 'Relatórios detalhados'],
                'bi.settings' => ['name' => 'Configurações', 'description' => 'Configurações do BI Agent'],
            ],
            'landing_pages' => [
                'lp.list' => ['name' => 'Listar Pages', 'description' => 'Visualizar landing pages'],
                'lp.create' => ['name' => 'Criar Pages', 'description' => 'Criar novas landing pages'],
                'lp.publish' => ['name' => 'Publicar', 'description' => 'Publicar landing pages'],
            ],
            'appointments' => [
                'appointments.list' => ['name' => 'Ver Agendamentos', 'description' => 'Listar agendamentos'],
                'appointments.create' => ['name' => 'Criar Agendamentos', 'description' => 'Criar novos agendamentos'],
                'appointments.schedule' => ['name' => 'Minha Agenda', 'description' => 'Gerenciar agenda pessoal'],
            ],
            'groups' => [
                'groups.view' => ['name' => 'Ver Grupos', 'description' => 'Visualizar grupos/franquias'],
                'groups.manage' => ['name' => 'Gerenciar Grupos', 'description' => 'Gerenciar tenants do grupo'],
                'groups.reports' => ['name' => 'Relatórios de Grupo', 'description' => 'Relatórios consolidados'],
            ],
            'products' => [
                'products.list' => ['name' => 'Listar Produtos', 'description' => 'Visualizar produtos'],
                'products.create' => ['name' => 'Criar Produtos', 'description' => 'Criar e editar produtos'],
                'products.categories' => ['name' => 'Categorias', 'description' => 'Gerenciar categorias'],
            ],
            'viral_content' => [
                'viral.dashboard' => ['name' => 'Dashboard', 'description' => 'Visão geral do Content Creator'],
                'viral.analyze' => ['name' => 'Analisar Vídeo', 'description' => 'Analisar estrutura de vídeo viral'],
                'viral.generate' => ['name' => 'Gerar Roteiro', 'description' => 'Criar roteiros virais com IA'],
                'viral.auto_discover' => ['name' => 'Auto-Descoberta', 'description' => 'Buscar vídeos virais e gerar roteiros automaticamente'],
            ],
        ];
    }

    /**
     * Verifica se um tenant tem acesso a uma sub-função específica de um módulo.
     */
    public static function tenantHasFunction(string $tenantId, string $featureKey, string $functionKey): bool
    {
        $feature = static::where('tenant_id', $tenantId)
            ->where('feature_key', $featureKey)
            ->where('is_enabled', true)
            ->first();

        if (!$feature) {
            return false;
        }

        $config = $feature->config ?? [];

        // Se all_functions = true (ou não definido), tem acesso a tudo
        if ($config['all_functions'] ?? true) {
            return true;
        }

        // Verifica na lista de funções habilitadas
        $enabledFunctions = $config['enabled_functions'] ?? [];
        return in_array($functionKey, $enabledFunctions);
    }

    /**
     * Retorna as sub-funções habilitadas de um módulo para um tenant.
     */
    public static function getTenantModuleFunctions(string $tenantId, string $featureKey): array
    {
        $feature = static::where('tenant_id', $tenantId)
            ->where('feature_key', $featureKey)
            ->where('is_enabled', true)
            ->first();

        if (!$feature) {
            return [];
        }

        $config = $feature->config ?? [];
        $allFunctions = static::getModuleFunctions()[$featureKey] ?? [];

        // Se all_functions = true (ou não definido), retorna todas
        if ($config['all_functions'] ?? true) {
            return array_keys($allFunctions);
        }

        return $config['enabled_functions'] ?? [];
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
     *
     * @param string $tenantId ID do tenant
     * @param string $featureKey Chave da feature (ex: 'ads_intelligence')
     * @param array $config Configuração opcional com:
     *   - all_functions: bool (true = todas as funções, false = apenas as selecionadas)
     *   - enabled_functions: array de strings (funções habilitadas quando all_functions = false)
     */
    public static function enableForTenant(string $tenantId, string $featureKey, array $config = []): self
    {
        // Garantir estrutura do config para compatibilidade
        if (!isset($config['all_functions']) && !isset($config['enabled_functions'])) {
            $config['all_functions'] = true; // Padrão: libera todas as funções
        }

        // Se especificou enabled_functions mas não all_functions, definir como false
        if (isset($config['enabled_functions']) && !isset($config['all_functions'])) {
            $config['all_functions'] = false;
        }

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
     * Retorna todas as features de um tenant com suas sub-funções.
     */
    public static function getTenantFeatures(string $tenantId): array
    {
        $enabledFeatures = static::where('tenant_id', $tenantId)
            ->where('is_enabled', true)
            ->get()
            ->keyBy('feature_key');

        $allFeatures = static::getAvailableFeatures();
        $moduleFunctions = static::getModuleFunctions();

        $result = [];
        foreach ($allFeatures as $key => $feature) {
            $tenantFeature = $enabledFeatures->get($key);
            $isEnabled = $tenantFeature !== null;

            $enabledFunctions = [];
            $allFunctionsEnabled = true;

            if ($isEnabled) {
                $config = $tenantFeature->config ?? [];
                $allFunctionsEnabled = $config['all_functions'] ?? true;

                if ($allFunctionsEnabled) {
                    // Todas as funções habilitadas
                    $enabledFunctions = array_keys($moduleFunctions[$key] ?? []);
                } else {
                    // Apenas funções específicas
                    $enabledFunctions = $config['enabled_functions'] ?? [];
                }
            }

            $result[$key] = array_merge($feature, [
                'is_enabled' => $isEnabled,
                'all_functions' => $allFunctionsEnabled,
                'enabled_functions' => $enabledFunctions,
                'available_functions' => $moduleFunctions[$key] ?? [],
            ]);
        }

        return $result;
    }
}

