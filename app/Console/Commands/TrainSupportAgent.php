<?php

namespace App\Console\Commands;

use App\Models\SdrAgent;
use App\Models\SdrFaq;
use App\Models\SdrKnowledgeEntry;
use App\Models\Tenant;
use Illuminate\Console\Command;

class TrainSupportAgent extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'support:train
                            {--tenant= : Slug do tenant (default: empresa-demo)}
                            {--fresh : Limpar FAQs e Knowledge Entries existentes}';

    /**
     * The console command description.
     */
    protected $description = 'Treina o Support Agent com FAQs e Knowledge Entries';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $tenantSlug = $this->option('tenant') ?? 'empresa-demo';
        $fresh = $this->option('fresh');

        $this->info("Buscando tenant: {$tenantSlug}");

        $tenant = Tenant::where('slug', $tenantSlug)->first();

        if (!$tenant) {
            $this->error("Tenant '{$tenantSlug}' not found.");
            return 1;
        }

        // Busca Support Agent
        $agent = SdrAgent::where('tenant_id', $tenant->id)
            ->where('type', 'support')
            ->first();

        if (!$agent) {
            $this->warn('Support Agent not found. Running seeder to create...');
            $this->call('db:seed', ['--class' => 'SupportAgentKnowledgeSeeder']);

            $agent = SdrAgent::where('tenant_id', $tenant->id)
                ->where('type', 'support')
                ->first();
        }

        if (!$agent) {
            $this->error('Failed to create Support Agent.');
            return 1;
        }

        $this->info("Support Agent encontrado: {$agent->name}");

        if ($fresh) {
            $this->warn('Limpando dados existentes...');
            SdrFaq::where('sdr_agent_id', $agent->id)->delete();
            SdrKnowledgeEntry::where('sdr_agent_id', $agent->id)->delete();
        }

        // Estatísticas
        $faqCount = SdrFaq::where('sdr_agent_id', $agent->id)->count();
        $knowledgeCount = SdrKnowledgeEntry::where('sdr_agent_id', $agent->id)->count();

        $this->table(
            ['Tipo', 'Quantidade'],
            [
                ['FAQs', $faqCount],
                ['Knowledge Entries', $knowledgeCount],
            ]
        );

        if ($faqCount === 0 && $knowledgeCount === 0) {
            $this->info('Nenhum dado encontrado. Executando seeder...');
            $this->call('db:seed', ['--class' => 'SupportAgentKnowledgeSeeder']);

            // Recarrega contagens
            $faqCount = SdrFaq::where('sdr_agent_id', $agent->id)->count();
            $knowledgeCount = SdrKnowledgeEntry::where('sdr_agent_id', $agent->id)->count();

            $this->table(
                ['Tipo', 'Quantidade'],
                [
                    ['FAQs', $faqCount],
                    ['Knowledge Entries', $knowledgeCount],
                ]
            );
        }

        // Mostrar categorias de Knowledge Entries
        $categories = SdrKnowledgeEntry::where('sdr_agent_id', $agent->id)
            ->selectRaw('category, COUNT(*) as total')
            ->groupBy('category')
            ->get();

        if ($categories->isNotEmpty()) {
            $this->newLine();
            $this->info('Categorias de Knowledge Entries:');
            $this->table(
                ['Categoria', 'Total'],
                $categories->map(fn($c) => [$c->category, $c->total])->toArray()
            );
        }

        // Mostrar FAQs com maior prioridade
        $topFaqs = SdrFaq::where('sdr_agent_id', $agent->id)
            ->orderBy('priority', 'desc')
            ->limit(5)
            ->get(['question', 'priority']);

        if ($topFaqs->isNotEmpty()) {
            $this->newLine();
            $this->info('Top 5 FAQs (por prioridade):');
            $this->table(
                ['Pergunta', 'Prioridade'],
                $topFaqs->map(fn($f) => [substr($f->question, 0, 50) . '...', $f->priority])->toArray()
            );
        }

        $this->newLine();
        $this->info('Support Agent treinado com sucesso!');

        return 0;
    }
}
