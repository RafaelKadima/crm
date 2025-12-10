<?php

namespace App\Console\Commands;

use App\Models\Lead;
use App\Services\LeadAssignmentService;
use Illuminate\Console\Command;

class AssignOrphanLeads extends Command
{
    protected $signature = 'leads:assign-orphans';
    protected $description = 'Atribui leads sem responsável usando Round Robin';

    public function handle(LeadAssignmentService $assignmentService)
    {
        $leads = Lead::whereNull('owner_id')->get();

        if ($leads->isEmpty()) {
            $this->info('Todos os leads já possuem responsável!');
            return;
        }

        $this->info("Encontrados {$leads->count()} leads sem responsável.");

        foreach ($leads as $lead) {
            try {
                $owner = $assignmentService->assignLeadOwner($lead);
                $this->info("✅ Lead '{$lead->name}' atribuído para {$owner->name}");
            } catch (\Exception $e) {
                $this->error("❌ Lead '{$lead->name}': {$e->getMessage()}");
            }
        }

        $this->info('Concluído!');
    }
}

