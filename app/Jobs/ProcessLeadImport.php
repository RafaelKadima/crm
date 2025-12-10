<?php

namespace App\Jobs;

use App\Models\LeadImport;
use App\Services\LeadImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessLeadImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Número de tentativas.
     */
    public int $tries = 1;

    /**
     * Timeout em segundos.
     */
    public int $timeout = 600; // 10 minutos

    /**
     * Create a new job instance.
     */
    public function __construct(
        public LeadImport $import
    ) {}

    /**
     * Execute the job.
     */
    public function handle(LeadImportService $importService): void
    {
        Log::info("Iniciando processamento de importação: {$this->import->id}");

        try {
            $importService->processImport($this->import);
            
            Log::info("Importação concluída: {$this->import->id}", [
                'success' => $this->import->success_count,
                'errors' => $this->import->error_count,
            ]);
        } catch (\Exception $e) {
            Log::error("Erro na importação {$this->import->id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("Job de importação falhou: {$this->import->id}", [
            'error' => $exception->getMessage(),
        ]);

        $this->import->markAsFailed([
            ['row' => 0, 'message' => 'Erro interno: ' . $exception->getMessage()]
        ]);
    }
}

