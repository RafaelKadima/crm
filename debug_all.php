<?php

// Script de debug completo
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Lead;
use App\Models\Ticket;
use Illuminate\Support\Facades\DB;

echo "=== 1. DISTRIBUIÇÃO DE LEADS ===\n\n";

$leads = Lead::with('owner')->get();
foreach ($leads as $lead) {
    $ownerName = $lead->owner ? $lead->owner->name : 'SEM DONO';
    echo "  - {$lead->name} => {$ownerName}\n";
}

$distribution = $leads->groupBy('owner_id')->map->count();
echo "\nResumo:\n";
foreach ($distribution as $ownerId => $count) {
    $owner = $ownerId ? \App\Models\User::find($ownerId)?->name : 'SEM DONO';
    echo "  {$owner}: {$count} leads\n";
}

echo "\n=== 2. TICKETS E MENSAGENS ===\n\n";

$tickets = Ticket::with(['lead', 'messages'])->get();
foreach ($tickets as $ticket) {
    $leadName = $ticket->lead?->name ?? 'SEM LEAD';
    $leadPhone = $ticket->lead?->contact?->phone ?? $ticket->lead?->phone ?? 'N/A';
    echo "Ticket: {$ticket->id}\n";
    echo "  Lead: {$leadName} (Phone: {$leadPhone})\n";
    echo "  Mensagens: {$ticket->messages->count()}\n";
    
    foreach ($ticket->messages->take(3) as $msg) {
        $content = substr($msg->content ?? $msg->body ?? '', 0, 50);
        echo "    - [{$msg->direction}] {$content}...\n";
    }
    echo "\n";
}

echo "=== 3. VERIFICAR PROJETO SDR ===\n\n";

// Verificar se tickets têm project_id
$ticketsWithProject = DB::table('tickets')
    ->select('id', 'lead_id', 'project_id', 'channel')
    ->get();

foreach ($ticketsWithProject as $t) {
    echo "Ticket: {$t->id}\n";
    echo "  - lead_id: " . ($t->lead_id ?? 'NULL') . "\n";
    echo "  - project_id: " . ($t->project_id ?? 'NULL') . "\n";
    echo "  - channel: " . ($t->channel ?? 'NULL') . "\n\n";
}

// Verificar projetos existentes
echo "=== PROJETOS EXISTENTES ===\n";
$projects = DB::table('projects')->select('id', 'name', 'tenant_id')->get();
foreach ($projects as $p) {
    echo "  - {$p->name} (ID: {$p->id})\n";
}

