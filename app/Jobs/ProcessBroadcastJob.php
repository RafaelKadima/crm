<?php

namespace App\Jobs;

use App\Enums\BroadcastMessageStatusEnum;
use App\Enums\BroadcastStatusEnum;
use App\Models\Broadcast;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class ProcessBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 3600;

    public function __construct(
        public Broadcast $broadcast
    ) {}

    public function handle(WhatsAppService $whatsAppService): void
    {
        $broadcast = $this->broadcast->fresh();

        if (!$broadcast || $broadcast->status !== BroadcastStatusEnum::SENDING) {
            return;
        }

        // Send-window check: se está fora da janela permitida, posterga
        // pro próximo horário válido em vez de queimar tentativas.
        if (!$broadcast->isWithinSendWindow()) {
            $next = $broadcast->nextAllowedSendAt();
            $delaySeconds = $next ? max(60, $next->diffInSeconds(now())) : 3600;

            Log::info('[Broadcast] Fora da send_window, postergando', [
                'broadcast_id' => $broadcast->id,
                'next_at' => $next?->toIso8601String(),
                'delay_seconds' => $delaySeconds,
            ]);

            $this->release($delaySeconds);
            return;
        }

        Log::info('[Broadcast] Iniciando envio', [
            'broadcast_id' => $broadcast->id,
            'total' => $broadcast->total_recipients,
        ]);

        $channel = $broadcast->channel;
        $whatsAppService->loadFromChannel($channel);

        $template = $broadcast->template;

        $pendingMessages = $broadcast->messages()
            ->where('status', BroadcastMessageStatusEnum::PENDING)
            ->with('contact')
            ->cursor();

        foreach ($pendingMessages as $message) {
            // Verifica se foi pausado ou cancelado
            if ($this->shouldStop($broadcast)) {
                Log::info('[Broadcast] Envio interrompido', [
                    'broadcast_id' => $broadcast->id,
                    'reason' => $broadcast->fresh()->status->value,
                ]);
                return;
            }

            // Rate limit: 18 mps por tenant (coexistência = 20 mps max)
            $this->throttledSend($broadcast, $message, $whatsAppService, $template);
        }

        // Verifica se completou
        $remaining = $broadcast->messages()->pending()->count();
        if ($remaining === 0) {
            $broadcast->update([
                'status' => BroadcastStatusEnum::COMPLETED,
                'completed_at' => now(),
            ]);

            Log::info('[Broadcast] Envio concluído', [
                'broadcast_id' => $broadcast->id,
                'sent' => $broadcast->fresh()->sent_count,
                'failed' => $broadcast->fresh()->failed_count,
            ]);
        }
    }

    private function throttledSend(Broadcast $broadcast, $message, WhatsAppService $whatsAppService, $template): void
    {
        $maxRetries = 10;
        $attempt = 0;

        while ($attempt < $maxRetries) {
            try {
                Redis::throttle("broadcast:{$broadcast->tenant_id}")
                    ->allow(18)
                    ->every(1)
                    ->then(
                        fn () => $this->sendSingleMessage($broadcast, $message, $whatsAppService, $template),
                        function () use (&$attempt) {
                            $attempt++;
                            usleep(100_000); // 100ms
                        }
                    );
                return; // Enviou com sucesso ou falhou no send
            } catch (\Exception $e) {
                // Redis throttle exception — wait and retry
                $attempt++;
                usleep(100_000);
            }
        }

        // Esgotou tentativas de throttle — marca como falha
        $message->update([
            'status' => BroadcastMessageStatusEnum::FAILED,
            'error_message' => 'Rate limit: não conseguiu slot após retries',
        ]);
        $broadcast->increment('failed_count');
    }

    private function sendSingleMessage(Broadcast $broadcast, $message, WhatsAppService $whatsAppService, $template): void
    {
        try {
            $components = $this->buildComponents($template, $message->contact, $broadcast);

            $response = $whatsAppService->sendTemplateMessage(
                $message->phone,
                $template->name,
                $template->language ?? 'pt_BR',
                $components
            );

            $waMessageId = $response['messages'][0]['id'] ?? null;

            $message->update([
                'status' => BroadcastMessageStatusEnum::SENT,
                'whatsapp_message_id' => $waMessageId,
                'sent_at' => now(),
            ]);

            $broadcast->increment('sent_count');
        } catch (\Exception $e) {
            Log::warning('[Broadcast] Falha ao enviar mensagem', [
                'broadcast_id' => $broadcast->id,
                'contact_id' => $message->contact_id,
                'phone' => $message->phone,
                'error' => $e->getMessage(),
            ]);

            $message->update([
                'status' => BroadcastMessageStatusEnum::FAILED,
                'error_message' => Str::limit($e->getMessage(), 500),
            ]);

            $broadcast->increment('failed_count');
        }
    }

    /**
     * Monta os components do template com variáveis substituídas.
     */
    private function buildComponents($template, $contact, Broadcast $broadcast): array
    {
        $variableMappings = $broadcast->template_variables ?? [];

        if (empty($variableMappings)) {
            return [];
        }

        $parameters = [];
        foreach ($variableMappings as $mapping) {
            $value = $this->resolveVariable($mapping['field'] ?? '', $contact);
            $parameters[] = ['type' => 'text', 'text' => $value ?: '-'];
        }

        if (empty($parameters)) {
            return [];
        }

        return [
            [
                'type' => 'body',
                'parameters' => $parameters,
            ],
        ];
    }

    /**
     * Resolve o valor de uma variável a partir do campo.
     */
    private function resolveVariable(string $field, $contact): string
    {
        if (str_starts_with($field, 'custom:')) {
            return substr($field, 7);
        }

        return match ($field) {
            'contact.name' => $contact->name ?? '',
            'contact.phone' => $contact->phone ?? '',
            'contact.email' => $contact->email ?? '',
            default => '',
        };
    }

    /**
     * Verifica se o broadcast foi pausado ou cancelado.
     */
    private function shouldStop(Broadcast $broadcast): bool
    {
        // Recarrega a cada 50 mensagens para não fazer query excessivo
        static $counter = 0;
        $counter++;

        if ($counter % 50 !== 0) {
            return false;
        }

        $fresh = $broadcast->fresh();
        return !$fresh || $fresh->status !== BroadcastStatusEnum::SENDING;
    }
}
