<?php

namespace App\Console\Commands;

use App\Models\Contact;
use App\Models\Lead;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Console\Command;

class DebugLead extends Command
{
    protected $signature = 'debug:lead {phone}';
    protected $description = 'Debug lead by phone number';

    public function handle()
    {
        $phone = $this->argument('phone');
        
        $this->info("Buscando contato com telefone: {$phone}");
        
        $contact = Contact::where('phone', 'like', "%{$phone}%")->first();
        
        if (!$contact) {
            $this->error("Contato não encontrado!");
            return 1;
        }
        
        $this->info("=== CONTATO ===");
        $this->line("ID: {$contact->id}");
        $this->line("Nome: {$contact->name}");
        $this->line("Phone: {$contact->phone}");
        $this->line("Tenant: {$contact->tenant_id}");
        
        $this->newLine();
        $this->info("=== LEADS ===");
        $leads = Lead::withoutGlobalScopes()->where('contact_id', $contact->id)->get();
        
        if ($leads->isEmpty()) {
            $this->warn("Nenhum lead encontrado!");
        } else {
            foreach ($leads as $lead) {
                $this->line("Lead ID: {$lead->id}");
                $this->line("Pipeline ID: " . ($lead->pipeline_id ?? 'NULL'));
                $this->line("Stage ID: " . ($lead->stage_id ?? 'NULL'));
                $this->line("Status: {$lead->status->value}");
                $this->line("Channel ID: " . ($lead->channel_id ?? 'NULL'));
            }
        }
        
        $this->newLine();
        $this->info("=== TICKETS ===");
        $tickets = Ticket::withoutGlobalScopes()->where('contact_id', $contact->id)->get();
        
        if ($tickets->isEmpty()) {
            $this->warn("Nenhum ticket encontrado!");
        } else {
            foreach ($tickets as $ticket) {
                $this->line("Ticket ID: {$ticket->id}");
                $this->line("Lead ID: " . ($ticket->lead_id ?? 'NULL'));
                $this->line("Status: {$ticket->status->value}");
                
                $msgCount = TicketMessage::withoutGlobalScopes()->where('ticket_id', $ticket->id)->count();
                $this->line("Mensagens: {$msgCount}");
                
                $lastMsg = TicketMessage::withoutGlobalScopes()
                    ->where('ticket_id', $ticket->id)
                    ->orderBy('sent_at', 'desc')
                    ->first();
                    
                if ($lastMsg) {
                    $this->line("Última: " . substr($lastMsg->message, 0, 50) . "...");
                    $this->line("Enviada: {$lastMsg->sent_at}");
                }
            }
        }
        
        return 0;
    }
}

