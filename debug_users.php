<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== USUÁRIOS NA FILA 'VENDAS' ===\n\n";

$vendasQueue = DB::table('queues')->where('name', 'Vendas')->first();
$queueUsers = DB::table('queue_user')
    ->join('users', 'queue_user.user_id', '=', 'users.id')
    ->where('queue_user.queue_id', $vendasQueue->id)
    ->select('users.id', 'users.name', 'users.email', 'queue_user.is_active')
    ->get();

foreach ($queueUsers as $u) {
    echo "  - {$u->name} ({$u->email}) | is_active: " . ($u->is_active ? 'YES' : 'NO') . "\n";
}

echo "\n=== USUÁRIOS COM PERMISSÃO DE LEADS NO PIPELINE ===\n\n";

$pipeline = DB::table('pipelines')->where('name', 'Funil de Vendas')->first();
$pipelineUsers = DB::table('pipeline_user')
    ->join('users', 'pipeline_user.user_id', '=', 'users.id')
    ->where('pipeline_user.pipeline_id', $pipeline->id)
    ->where('pipeline_user.can_manage_leads', true)
    ->select('users.id', 'users.name', 'users.email', 'users.role', 'users.is_active')
    ->get();

foreach ($pipelineUsers as $u) {
    echo "  - {$u->name} ({$u->email}) | role: {$u->role} | is_active: " . ($u->is_active ? 'YES' : 'NO') . "\n";
}

echo "\n=== LEADS E SEUS OWNERS ===\n\n";

$leads = DB::table('leads')
    ->leftJoin('users', 'leads.owner_id', '=', 'users.id')
    ->leftJoin('contacts', 'leads.contact_id', '=', 'contacts.id')
    ->select('leads.id', 'contacts.name as contact_name', 'users.name as owner_name', 'leads.queue_id', 'leads.pipeline_id')
    ->get();

foreach ($leads as $l) {
    $queueName = $l->queue_id ? DB::table('queues')->where('id', $l->queue_id)->value('name') : 'SEM FILA';
    echo "  - Contact: {$l->contact_name} | Owner: " . ($l->owner_name ?? 'SEM DONO') . " | Fila: {$queueName}\n";
}

echo "\n=== PROBLEMA IDENTIFICADO ===\n";
echo "Canal NÃO tem menu de filas, então a distribuição deveria acontecer na criação do lead.\n";
echo "Mas o canal está associado ao pipeline 'Funil de Vendas', que só tem João e José com permissão.\n";
echo "Porém, a fila 'Vendas' tem João e Maria (José NÃO está na fila).\n";
echo "\nISSO CAUSA CONFUSÃO! Precisa alinhar:\n";
echo "- Se quer usar Round-Robin por pipeline: José e João devem ter can_manage_leads=true\n";
echo "- Se quer usar Round-Robin por fila: José deve ser adicionado à fila 'Vendas'\n";

