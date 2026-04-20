<?php

namespace Database\Seeders;

use App\Enums\FunnelCategoryEnum;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class PipelineSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::where('slug', 'empresa-demo')->first();

        if (!$tenant) {
            $this->command->error('Tenant "empresa-demo" não encontrado.');
            return;
        }

        // Pipeline de Vendas Principal — 6 estágios, cobre o funil gerencial inteiro.
        $pipeline = Pipeline::create([
            'tenant_id' => $tenant->id,
            'name' => 'Funil de Vendas',
            'description' => 'Funil principal de vendas',
            'is_default' => true,
        ]);

        $stages = [
            ['name' => 'Novo Lead',     'order' => 0, 'color' => '#3B82F6', 'gtm' => 'lead_new',           'type' => 'open', 'funnel' => FunnelCategoryEnum::ARRIVED,      'probability' => 5],
            ['name' => 'Qualificação',  'order' => 1, 'color' => '#8B5CF6', 'gtm' => 'lead_qualification', 'type' => 'open', 'funnel' => FunnelCategoryEnum::QUALIFIED,    'probability' => 15],
            ['name' => 'Apresentação',  'order' => 2, 'color' => '#F59E0B', 'gtm' => 'lead_presentation',  'type' => 'open', 'funnel' => FunnelCategoryEnum::MEETING_DONE, 'probability' => 35],
            ['name' => 'Proposta',      'order' => 3, 'color' => '#EF4444', 'gtm' => 'lead_proposal',      'type' => 'open', 'funnel' => FunnelCategoryEnum::PROPOSAL,     'probability' => 55],
            ['name' => 'Negociação',    'order' => 4, 'color' => '#EC4899', 'gtm' => 'lead_negotiation',   'type' => 'open', 'funnel' => FunnelCategoryEnum::NEGOTIATION,  'probability' => 75],
            ['name' => 'Fechamento',    'order' => 5, 'color' => '#10B981', 'gtm' => 'lead_closing',       'type' => 'won',  'funnel' => FunnelCategoryEnum::WON,          'probability' => 100],
        ];

        foreach ($stages as $stage) {
            PipelineStage::create([
                'tenant_id' => $tenant->id,
                'pipeline_id' => $pipeline->id,
                'name' => $stage['name'],
                'order' => $stage['order'],
                'color' => $stage['color'],
                'gtm_event_key' => $stage['gtm'],
                'stage_type' => $stage['type'],
                'funnel_category' => $stage['funnel'],
                'probability' => $stage['probability'],
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
            ['name' => 'Onboarding',     'order' => 0, 'color' => '#3B82F6'],
            ['name' => 'Acompanhamento', 'order' => 1, 'color' => '#8B5CF6'],
            ['name' => 'Upsell',         'order' => 2, 'color' => '#F59E0B'],
            ['name' => 'Renovação',      'order' => 3, 'color' => '#10B981'],
        ];

        foreach ($stagesPosVenda as $stage) {
            PipelineStage::create([
                'tenant_id' => $tenant->id,
                'pipeline_id' => $pipelinePosVenda->id,
                'name' => $stage['name'],
                'order' => $stage['order'],
                'color' => $stage['color'],
            ]);
        }

        // Pipeline de Suporte Técnico
        $pipelineSuporte = Pipeline::create([
            'tenant_id' => $tenant->id,
            'name' => 'Suporte Técnico',
            'description' => 'Atendimento de suporte e resolução de bugs',
            'is_default' => false,
        ]);

        $stagesSuporte = [
            ['name' => 'Nova Solicitação',     'order' => 0, 'color' => '#3B82F6', 'type' => 'open', 'gtm' => 'support_new'],
            ['name' => 'Em Análise',           'order' => 1, 'color' => '#8B5CF6', 'type' => 'open', 'gtm' => 'support_analysis'],
            ['name' => 'Aguardando Correção',  'order' => 2, 'color' => '#F59E0B', 'type' => 'open', 'gtm' => 'support_fixing'],
            ['name' => 'Aguardando Teste',     'order' => 3, 'color' => '#EC4899', 'type' => 'open', 'gtm' => 'support_testing'],
            ['name' => 'Resolvido',            'order' => 4, 'color' => '#10B981', 'type' => 'won',  'gtm' => 'support_resolved'],
            ['name' => 'Escalado',             'order' => 5, 'color' => '#EF4444', 'type' => 'open', 'gtm' => 'support_escalated'],
        ];

        foreach ($stagesSuporte as $stage) {
            PipelineStage::create([
                'tenant_id' => $tenant->id,
                'pipeline_id' => $pipelineSuporte->id,
                'name' => $stage['name'],
                'order' => $stage['order'],
                'color' => $stage['color'],
                'stage_type' => $stage['type'],
                'gtm_event_key' => $stage['gtm'],
            ]);
        }
    }
}
