<?php

namespace App\Console\Commands;

use App\Enums\FunnelCategoryEnum;
use App\Models\PipelineStage;
use Illuminate\Console\Command;

/**
 * Popula funnel_category nos stages existentes com categoria 'unmapped'.
 *
 * O booted() do PipelineStage só aplica o auto-guess ao CRIAR stages novos.
 * Stages existentes antes desse deploy ficaram com 'unmapped' — este comando
 * corre a heurística (FunnelCategoryEnum::guessFromStageName) uma vez em todos.
 *
 * Seguro: só altera registros que estão 'unmapped'. Quem já foi configurado
 * manualmente (admin da loja) não é tocado.
 */
class FunnelSeedCategoryCommand extends Command
{
    protected $signature = 'funnel:seed-category
                            {--dry-run : Só mostra o que seria mudado, sem alterar}
                            {--tenant= : Limita a um tenant específico (UUID)}';

    protected $description = 'Aplica auto-guess de funnel_category nos stages que estão unmapped.';

    public function handle(): int
    {
        $query = PipelineStage::query()
            ->where('funnel_category', FunnelCategoryEnum::UNMAPPED->value);

        if ($this->option('tenant')) {
            $query->where('tenant_id', $this->option('tenant'));
        }

        $stages = $query->get();
        $dryRun = $this->option('dry-run');

        if ($stages->isEmpty()) {
            $this->info('Nenhum stage unmapped encontrado.');
            return self::SUCCESS;
        }

        $this->info(sprintf('Encontrados %d stages unmapped. Modo: %s', $stages->count(), $dryRun ? 'DRY-RUN' : 'APLICAR'));
        $this->newLine();

        $summary = [];
        $changed = 0;
        $keptUnmapped = 0;

        foreach ($stages as $stage) {
            $guess = FunnelCategoryEnum::guessFromStageName($stage->name, $stage->stage_type ?? 'open');
            $category = $guess->value;
            $summary[$category] = ($summary[$category] ?? 0) + 1;

            if ($guess === FunnelCategoryEnum::UNMAPPED) {
                $keptUnmapped++;
                continue;
            }

            if (!$dryRun) {
                $stage->funnel_category = $guess;
                $stage->saveQuietly();
            }
            $changed++;
        }

        $this->table(
            ['Categoria', 'Stages'],
            collect($summary)->map(fn ($count, $cat) => [$cat, $count])->values()->all()
        );

        $this->newLine();
        $this->info(sprintf('✓ %d stages %s. %d permanecem unmapped (precisam mapeamento manual do admin).',
            $changed,
            $dryRun ? 'seriam atualizados' : 'atualizados',
            $keptUnmapped
        ));

        return self::SUCCESS;
    }
}
