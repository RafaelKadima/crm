<?php

namespace App\Services;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Tenant;

class DefaultPipelineService
{
    /**
     * Pipelines e estágios padrão do sistema.
     */
    public static function getDefaultPipelines(): array
    {
        return [
            [
                'name' => 'Vendas',
                'description' => 'Pipeline principal de vendas',
                'is_default' => true,
                'stages' => [
                    ['name' => 'Novo Lead', 'slug' => 'novo-lead', 'color' => '#6366F1', 'order' => 1],
                    ['name' => 'Qualificação', 'slug' => 'qualificacao', 'color' => '#8B5CF6', 'order' => 2],
                    ['name' => 'Apresentação', 'slug' => 'apresentacao', 'color' => '#EC4899', 'order' => 3],
                    ['name' => 'Proposta', 'slug' => 'proposta', 'color' => '#F59E0B', 'order' => 4],
                    ['name' => 'Negociação', 'slug' => 'negociacao', 'color' => '#F97316', 'order' => 5],
                    ['name' => 'Fechamento', 'slug' => 'fechamento', 'color' => '#10B981', 'order' => 6],
                    ['name' => 'Perdido', 'slug' => 'perdido', 'color' => '#EF4444', 'order' => 7],
                ],
            ],
            [
                'name' => 'Pós-Venda',
                'description' => 'Acompanhamento de clientes após a venda',
                'is_default' => false,
                'stages' => [
                    ['name' => 'Onboarding', 'slug' => 'onboarding', 'color' => '#3B82F6', 'order' => 1],
                    ['name' => 'Implementação', 'slug' => 'implementacao', 'color' => '#6366F1', 'order' => 2],
                    ['name' => 'Treinamento', 'slug' => 'treinamento', 'color' => '#8B5CF6', 'order' => 3],
                    ['name' => 'Suporte Inicial', 'slug' => 'suporte-inicial', 'color' => '#EC4899', 'order' => 4],
                    ['name' => 'Acompanhamento', 'slug' => 'acompanhamento', 'color' => '#F59E0B', 'order' => 5],
                    ['name' => 'Sucesso', 'slug' => 'sucesso', 'color' => '#10B981', 'order' => 6],
                ],
            ],
        ];
    }

    /**
     * Cria os pipelines padrão para um tenant.
     */
    public static function createForTenant(Tenant $tenant): array
    {
        $createdPipelines = [];

        foreach (self::getDefaultPipelines() as $pipelineData) {
            $stages = $pipelineData['stages'];
            unset($pipelineData['stages']);

            // Criar pipeline
            $pipeline = Pipeline::create([
                'tenant_id' => $tenant->id,
                'name' => $pipelineData['name'],
                'description' => $pipelineData['description'] ?? null,
                'is_default' => $pipelineData['is_default'] ?? false,
            ]);

            // Criar estágios
            foreach ($stages as $stageData) {
                PipelineStage::create([
                    'tenant_id' => $tenant->id,
                    'pipeline_id' => $pipeline->id,
                    'name' => $stageData['name'],
                    'slug' => $stageData['slug'],
                    'color' => $stageData['color'],
                    'order' => $stageData['order'],
                ]);
            }

            $createdPipelines[] = $pipeline;
        }

        return $createdPipelines;
    }

    /**
     * Verifica se o tenant já tem pipelines criados.
     */
    public static function tenantHasPipelines(Tenant $tenant): bool
    {
        return Pipeline::where('tenant_id', $tenant->id)->exists();
    }

    /**
     * Cria apenas o pipeline padrão (versão simplificada).
     */
    public static function createDefaultPipeline(Tenant $tenant): Pipeline
    {
        $defaultPipeline = self::getDefaultPipelines()[0]; // Pipeline de Vendas
        $stages = $defaultPipeline['stages'];

        $pipeline = Pipeline::create([
            'tenant_id' => $tenant->id,
            'name' => $defaultPipeline['name'],
            'description' => $defaultPipeline['description'],
            'is_default' => true,
        ]);

        foreach ($stages as $stageData) {
            PipelineStage::create([
                'tenant_id' => $tenant->id,
                'pipeline_id' => $pipeline->id,
                'name' => $stageData['name'],
                'slug' => $stageData['slug'],
                'color' => $stageData['color'],
                'order' => $stageData['order'],
            ]);
        }

        return $pipeline;
    }
}

