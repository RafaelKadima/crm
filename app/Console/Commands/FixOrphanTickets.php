<?php

namespace App\Console\Commands;

use App\Enums\LeadStatusEnum;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Ticket;
use Illuminate\Console\Command;

class FixOrphanTickets extends Command
{
    protected $signature = 'fix:orphan-tickets';
    protected $description = 'Fix tickets without leads';

    public function handle()
    {
        $this->info("Buscando tickets sem lead...");
        
        $orphanTickets = Ticket::withoutGlobalScopes()
            ->whereNull('lead_id')
            ->get();
        
        if ($orphanTickets->isEmpty()) {
            $this->info("Nenhum ticket órfão encontrado!");
            return 0;
        }
        
        $this->info("Encontrados {$orphanTickets->count()} tickets sem lead.");
        
        foreach ($orphanTickets as $ticket) {
            $contact = Contact::withoutGlobalScopes()->find($ticket->contact_id);
            
            if (!$contact) {
                $this->warn("Ticket {$ticket->id} - Contato não encontrado!");
                continue;
            }
            
            $this->line("Processando: {$contact->name} ({$contact->phone})");
            
            // Busca lead existente para o contato
            $lead = Lead::withoutGlobalScopes()
                ->where('contact_id', $contact->id)
                ->first();
            
            if (!$lead) {
                // Cria novo lead
                $pipeline = Pipeline::withoutGlobalScopes()
                    ->where('tenant_id', $ticket->tenant_id)
                    ->where('is_default', true)
                    ->first();
                
                if (!$pipeline) {
                    $pipeline = Pipeline::withoutGlobalScopes()
                        ->where('tenant_id', $ticket->tenant_id)
                        ->first();
                }
                
                $firstStage = null;
                if ($pipeline) {
                    $firstStage = PipelineStage::where('pipeline_id', $pipeline->id)
                        ->orderBy('order')
                        ->first();
                }
                
                $lead = Lead::create([
                    'tenant_id' => $ticket->tenant_id,
                    'contact_id' => $contact->id,
                    'channel_id' => $ticket->channel_id,
                    'pipeline_id' => $pipeline?->id,
                    'stage_id' => $firstStage?->id,
                    'status' => LeadStatusEnum::OPEN,
                ]);
                
                $this->info("  ✅ Lead criado: {$lead->id}");
            } else {
                $this->line("  → Lead já existe: {$lead->id}");
            }
            
            // Associa ticket ao lead
            $ticket->update(['lead_id' => $lead->id]);
            $this->info("  ✅ Ticket associado ao lead");
        }
        
        $this->newLine();
        $this->info("✅ Concluído!");
        
        return 0;
    }
}

