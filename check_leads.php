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

echo "\n=== DEBUG LOG ===\n";
$debugLog = storage_path('logs/debug.log');
if (file_exists($debugLog)) {
    echo file_get_contents($debugLog);
} else {
    echo "  (Arquivo não existe)\n";
}

