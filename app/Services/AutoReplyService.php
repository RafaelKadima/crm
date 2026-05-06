<?php

namespace App\Services;

use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Events\TicketMessageCreated;
use App\Models\AutoReply;
use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Support\Facades\Log;

/**
 * Match de keywords em mensagens inbound + envio de resposta automática.
 *
 * Chamado pelo WhatsAppService ANTES do AI agent dispatch — se há
 * match com `skip_ai_after_match=true`, IA não é acionada (atalho
 * pra perguntas determinísticas tipo "qual o preço").
 *
 * Resposta é persistida como TicketMessage (sender_type=SYSTEM) e
 * enviada via WhatsApp Cloud API.
 */
class AutoReplyService
{
    /**
     * Procura match e responde. Retorna a AutoReply matched (ou null).
     *
     * @return AutoReply|null
     */
    public function matchAndRespond(TicketMessage $inbound, Ticket $ticket, Channel $channel): ?AutoReply
    {
        $body = trim((string) $inbound->message);
        if ($body === '') {
            return null;
        }

        $autoReply = $this->findMatching($body, $channel, $ticket);
        if (!$autoReply) {
            return null;
        }

        try {
            $this->sendResponse($autoReply, $ticket, $channel);
            return $autoReply;
        } catch (\Throwable $e) {
            Log::warning('AutoReply send failed', [
                'auto_reply_id' => $autoReply->id,
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Encontra a AutoReply de maior priority que bate com o body.
     * Filtra por scope (tenant + channel opcional + queue opcional).
     */
    public function findMatching(string $body, Channel $channel, Ticket $ticket): ?AutoReply
    {
        $queueId = $ticket->lead?->queue_id;

        $candidates = AutoReply::query()
            ->where('tenant_id', $channel->tenant_id)
            ->where('is_active', true)
            ->where(function ($q) use ($channel) {
                $q->whereNull('channel_id')->orWhere('channel_id', $channel->id);
            })
            ->where(function ($q) use ($queueId) {
                $q->whereNull('queue_id');
                if ($queueId) {
                    $q->orWhere('queue_id', $queueId);
                }
            })
            ->orderByDesc('priority')
            ->orderBy('created_at')
            ->get();

        foreach ($candidates as $candidate) {
            if ($this->matches($body, $candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Aplica a estratégia de match conforme o tipo configurado.
     */
    protected function matches(string $body, AutoReply $rule): bool
    {
        $keywords = (array) ($rule->keywords ?? []);
        if (empty($keywords)) {
            return false;
        }

        $bodyLower = mb_strtolower($body);

        return match ($rule->match_type) {
            AutoReply::MATCH_EXACT => $this->matchExact($bodyLower, $keywords),
            AutoReply::MATCH_CONTAINS => $this->matchContains($bodyLower, $keywords),
            AutoReply::MATCH_REGEX => $this->matchRegex($body, $keywords),
            default => false,
        };
    }

    protected function matchExact(string $body, array $keywords): bool
    {
        foreach ($keywords as $kw) {
            if ($body === mb_strtolower(trim((string) $kw))) {
                return true;
            }
        }
        return false;
    }

    protected function matchContains(string $body, array $keywords): bool
    {
        foreach ($keywords as $kw) {
            $needle = mb_strtolower(trim((string) $kw));
            if ($needle !== '' && mb_strpos($body, $needle) !== false) {
                return true;
            }
        }
        return false;
    }

    /**
     * Regex sandboxed: pcre.backtrack_limit + jit limitam runaway.
     * Padrões inválidos retornam false (e logam warning).
     */
    protected function matchRegex(string $body, array $keywords): bool
    {
        foreach ($keywords as $pattern) {
            $pattern = (string) $pattern;
            if ($pattern === '') {
                continue;
            }

            // Garante delimitador — usuário pode passar "preço" em vez de "/preço/i"
            if (!preg_match('/^[\/#~].*[\/#~][a-z]*$/i', $pattern)) {
                $pattern = '/' . str_replace('/', '\/', $pattern) . '/iu';
            }

            $result = @preg_match($pattern, $body);
            if ($result === 1) {
                return true;
            }

            if ($result === false) {
                Log::warning('AutoReply: invalid regex', ['pattern' => $pattern]);
            }
        }
        return false;
    }

    /**
     * Persiste a resposta como TicketMessage e envia via Cloud API.
     */
    protected function sendResponse(AutoReply $rule, Ticket $ticket, Channel $channel): void
    {
        /** @var WhatsAppService $whatsApp */
        $whatsApp = app(WhatsAppService::class)->loadFromChannel($channel);

        $contact = $ticket->contact;
        if (!$contact || !$contact->phone) {
            return;
        }

        // Envia mídia primeiro (se houver) — mídia + caption juntos numa
        // mensagem só seria possível, mas mantemos separado pra simplicidade
        if (!empty($rule->response_media_url)) {
            $whatsApp->sendMediaMessage(
                $contact->phone,
                $rule->response_media_url,
                $rule->response_media_type ?: 'image',
                $rule->response_text,
            );
        } elseif (!empty($rule->response_text)) {
            $whatsApp->sendTextMessage($contact->phone, $rule->response_text);
        }

        $message = TicketMessage::create([
            'tenant_id' => $ticket->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::SYSTEM,
            'direction' => MessageDirectionEnum::OUTBOUND,
            'message' => $rule->response_text ?? '[mídia]',
            'metadata' => [
                'auto_reply_id' => $rule->id,
                'auto_reply_name' => $rule->name,
                'media_url' => $rule->response_media_url,
                'media_type' => $rule->response_media_type,
            ],
            'sent_at' => now(),
        ]);

        event(new TicketMessageCreated($message, $ticket));
    }
}
