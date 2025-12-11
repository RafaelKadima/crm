<?php

// Script para verificar José
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Pipeline;
use Illuminate\Support\Facades\DB;

echo "=== VERIFICANDO JOSÉ ===\n\n";

$jose = User::where('email', 'jose@demo.com')->first();
if ($jose) {
    echo "José encontrado:\n";
    echo "  - ID: {$jose->id}\n";
    echo "  - Nome: {$jose->name}\n";
    echo "  - Email: {$jose->email}\n";
    echo "  - Role: {$jose->role->value}\n";
    echo "  - is_active: " . ($jose->is_active ? 'TRUE' : 'FALSE') . "\n";
    echo "  - tenant_id: {$jose->tenant_id}\n";
} else {
    echo "José NÃO ENCONTRADO!\n";
}

echo "\n=== VERIFICANDO PIPELINE_USER ===\n\n";

$pipelineUser = DB::table('pipeline_user')
    ->join('users', 'pipeline_user.user_id', '=', 'users.id')
    ->join('pipelines', 'pipeline_user.pipeline_id', '=', 'pipelines.id')
    ->where('users.email', 'jose@demo.com')
    ->select('users.name', 'users.email', 'users.role', 'users.is_active',
             'pipelines.name as pipeline_name', 'pipelines.tenant_id as pipeline_tenant_id',
             'pipeline_user.can_manage_leads')
    ->first();

if ($pipelineUser) {
    echo "Pipeline User encontrado:\n";
    echo "  - Pipeline: {$pipelineUser->pipeline_name}\n";
    echo "  - can_manage_leads: " . ($pipelineUser->can_manage_leads ? 'TRUE' : 'FALSE') . "\n";
    echo "  - role: {$pipelineUser->role}\n";
    echo "  - is_active: " . ($pipelineUser->is_active ? 'TRUE' : 'FALSE') . "\n";
} else {
    echo "Pipeline User NÃO ENCONTRADO!\n";
}

// Verificar query do getUserIdsWithLeadPermission
echo "\n=== QUERY DETALHADA DO PIPELINE ===\n\n";

$pipeline = Pipeline::where('name', 'Funil de Vendas')->first();
if ($pipeline) {
    echo "Pipeline: {$pipeline->name} (is_public: " . ($pipeline->is_public ? 'TRUE' : 'FALSE') . ")\n\n";
    
    // Query manual
    $users = DB::table('pipeline_user')
        ->join('users', 'pipeline_user.user_id', '=', 'users.id')
        ->where('pipeline_user.pipeline_id', $pipeline->id)
        ->where('pipeline_user.can_manage_leads', true)
        ->select('users.id', 'users.name', 'users.role', 'users.is_active')
        ->get();
    
    echo "Usuários com can_manage_leads=true:\n";
    foreach ($users as $u) {
        echo "  - {$u->name}: role={$u->role}, is_active=" . ($u->is_active ? 'TRUE' : 'FALSE') . "\n";
    }
    
    // Filtro completo como no método
    $usersFiltered = DB::table('pipeline_user')
        ->join('users', 'pipeline_user.user_id', '=', 'users.id')
        ->where('pipeline_user.pipeline_id', $pipeline->id)
        ->where('pipeline_user.can_manage_leads', true)
        ->where('users.is_active', true)
        ->where('users.role', 'vendedor')
        ->select('users.id', 'users.name')
        ->get();
    
    echo "\nApós filtro (is_active=true AND role=vendedor):\n";
    foreach ($usersFiltered as $u) {
        echo "  - {$u->name} (ID: {$u->id})\n";
    }
}

