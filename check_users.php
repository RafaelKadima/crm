<?php

// Script para verificar usuários com permissão de leads
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Pipeline;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Verificar pipelines
$pipelines = Pipeline::all();
echo "=== PIPELINES ===\n";
foreach ($pipelines as $pipeline) {
    echo "\nPipeline: {$pipeline->name} (ID: {$pipeline->id})\n";
    echo "  - is_public: " . ($pipeline->is_public ? 'Sim' : 'Não') . "\n";
    echo "  - is_default: " . ($pipeline->is_default ? 'Sim' : 'Não') . "\n";
    
    // Usuários com permissão de leads
    $userIds = $pipeline->getUserIdsWithLeadPermission();
    echo "  - Usuários com permissão de leads: " . count($userIds) . "\n";
    
    if (count($userIds) > 0) {
        $users = User::whereIn('id', $userIds)->get();
        foreach ($users as $user) {
            echo "    * {$user->name} ({$user->email}) - Role: {$user->role->value}\n";
        }
    }
}

// Verificar usuários do pipeline_user
echo "\n\n=== PIPELINE_USER (direto do BD) ===\n";
$pipelineUsers = DB::table('pipeline_user')
    ->join('users', 'pipeline_user.user_id', '=', 'users.id')
    ->join('pipelines', 'pipeline_user.pipeline_id', '=', 'pipelines.id')
    ->select('users.name', 'users.email', 'users.role', 'users.is_active', 
             'pipelines.name as pipeline_name', 
             'pipeline_user.can_manage_leads', 'pipeline_user.can_view', 'pipeline_user.can_edit')
    ->get();

foreach ($pipelineUsers as $pu) {
    echo "  - {$pu->name}: Pipeline={$pu->pipeline_name}, can_manage_leads=" . ($pu->can_manage_leads ? 'YES' : 'NO') . ", role={$pu->role}, is_active=" . ($pu->is_active ? 'YES' : 'NO') . "\n";
}

// Verificar todos os vendedores ativos
echo "\n\n=== VENDEDORES ATIVOS ===\n";
$vendedores = User::where('role', 'vendedor')->where('is_active', true)->get();
foreach ($vendedores as $v) {
    echo "  - {$v->name} ({$v->email}) - ID: {$v->id}\n";
}

