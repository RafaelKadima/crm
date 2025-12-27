<?php

namespace App\Jobs;

use App\Models\AgentFixRequest;
use App\Models\WhatsAppChannel;
use App\Services\WhatsAppService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendFixApprovalRequest implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 30;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public AgentFixRequest $fixRequest,
        public array $approverPhones
    ) {}

    /**
     * Execute the job.
     */
    public function handle(WhatsAppService $whatsAppService): void
    {
        // Busca um canal WhatsApp do tenant para enviar a mensagem
        $channel = WhatsAppChannel::where('tenant_id', $this->fixRequest->tenant_id)
            ->where('is_active', true)
            ->first();

        if (!$channel) {
            Log::warning('No active WhatsApp channel found for fix approval', [
                'tenant_id' => $this->fixRequest->tenant_id,
                'fix_request_id' => $this->fixRequest->id,
            ]);
            return;
        }

        $whatsAppService->loadFromChannel($channel);
        $message = $this->fixRequest->formatForWhatsApp();

        // Envia para todos os aprovadores
        foreach ($this->approverPhones as $phone) {
            try {
                $whatsAppService->sendTextMessage($phone, $message);

                Log::info('Fix approval request sent', [
                    'fix_request_id' => $this->fixRequest->id,
                    'phone' => $phone,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send fix approval request', [
                    'fix_request_id' => $this->fixRequest->id,
                    'phone' => $phone,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
