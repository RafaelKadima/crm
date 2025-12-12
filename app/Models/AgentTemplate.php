<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Templates pré-configurados de agentes SDR.
 * Facilitam a criação de novos agentes com configurações otimizadas.
 */
class AgentTemplate extends Model
{
    use HasFactory, HasUuids;

    // Categorias disponíveis
    public const CATEGORY_SALES = 'sales';
    public const CATEGORY_SUPPORT = 'support';
    public const CATEGORY_ONBOARDING = 'onboarding';
    public const CATEGORY_POST_SALES = 'post_sales';
    public const CATEGORY_REACTIVATION = 'reactivation';

    protected $fillable = [
        'name',
        'category',
        'description',
        'system_prompt',
        'personality',
        'objectives',
        'restrictions',
        'pipeline_instructions',
        'recommended_stages',
        'example_rules',
        'settings',
        'icon',
        'color',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'recommended_stages' => 'array',
            'example_rules' => 'array',
            'settings' => 'array',
            'is_active' => 'boolean',
        ];
    }

    // ==================== SCOPES ====================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    // ==================== MÉTODOS ====================

    /**
     * Cria um novo agente a partir deste template
     */
    public function createAgent(string $tenantId, array $customizations = []): SdrAgent
    {
        $data = array_merge([
            'tenant_id' => $tenantId,
            'name' => $customizations['name'] ?? $this->name,
            'description' => $this->description,
            'system_prompt' => $this->system_prompt,
            'personality' => $this->personality,
            'objectives' => $this->objectives,
            'restrictions' => $this->restrictions,
            'pipeline_instructions' => $this->pipeline_instructions,
            'settings' => array_merge($this->settings ?? [], $customizations['settings'] ?? []),
            'language' => $customizations['language'] ?? 'pt-BR',
            'tone' => $customizations['tone'] ?? 'professional',
            'ai_model' => $customizations['ai_model'] ?? 'gpt-4o-mini',
            'temperature' => $customizations['temperature'] ?? 0.7,
            'is_active' => true,
        ], $customizations);

        return SdrAgent::create($data);
    }

    /**
     * Aplica o template a um agente existente
     */
    public function applyToAgent(SdrAgent $agent, bool $overwrite = false): SdrAgent
    {
        $fields = [
            'system_prompt',
            'personality',
            'objectives',
            'restrictions',
            'pipeline_instructions',
        ];

        foreach ($fields as $field) {
            if ($overwrite || empty($agent->$field)) {
                $agent->$field = $this->$field;
            }
        }

        // Merge settings
        $agent->settings = array_merge(
            $agent->settings ?? [],
            $this->settings ?? []
        );

        $agent->save();

        return $agent;
    }

    /**
     * Retorna todas as categorias disponíveis
     */
    public static function getCategories(): array
    {
        return [
            self::CATEGORY_SALES => [
                'name' => 'Vendas',
                'description' => 'Agentes focados em qualificação e conversão de leads',
                'icon' => '💼',
            ],
            self::CATEGORY_SUPPORT => [
                'name' => 'Suporte',
                'description' => 'Agentes para atendimento e resolução de problemas',
                'icon' => '🎧',
            ],
            self::CATEGORY_ONBOARDING => [
                'name' => 'Onboarding',
                'description' => 'Agentes para integração de novos clientes',
                'icon' => '🚀',
            ],
            self::CATEGORY_POST_SALES => [
                'name' => 'Pós-venda',
                'description' => 'Agentes para sucesso do cliente e renovações',
                'icon' => '🤝',
            ],
            self::CATEGORY_REACTIVATION => [
                'name' => 'Reativação',
                'description' => 'Agentes para recuperar clientes inativos',
                'icon' => '🔄',
            ],
        ];
    }

    /**
     * Retorna o ícone da categoria
     */
    public function getCategoryIcon(): string
    {
        return self::getCategories()[$this->category]['icon'] ?? '🤖';
    }

    /**
     * Retorna o nome legível da categoria
     */
    public function getCategoryName(): string
    {
        return self::getCategories()[$this->category]['name'] ?? $this->category;
    }
}




