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

echo "=== 1. LEADS NO BANCO ===\n\n";

$leadsRaw = DB::table('leads')->get();
echo "Total de leads no banco: " . $leadsRaw->count() . "\n\n";

foreach ($leadsRaw as $lead) {
    $owner = $lead->owner_id ? DB::table('users')->where('id', $lead->owner_id)->value('name') : 'SEM DONO';
    $contact = $lead->contact_id ? DB::table('contacts')->where('id', $lead->contact_id)->value('name') : 'SEM CONTATO';
    echo "  - Lead ID: {$lead->id}\n";
    echo "    name: " . ($lead->name ?? '(vazio)') . "\n";
    echo "    contact_id: " . ($lead->contact_id ?? 'NULL') . " ({$contact})\n";
    echo "    owner_id: " . ($lead->owner_id ?? 'NULL') . " ({$owner})\n";
    echo "    pipeline_id: " . ($lead->pipeline_id ?? 'NULL') . "\n\n";
}

echo "=== 2. TICKETS NO BANCO ===\n\n";

$ticketsRaw = DB::table('tickets')->get();
echo "Total de tickets no banco: " . $ticketsRaw->count() . "\n\n";

foreach ($ticketsRaw as $ticket) {
    $leadExists = $ticket->lead_id ? DB::table('leads')->where('id', $ticket->lead_id)->exists() : false;
    $contact = $ticket->contact_id ? DB::table('contacts')->where('id', $ticket->contact_id)->value('name') : 'SEM CONTATO';
    
    echo "  - Ticket ID: {$ticket->id}\n";
    echo "    lead_id: " . ($ticket->lead_id ?? 'NULL') . " (existe: " . ($leadExists ? 'SIM' : 'NÃO') . ")\n";
    echo "    contact_id: " . ($ticket->contact_id ?? 'NULL') . " ({$contact})\n\n";
}

echo "=== 3. VERIFICAR SE LEAD_ID DO TICKET APONTA PARA LEAD CERTO ===\n\n";

foreach ($ticketsRaw as $ticket) {
    if ($ticket->lead_id) {
        $leadInTicket = DB::table('leads')->where('id', $ticket->lead_id)->first();
        if ($leadInTicket) {
            $leadContact = DB::table('contacts')->where('id', $leadInTicket->contact_id)->first();
            $ticketContact = DB::table('contacts')->where('id', $ticket->contact_id)->first();
            
            echo "Ticket {$ticket->id}:\n";
            echo "  - Ticket contact: " . ($ticketContact->name ?? 'N/A') . " ({$ticket->contact_id})\n";
            echo "  - Lead contact: " . ($leadContact->name ?? 'N/A') . " ({$leadInTicket->contact_id})\n";
            
            if ($ticket->contact_id === $leadInTicket->contact_id) {
                echo "  ✅ MATCH!\n\n";
            } else {
                echo "  ❌ MISMATCH! Ticket e Lead têm contatos DIFERENTES!\n\n";
            }
        }
    }
}

echo "=== 4. LEAD_ASSIGNMENT_LOGS ===\n\n";
$logs = DB::table('lead_assignment_logs')->get();
echo "Total de logs: " . $logs->count() . "\n";

echo "\n=== 5. SDR AGENTS ===\n\n";
$agentCols = DB::select("SELECT column_name FROM information_schema.columns WHERE table_name = 'sdr_agents'");
echo "Colunas da tabela sdr_agents:\n";
foreach ($agentCols as $col) {
    echo "  - {$col->column_name}\n";
}

$agents = DB::table('sdr_agents')->select('id', 'name', 'tenant_id', 'is_active')->get();
echo "\nAgentes:\n";
foreach ($agents as $a) {
    echo "  - {$a->name} (is_active: " . ($a->is_active ? 'YES' : 'NO') . ")\n";
}
