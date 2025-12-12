<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== TICKETS ===\n\n";

$tickets = DB::table('tickets')
    ->leftJoin('contacts', 'tickets.contact_id', '=', 'contacts.id')
    ->leftJoin('leads', 'tickets.lead_id', '=', 'leads.id')
    ->select(
        'tickets.id as ticket_id',
        'tickets.contact_id',
        'tickets.lead_id',
        'contacts.name as contact_name',
        'contacts.phone as contact_phone'
    )
    ->get();

foreach ($tickets as $t) {
    echo "Ticket: {$t->ticket_id}\n";
    echo "  Contact: {$t->contact_name} ({$t->contact_phone})\n";
    echo "  Contact ID: {$t->contact_id}\n";
    echo "  Lead ID: {$t->lead_id}\n";
    
    // Buscar mensagens deste ticket
    $messages = DB::table('ticket_messages')
        ->where('ticket_id', $t->ticket_id)
        ->select('id', 'direction', 'content', 'created_at')
        ->orderBy('created_at')
        ->get();
    
    echo "  Mensagens ({$messages->count()}):\n";
    foreach ($messages as $m) {
        $direction = $m->direction;
        $content = substr($m->content ?? '', 0, 50);
        echo "    - [{$direction}] {$content}...\n";
    }
    echo "\n";
}

echo "=== VERIFICAR DUPLICAÇÕES ===\n\n";

// Verificar se há tickets com o mesmo contact_id
$duplicateContacts = DB::table('tickets')
    ->select('contact_id', DB::raw('COUNT(*) as count'))
    ->groupBy('contact_id')
    ->having('count', '>', 1)
    ->get();

if ($duplicateContacts->isEmpty()) {
    echo "  Nenhum contact_id duplicado em tickets\n";
} else {
    echo "  ⚠️ Contact_id duplicados:\n";
    foreach ($duplicateContacts as $d) {
        $contact = DB::table('contacts')->where('id', $d->contact_id)->first();
        echo "    - {$contact->name}: {$d->count} tickets\n";
    }
}

// Verificar mensagens sem ticket válido
$orphanMessages = DB::table('ticket_messages')
    ->leftJoin('tickets', 'ticket_messages.ticket_id', '=', 'tickets.id')
    ->whereNull('tickets.id')
    ->count();

echo "\n  Mensagens órfãs (sem ticket): {$orphanMessages}\n";

