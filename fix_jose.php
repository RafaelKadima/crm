<?php

// Script para corrigir permissão do José
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Atualizar can_manage_leads do José
$updated = DB::table('pipeline_user')
    ->where('user_id', '019b048c-6731-7398-ac7a-1b0e202c0888')
    ->update(['can_manage_leads' => true]);

echo "Registros atualizados: {$updated}\n";

// Verificar
$jose = DB::table('pipeline_user')
    ->join('users', 'pipeline_user.user_id', '=', 'users.id')
    ->where('users.email', 'jose@demo.com')
    ->select('users.name', 'pipeline_user.can_manage_leads')
    ->first();

echo "José - can_manage_leads: " . ($jose->can_manage_leads ? 'TRUE' : 'FALSE') . "\n";

// Verificar elegíveis agora
$pipeline = \App\Models\Pipeline::where('name', 'Funil de Vendas')->first();
$eligibleUserIds = $pipeline->getUserIdsWithLeadPermission();
echo "\nUsuários elegíveis agora: " . count($eligibleUserIds) . "\n";

$users = \App\Models\User::whereIn('id', $eligibleUserIds)->get();
foreach ($users as $user) {
    echo "  - {$user->name}\n";
}

