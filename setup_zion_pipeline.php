<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\SdrAgent;
use App\Models\Pipeline;
use App\Models\PipelineStage;

echo "=== Configurando Zion para Pipeline de Suporte ===\n\n";

// 1. Buscar Zion
$zion = SdrAgent::where('name', 'Zion')->first();
if (!$zion) {
    echo "ERRO: Agente Zion não encontrado!\n";
    exit(1);
}
echo "✓ Zion encontrado (ID: {$zion->id})\n";
echo "  - Tipo atual: {$zion->type}\n";
echo "  - can_move_leads: " . ($zion->can_move_leads ? 'true' : 'false') . "\n";

// 2. Buscar ou criar Pipeline Suporte Técnico
$pipeline = Pipeline::where('name', 'Suporte Técnico')
    ->where('tenant_id', $zion->tenant_id)
    ->first();

if (!$pipeline) {
    echo "Pipeline não encontrado. Criando...\n";

    $pipeline = Pipeline::create([
        'tenant_id' => $zion->tenant_id,
        'name' => 'Suporte Técnico',
        'description' => 'Atendimento de suporte e resolução de bugs',
        'is_default' => false,
    ]);

    $stagesData = [
        ['name' => 'Nova Solicitação', 'slug' => 'nova-solicitacao', 'order' => 0, 'color' => '#3B82F6', 'type' => 'open'],
        ['name' => 'Em Análise', 'slug' => 'em-analise', 'order' => 1, 'color' => '#8B5CF6', 'type' => 'open'],
        ['name' => 'Aguardando Correção', 'slug' => 'aguardando-correcao', 'order' => 2, 'color' => '#F59E0B', 'type' => 'open'],
        ['name' => 'Aguardando Teste', 'slug' => 'aguardando-teste', 'order' => 3, 'color' => '#EC4899', 'type' => 'open'],
        ['name' => 'Resolvido', 'slug' => 'resolvido', 'order' => 4, 'color' => '#10B981', 'type' => 'won'],
        ['name' => 'Escalado', 'slug' => 'escalado', 'order' => 5, 'color' => '#EF4444', 'type' => 'open'],
    ];

    foreach ($stagesData as $stageData) {
        PipelineStage::create([
            'tenant_id' => $zion->tenant_id,
            'pipeline_id' => $pipeline->id,
            'name' => $stageData['name'],
            'slug' => $stageData['slug'],
            'order' => $stageData['order'],
            'color' => $stageData['color'],
            'type' => $stageData['type'],
        ]);
    }

    echo "✓ Pipeline 'Suporte Técnico' criado com 6 estágios!\n";
} else {
    echo "✓ Pipeline encontrado (ID: {$pipeline->id})\n";
}

// Mostrar estágios
$stages = PipelineStage::where('pipeline_id', $pipeline->id)->orderBy('order')->get();
echo "  Estágios:\n";
foreach ($stages as $stage) {
    echo "    - {$stage->name} (order: {$stage->order}, type: {$stage->type})\n";
}

// 3. Associar ao Pipeline (se não existir)
if ($zion->pipelines()->where('pipeline_id', $pipeline->id)->exists()) {
    echo "\n! Zion já está associado ao pipeline.\n";
} else {
    $zion->pipelines()->attach($pipeline->id, [
        'is_primary' => true,
        'tenant_id' => $zion->tenant_id,
    ]);
    echo "\n✓ Zion associado ao Pipeline Suporte Técnico (is_primary: true)\n";
}

// 4. Atualizar tipo e can_move_leads
$stageRules = [];
foreach ($stages as $stage) {
    $triggers = [
        'nova-solicitacao' => 'Cliente iniciou conversa ou fez nova solicitação',
        'em-analise' => 'Cliente relatou bug ou problema técnico',
        'aguardando-correcao' => 'Bug identificado, correção em andamento',
        'aguardando-teste' => 'Correção aplicada, cliente deve testar',
        'resolvido' => 'Cliente confirmou que problema foi resolvido',
        'escalado' => 'Problema precisa de intervenção humana',
    ];
    $stageRules[$stage->id] = [
        'trigger' => $triggers[$stage->slug] ?? 'Mover quando apropriado',
        'action' => 'Informar cliente sobre mudança de status',
    ];
}

$zion->update([
    'type' => 'support',
    'can_move_leads' => true,
    'stage_rules' => $stageRules,
]);

echo "✓ Tipo atualizado: sdr → support\n";
echo "✓ can_move_leads: true\n";
echo "✓ stage_rules configurados\n";

// 5. Verificação final
$zion->refresh();
echo "\n=== Configuração Final ===\n";
echo "Nome: {$zion->name}\n";
echo "Tipo: {$zion->type}\n";
echo "can_move_leads: " . ($zion->can_move_leads ? 'true' : 'false') . "\n";
echo "Pipelines: " . $zion->pipelines()->count() . "\n";
echo "Pipeline primário: " . ($zion->primaryPipeline()?->name ?? 'Nenhum') . "\n";

echo "\n✅ Zion configurado com sucesso para Suporte Técnico!\n";
