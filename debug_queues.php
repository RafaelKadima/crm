<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== FILAS (QUEUES) ===\n\n";

$queues = DB::table('queues')->get();
foreach ($queues as $q) {
    echo "Fila: {$q->name}\n";
    echo "  - auto_distribute: " . ($q->auto_distribute ? 'YES' : 'NO') . "\n";
    echo "  - pipeline_id: " . ($q->pipeline_id ?? 'NULL') . "\n";
    
    // Usuários da fila
    $users = DB::table('queue_user')
        ->join('users', 'queue_user.user_id', '=', 'users.id')
        ->where('queue_user.queue_id', $q->id)
        ->where('queue_user.is_active', true)
        ->select('users.name')
        ->get();
    
    echo "  - Usuários ativos: " . $users->pluck('name')->implode(', ') . "\n\n";
}

echo "=== CANAIS (CHANNELS) ===\n\n";

$channels = DB::table('channels')->get();
foreach ($channels as $c) {
    $settings = json_decode($c->settings ?? '{}', true);
    $hasQueueMenu = isset($settings['queue_menu_enabled']) && $settings['queue_menu_enabled'];
    
    echo "Canal: {$c->name}\n";
    echo "  - has_queue_menu: " . ($hasQueueMenu ? 'YES' : 'NO') . "\n";
    
    if ($hasQueueMenu && isset($settings['queue_menu_options'])) {
        echo "  - Menu Options:\n";
        foreach ($settings['queue_menu_options'] as $opt) {
            echo "    * {$opt['number']} - {$opt['label']} -> queue_id: {$opt['queue_id']}\n";
        }
    }
    echo "\n";
}

echo "=== LEADS SEM OWNER ===\n\n";

$leadsNoOwner = DB::table('leads')->whereNull('owner_id')->get();
echo "Total de leads sem owner_id: " . $leadsNoOwner->count() . "\n";

echo "\n=== LEADS COM OWNER ===\n\n";

$leadsWithOwner = DB::table('leads')
    ->join('users', 'leads.owner_id', '=', 'users.id')
    ->select('leads.id', 'leads.name as lead_name', 'users.name as owner_name', 'leads.queue_id')
    ->whereNotNull('leads.owner_id')
    ->get();

foreach ($leadsWithOwner as $l) {
    $queueName = $l->queue_id ? DB::table('queues')->where('id', $l->queue_id)->value('name') : 'SEM FILA';
    echo "  - Lead: " . ($l->lead_name ?? '(sem nome)') . " | Owner: {$l->owner_name} | Fila: {$queueName}\n";
}

