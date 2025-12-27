<?php

namespace App\Jobs;

use App\Models\AgentFixRequest;
use App\Models\WhatsAppChannel;
use App\Services\WhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessApprovedFix implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;
    public int $timeout = 300; // 5 minutos

    /**
     * Create a new job instance.
     */
    public function __construct(
        public AgentFixRequest $fixRequest
    ) {}

    /**
     * Execute the job.
     */
    public function handle(WhatsAppService $whatsAppService): void
    {
        Log::info('Processing approved fix', [
            'fix_request_id' => $this->fixRequest->id,
            'file_path' => $this->fixRequest->file_path,
        ]);

        // Marca como executando
        $this->fixRequest->markExecuting();

        try {
            // Chama o Python service para executar o fix
            $result = $this->executeFix();

            if ($result['success']) {
                // Marca como deployed
                $this->fixRequest->markDeployed($result);

                // Notifica o cliente via WhatsApp
                $this->notifyCustomer($whatsAppService, true);

                Log::info('Fix deployed successfully', [
                    'fix_request_id' => $this->fixRequest->id,
                ]);
            } else {
                // Falhou - escala para humano
                $this->fixRequest->update([
                    'status' => AgentFixRequest::STATUS_ESCALATED,
                    'execution_result' => $result,
                ]);

                // Notifica desenvolvedor sobre a falha
                $this->notifyDeveloperError($whatsAppService, $result['error'] ?? 'Erro desconhecido');

                Log::error('Fix execution failed', [
                    'fix_request_id' => $this->fixRequest->id,
                    'error' => $result['error'] ?? 'Unknown error',
                ]);
            }
        } catch (\Exception $e) {
            $this->fixRequest->update([
                'status' => AgentFixRequest::STATUS_ESCALATED,
                'execution_result' => ['error' => $e->getMessage()],
            ]);

            Log::error('Fix processing exception', [
                'fix_request_id' => $this->fixRequest->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Executa o fix chamando o Python service
     */
    protected function executeFix(): array
    {
        $aiServiceUrl = config('services.ai_agent.url', 'http://localhost:8001');
        $internalKey = config('services.ai_agent.internal_key', '');

        $response = Http::timeout(180)
            ->withHeaders([
                'X-Internal-Key' => $internalKey,
                'Content-Type' => 'application/json',
            ])
            ->post("{$aiServiceUrl}/support/execute-fix", [
                'file_path' => $this->fixRequest->file_path,
                'old_code' => $this->fixRequest->old_code,
                'new_code' => $this->fixRequest->new_code,
                'commit_message' => $this->fixRequest->commit_message,
                'run_migrations' => false,
                'clear_cache' => true,
            ]);

        if (!$response->successful()) {
            return [
                'success' => false,
                'error' => 'AI service request failed: ' . $response->status(),
            ];
        }

        return $response->json();
    }

    /**
     * Notifica o cliente sobre o status do fix
     */
    protected function notifyCustomer(WhatsAppService $whatsAppService, bool $success): void
    {
        $ticket = $this->fixRequest->ticket()->with('lead.contact')->first();
        if (!$ticket || !$ticket->lead || !$ticket->lead->contact) {
            return;
        }

        $channel = WhatsAppChannel::where('tenant_id', $this->fixRequest->tenant_id)
            ->where('is_active', true)
            ->first();

        if (!$channel) {
            return;
        }

        $whatsAppService->loadFromChannel($channel);
        $phone = $ticket->lead->contact->phone;

        if ($success) {
            $message = "Correção Aplicada!\n\n";
            $message .= "Acabei de aplicar uma correção no sistema. Você pode testar agora?\n\n";
            $message .= "Por favor, me diga:\n";
            $message .= "- FUNCIONOU - se o problema foi resolvido\n";
            $message .= "- NÃO FUNCIONOU - se ainda está com problemas\n\n";
            $message .= "Seu feedback é muito importante para garantirmos a qualidade!";
        } else {
            $message = "Encontrei uma dificuldade técnica ao aplicar a correção. ";
            $message .= "Estou transferindo para um desenvolvedor humano que vai resolver o mais rápido possível.";
        }

        $whatsAppService->sendTextMessage($phone, $message);
    }

    /**
     * Notifica o desenvolvedor sobre erro na execução
     */
    protected function notifyDeveloperError(WhatsAppService $whatsAppService, string $error): void
    {
        $tenant = $this->fixRequest->tenant;
        $fixSettings = $tenant->fix_agent_settings ?? [];
        $approverPhones = $fixSettings['approver_phones'] ?? [];

        if (empty($approverPhones)) {
            return;
        }

        $channel = WhatsAppChannel::where('tenant_id', $this->fixRequest->tenant_id)
            ->where('is_active', true)
            ->first();

        if (!$channel) {
            return;
        }

        $whatsAppService->loadFromChannel($channel);

        $message = "FALHA NA EXECUÇÃO DO FIX\n\n";
        $message .= "Arquivo: {$this->fixRequest->file_path}\n";
        $message .= "Erro: {$error}\n\n";
        $message .= "A correção foi escalada para intervenção manual.";

        foreach ($approverPhones as $phone) {
            try {
                $whatsAppService->sendTextMessage($phone, $message);
            } catch (\Exception $e) {
                Log::warning('Failed to notify developer about fix error', [
                    'phone' => $phone,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
