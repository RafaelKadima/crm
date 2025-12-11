<?php

// Script para testar Round-Robin
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\Channel;
use App\Services\LeadAssignmentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

// Limpar dados anteriores
DB::statement('SET session_replication_role = replica');
DB::table('lead_queue_owners')->truncate();
DB::table('lead_assignment_logs')->truncate();
DB::table('leads')->truncate();
DB::statement('SET session_replication_role = DEFAULT');

echo "=== TESTE DE ROUND-ROBIN ===\n\n";

// Pegar o pipeline "Funil de Vendas" que tem João e José
$pipeline = Pipeline::where('name', 'Funil de Vendas')->first();
if (!$pipeline) {
    echo "Pipeline 'Funil de Vendas' não encontrado!\n";
    exit(1);
}

echo "Pipeline: {$pipeline->name}\n";

// Verificar usuários elegíveis
$eligibleUserIds = $pipeline->getUserIdsWithLeadPermission();
echo "Usuários elegíveis: " . count($eligibleUserIds) . "\n";

$users = \App\Models\User::whereIn('id', $eligibleUserIds)->get();
foreach ($users as $idx => $user) {
    echo "  [{$idx}] {$user->name} (ID: {$user->id})\n";
}

// Pegar um canal
$channel = Channel::first();
if (!$channel) {
    echo "Nenhum canal encontrado!\n";
    exit(1);
}

echo "\nCanal: {$channel->name}\n";

// Pegar primeiro estágio do pipeline
$stage = $pipeline->stages()->orderBy('order')->first();
if (!$stage) {
    echo "Nenhum estágio encontrado!\n";
    exit(1);
}

echo "Estágio: {$stage->name}\n\n";

// Criar leads de teste
$service = new LeadAssignmentService();

echo "=== CRIANDO 4 LEADS ===\n\n";

for ($i = 1; $i <= 4; $i++) {
    $lead = Lead::create([
        'tenant_id' => $pipeline->tenant_id,
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
        'channel_id' => $channel->id,
        'name' => "Lead Teste {$i}",
        'email' => "lead{$i}@teste.com",
        'phone' => "1199999000{$i}",
    ]);
    
    echo "Lead {$i}: {$lead->name} (ID: {$lead->id})\n";
    
    // Atribuir usando o serviço
    $assignedUser = $service->assignLeadOwner($lead);
    
    echo "  → Atribuído para: {$assignedUser->name}\n";
    
    // Verificar log
    $log = DB::table('lead_assignment_logs')
        ->where('user_id', $assignedUser->id)
        ->first();
    
    if ($log) {
        echo "  → Log criado: last_assigned_at = {$log->last_assigned_at}\n";
    }
    
    echo "\n";
}

// Resumo
echo "=== RESUMO ===\n";
$leads = Lead::with('owner')->get();
$distribution = [];
foreach ($leads as $lead) {
    $ownerName = $lead->owner?->name ?? 'Sem dono';
    if (!isset($distribution[$ownerName])) {
        $distribution[$ownerName] = 0;
    }
    $distribution[$ownerName]++;
}

foreach ($distribution as $owner => $count) {
    echo "  {$owner}: {$count} leads\n";
}

