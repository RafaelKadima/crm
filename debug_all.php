<?php

// Script de debug completo
require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Lead;
use App\Models\Ticket;
use App\Models\Contact;
use Illuminate\Support\Facades\DB;

echo "=== 1. DISTRIBUIÇÃO DE LEADS ===\n\n";

$leads = Lead::with(['owner', 'contact'])->get();
foreach ($leads as $lead) {
    $ownerName = $lead->owner ? $lead->owner->name : 'SEM DONO';
    $contactName = $lead->contact ? $lead->contact->name : 'SEM CONTATO';
    $phone = $lead->contact?->phone ?? $lead->phone ?? 'N/A';
    echo "  - Lead: {$lead->name} | Contato: {$contactName} | Phone: {$phone} | Responsável: {$ownerName}\n";
}

$distribution = $leads->groupBy('owner_id')->map->count();
echo "\nResumo de distribuição:\n";
foreach ($distribution as $ownerId => $count) {
    $owner = $ownerId ? \App\Models\User::find($ownerId)?->name : 'SEM DONO';
    echo "  {$owner}: {$count} leads\n";
}

echo "\n=== 2. TICKETS E MENSAGENS ===\n\n";

$tickets = Ticket::with(['lead', 'contact', 'messages'])->get();
foreach ($tickets as $ticket) {
    $leadName = $ticket->lead?->name ?? 'SEM LEAD';
    $contactName = $ticket->contact?->name ?? 'SEM CONTATO';
    $contactPhone = $ticket->contact?->phone ?? 'N/A';
    
    echo "Ticket: {$ticket->id}\n";
    echo "  Lead: {$leadName} (lead_id: " . ($ticket->lead_id ?? 'NULL') . ")\n";
    echo "  Contact: {$contactName} (contact_id: {$ticket->contact_id}, Phone: {$contactPhone})\n";
    echo "  Mensagens: {$ticket->messages->count()}\n";
    
    foreach ($ticket->messages->take(5) as $msg) {
        $content = substr($msg->content ?? $msg->body ?? '', 0, 80);
        $direction = $msg->direction instanceof \BackedEnum ? $msg->direction->value : $msg->direction;
        echo "    - [{$direction}] {$content}\n";
    }
    echo "\n";
}

echo "\n=== 3. CONTATOS ===\n\n";
$contacts = Contact::all();
foreach ($contacts as $c) {
    echo "  - ID: {$c->id} | {$c->name} | Phone: {$c->phone}\n";
}

echo "\n=== 4. LEAD_ASSIGNMENT_LOGS ===\n\n";
$logs = DB::table('lead_assignment_logs')
    ->join('users', 'lead_assignment_logs.user_id', '=', 'users.id')
    ->select('users.name', 'lead_assignment_logs.last_assigned_at', 'lead_assignment_logs.channel_id')
    ->orderBy('lead_assignment_logs.last_assigned_at', 'desc')
    ->get();

if ($logs->isEmpty()) {
    echo "  (Nenhum log de atribuição)\n";
} else {
    foreach ($logs as $log) {
        echo "  - {$log->name}: {$log->last_assigned_at}\n";
    }
}

echo "\n=== 5. VERIFICAR SE TICKETS TÊM LEAD_ID CORRETO ===\n\n";

foreach ($tickets as $ticket) {
    $ticketContactId = $ticket->contact_id;
    $ticketLeadId = $ticket->lead_id;
    
    // Buscar o lead que deveria estar associado (pelo contact_id)
    $correctLead = Lead::where('contact_id', $ticketContactId)->first();
    
    if ($correctLead) {
        if ($ticketLeadId === $correctLead->id) {
            echo "  ✅ Ticket {$ticket->id}: lead_id CORRETO\n";
        } else {
            echo "  ❌ Ticket {$ticket->id}: lead_id ERRADO!\n";
            echo "     - Atual: {$ticketLeadId}\n";
            echo "     - Deveria: {$correctLead->id}\n";
        }
    } else {
        echo "  ⚠️ Ticket {$ticket->id}: Nenhum lead encontrado para contact_id {$ticketContactId}\n";
    }
}

echo "\n=== 6. VERIFICAR SDR AGENT ===\n\n";
$agents = DB::table('sdr_agents')->select('id', 'name', 'tenant_id', 'is_active', 'project_id')->get();
if ($agents->isEmpty()) {
    echo "  (Nenhum SDR Agent configurado)\n";
} else {
    foreach ($agents as $a) {
        echo "  - {$a->name} (project_id: " . ($a->project_id ?? 'NULL') . ", is_active: " . ($a->is_active ? 'YES' : 'NO') . ")\n";
    }
}
