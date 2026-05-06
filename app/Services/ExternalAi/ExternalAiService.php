<?php

namespace App\Services\ExternalAi;

use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Events\TicketMessageCreated;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Services\WhatsAppService;
use Illuminate\Support\Facades\Log;

/**
 * Orquestra handoff pra IA externa. Decide se aciona, escolhe o
 * adapter certo, persiste a resposta como TicketMessage e dispara
 * envio via WhatsApp.
 *
 * Triggers (config no channel.external_ai_config.trigger):
 *   - manual:               só por comando do atendente (futura UI)
 *   - keyword:              quando inbound bate com keywords
 *                           (config.trigger_keywords array)
 *   - auto_after_minutes:   X minutos sem resposta humana
 *                           (verificado por job em Sprint 8)
 */
class ExternalAiService
{
    /**
     * Aciona handoff pra IA externa se o channel está configurado.
     * Retorna o TicketMessage da resposta (ou null).
     */
    public function handleInbound(TicketMessage $inbound, Ticket $ticket, Channel $channel): ?TicketMessage
    {
        $config = $channel->external_ai_config ?? [];
        $provider = $config['provider'] ?? 'none';

        if ($provider === 'none' || empty($provider)) {
            return null;
        }

        if (!$this->shouldTrigger($inbound, $ticket, $config)) {
            return null;
        }

        $adapter = $this->resolveAdapter($provider);
        if (!$adapter) {
            Log::warning('ExternalAi: provider not supported', ['provider' => $provider]);
            return null;
        }

        $response = $adapter->sendMessage($ticket, (string) $inbound->message, $config);

        // Atualiza session_id mesmo se a resposta vier vazia — preserva
        // continuidade de contexto se a próxima inbound bater de novo.
        $updates = [
            'external_ai_provider' => $provider,
            'external_ai_handoff_at' => $ticket->external_ai_handoff_at ?? now(),
        ];
        if ($response->sessionId) {
            $updates['external_ai_session_id'] = $response->sessionId;
        }
        $ticket->update($updates);

        if ($response->shouldHandoffHuman || $response->text === '') {
            // IA não conseguiu — desliga flag pra próxima inbound não
            // dispará-la de novo (humano assume).
            $ticket->update([
                'external_ai_provider' => null,
                'external_ai_handoff_at' => null,
            ]);
            return null;
        }

        // Envia resposta + persiste
        return $this->sendAndPersist($response, $ticket, $channel, $provider);
    }

    protected function shouldTrigger(TicketMessage $inbound, Ticket $ticket, array $config): bool
    {
        $trigger = $config['trigger'] ?? 'manual';

        // Se já está em handoff, todo inbound vai pra IA até o handoff
        // ser revogado (pelo próprio adapter retornando shouldHandoffHuman).
        if ($ticket->hasExternalAiActive()) {
            return true;
        }

        return match ($trigger) {
            'keyword' => $this->matchesKeywords((string) $inbound->message, $config['trigger_keywords'] ?? []),
            'auto_after_minutes' => false, // gerenciado por job separado
            'manual' => false,
            default => false,
        };
    }

    protected function matchesKeywords(string $body, array $keywords): bool
    {
        $body = mb_strtolower(trim($body));
        foreach ($keywords as $kw) {
            $needle = mb_strtolower(trim((string) $kw));
            if ($needle !== '' && mb_strpos($body, $needle) !== false) {
                return true;
            }
        }
        return false;
    }

    protected function resolveAdapter(string $provider): ?ExternalAiAdapter
    {
        return match ($provider) {
            'dialogflow' => app(DialogflowAdapter::class),
            'dify' => app(DifyAdapter::class),
            default => null,
        };
    }

    protected function sendAndPersist(
        ExternalAiResponse $response,
        Ticket $ticket,
        Channel $channel,
        string $provider,
    ): TicketMessage {
        /** @var WhatsAppService $whatsApp */
        $whatsApp = app(WhatsAppService::class)->loadFromChannel($channel);

        $contact = $ticket->contact;
        if ($contact && $contact->phone) {
            try {
                $whatsApp->sendTextMessage($contact->phone, $response->text);
            } catch (\Throwable $e) {
                Log::error('ExternalAi: failed to deliver response', [
                    'ticket' => $ticket->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $message = TicketMessage::create([
            'tenant_id' => $ticket->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::SYSTEM,
            'direction' => MessageDirectionEnum::OUTBOUND,
            'message' => $response->text,
            'metadata' => [
                'external_ai_provider' => $provider,
                'external_ai_session_id' => $response->sessionId,
                'intent' => $response->metadata['intent'] ?? null,
            ],
            'sent_at' => now(),
        ]);

        event(new TicketMessageCreated($message, $ticket));

        return $message;
    }
}
