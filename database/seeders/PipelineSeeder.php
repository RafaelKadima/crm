<?php

namespace Database\Seeders;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class PipelineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'empresa-demo')->first();

        if (!$tenant) {
            $this->command->error('Tenant "empresa-demo" não encontrado.');
            return;
        }

        // Pipeline de Vendas Principal
        $pipeline = Pipeline::create([
            'tenant_id' => $tenant->id,
            'name' => 'Funil de Vendas',
            'description' => 'Funil principal de vendas',
            'is_default' => true,
        ]);

        // Estágios do funil
        $stages = [
            ['name' => 'Novo Lead', 'slug' => 'novo-lead', 'order' => 0, 'color' => '#3B82F6', 'gtm_event' => 'lead_new'],
            ['name' => 'Qualificação', 'slug' => 'qualificacao', 'order' => 1, 'color' => '#8B5CF6', 'gtm_event' => 'lead_qualification'],
            ['name' => 'Apresentação', 'slug' => 'apresentacao', 'order' => 2, 'color' => '#F59E0B', 'gtm_event' => 'lead_presentation'],
            ['name' => 'Proposta', 'slug' => 'proposta', 'order' => 3, 'color' => '#EF4444', 'gtm_event' => 'lead_proposal'],
            ['name' => 'Negociação', 'slug' => 'negociacao', 'order' => 4, 'color' => '#EC4899', 'gtm_event' => 'lead_negotiation'],
            ['name' => 'Fechamento', 'slug' => 'fechamento', 'order' => 5, 'color' => '#10B981', 'gtm_event' => 'lead_closing'],
        ];

        foreach ($stages as $stage) {
            PipelineStage::create([
                'tenant_id' => $tenant->id,
                'pipeline_id' => $pipeline->id,
                'name' => $stage['name'],
                'slug' => $stage['slug'],
                'order' => $stage['order'],
                'color' => $stage['color'],
                'gtm_event_key' => $stage['gtm_event'],
            ]);
        }

        // Pipeline de Pós-Venda
        $pipelinePosVenda = Pipeline::create([
            'tenant_id' => $tenant->id,
            'name' => 'Pós-Venda',
            'description' => 'Acompanhamento de clientes',
            'is_default' => false,
        ]);

        $stagesPosVenda = [
            ['name' => 'Onboarding', 'slug' => 'onboarding', 'order' => 0, 'color' => '#3B82F6'],
            ['name' => 'Acompanhamento', 'slug' => 'acompanhamento', 'order' => 1, 'color' => '#8B5CF6'],
            ['name' => 'Upsell', 'slug' => 'upsell', 'order' => 2, 'color' => '#F59E0B'],
            ['name' => 'Renovação', 'slug' => 'renovacao', 'order' => 3, 'color' => '#10B981'],
        ];

        foreach ($stagesPosVenda as $stage) {
            PipelineStage::create([
                'tenant_id' => $tenant->id,
                'pipeline_id' => $pipelinePosVenda->id,
                'name' => $stage['name'],
                'slug' => $stage['slug'],
                'order' => $stage['order'],
                'color' => $stage['color'],
            ]);
        }

        // Pipeline de Suporte Técnico (para Support Agent)
        $pipelineSuporte = Pipeline::create([
            'tenant_id' => $tenant->id,
            'name' => 'Suporte Técnico',
            'description' => 'Atendimento de suporte e resolução de bugs',
            'is_default' => false,
        ]);

        $stagesSuporte = [
            ['name' => 'Nova Solicitação', 'slug' => 'nova-solicitacao', 'order' => 0, 'color' => '#3B82F6', 'gtm_event' => 'support_new'],
            ['name' => 'Em Análise', 'slug' => 'em-analise', 'order' => 1, 'color' => '#8B5CF6', 'gtm_event' => 'support_analysis'],
            ['name' => 'Aguardando Correção', 'slug' => 'aguardando-correcao', 'order' => 2, 'color' => '#F59E0B', 'gtm_event' => 'support_fixing'],
            ['name' => 'Aguardando Teste', 'slug' => 'aguardando-teste', 'order' => 3, 'color' => '#EC4899', 'gtm_event' => 'support_testing'],
            ['name' => 'Resolvido', 'slug' => 'resolvido', 'order' => 4, 'color' => '#10B981', 'type' => 'won', 'gtm_event' => 'support_resolved'],
            ['name' => 'Escalado', 'slug' => 'escalado', 'order' => 5, 'color' => '#EF4444', 'gtm_event' => 'support_escalated'],
        ];

        foreach ($stagesSuporte as $stage) {
            PipelineStage::create([
                'tenant_id' => $tenant->id,
                'pipeline_id' => $pipelineSuporte->id,
                'name' => $stage['name'],
                'slug' => $stage['slug'],
                'order' => $stage['order'],
                'color' => $stage['color'],
                'type' => $stage['type'] ?? 'open',
                'gtm_event_key' => $stage['gtm_event'] ?? null,
            ]);
        }
    }
}


