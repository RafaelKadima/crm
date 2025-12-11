<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Current time: " . now() . "\n\n";

echo "=== LEADS ===\n";
$leads = DB::table('leads')
    ->join('contacts', 'leads.contact_id', '=', 'contacts.id')
    ->leftJoin('users', 'leads.owner_id', '=', 'users.id')
    ->select('contacts.name', 'leads.created_at', 'users.name as owner', 'leads.queue_id', 'leads.pipeline_id')
    ->get();

foreach ($leads as $l) {
    echo "  - {$l->name}\n";
    echo "    Created: {$l->created_at}\n";
    echo "    Owner: " . ($l->owner ?? 'NULL') . "\n";
    echo "    Queue: " . ($l->queue_id ?? 'NULL') . "\n";
    echo "    Pipeline: " . ($l->pipeline_id ?? 'NULL') . "\n\n";
}

echo "=== LEAD_ASSIGNMENT_LOGS ===\n";
$logs = DB::table('lead_assignment_logs')
    ->join('users', 'lead_assignment_logs.user_id', '=', 'users.id')
    ->select('users.name', 'lead_assignment_logs.last_assigned_at', 'lead_assignment_logs.queue_id', 'lead_assignment_logs.channel_id')
    ->orderBy('lead_assignment_logs.last_assigned_at', 'desc')
    ->get();

if ($logs->isEmpty()) {
    echo "  (Nenhum log de atribuição)\n";
} else {
    foreach ($logs as $log) {
        echo "  - {$log->name}: {$log->last_assigned_at}\n";
    }
}

echo "\n=== CANAIS E FILAS ASSOCIADAS ===\n";
$channels = DB::table('channels')->get();
foreach ($channels as $ch) {
    $queues = DB::table('queues')->where('channel_id', $ch->id)->get();
    $settings = json_decode($ch->settings ?? '{}', true);
    $hasQueueMenu = isset($settings['queue_menu_enabled']) && $settings['queue_menu_enabled'];
    
    echo "Canal: {$ch->name}\n";
    echo "  - has_queue_menu: " . ($hasQueueMenu ? 'YES' : 'NO') . "\n";
    echo "  - Filas associadas: " . $queues->count() . "\n";
    foreach ($queues as $q) {
        $queueUsers = DB::table('queue_user')
            ->join('users', 'queue_user.user_id', '=', 'users.id')
            ->where('queue_user.queue_id', $q->id)
            ->where('queue_user.is_active', true)
            ->pluck('users.name')
            ->toArray();
        echo "    * {$q->name} (auto_dist: " . ($q->auto_distribute ? 'YES' : 'NO') . ") -> Users: " . implode(', ', $queueUsers) . "\n";
    }
    echo "\n";
}

echo "=== DEBUG LOG ===\n";
$debugLog = storage_path('logs/debug.log');
if (file_exists($debugLog)) {
    $content = file_get_contents($debugLog);
    if (empty(trim($content))) {
        echo "  (Arquivo vazio)\n";
    } else {
        echo $content;
    }
} else {
    echo "  (Arquivo não existe)\n";
}

