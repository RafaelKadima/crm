<?php

namespace App\Services\ExternalAi;

use App\Models\Ticket;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Adapter Dify (https://docs.dify.ai/guides/application-publishing/developing-with-apis/chat).
 *
 * Config esperado em channel.external_ai_config:
 *   {
 *     "provider": "dify",
 *     "api_key": "app-xxxxx",
 *     "endpoint": "https://api.dify.ai/v1"   // ou self-hosted
 *   }
 *
 * Dify mantém conversation_id por usuário — usamos ticket.contact.phone
 * como user identifier estável.
 */
class DifyAdapter implements ExternalAiAdapter
{
    public function name(): string
    {
        return 'dify';
    }

    public function sendMessage(Ticket $ticket, string $message, array $config): ExternalAiResponse
    {
        if (empty($config['api_key'])) {
            Log::warning('Dify: missing api_key', ['ticket' => $ticket->id]);
            return ExternalAiResponse::empty();
        }

        $endpoint = rtrim($config['endpoint'] ?? 'https://api.dify.ai/v1', '/') . '/chat-messages';
        $userId = $ticket->contact?->phone ?? "ticket-{$ticket->id}";

        try {
            $response = Http::withToken($config['api_key'])
                ->timeout(20)
                ->post($endpoint, [
                    'inputs' => [],
                    'query' => $message,
                    'response_mode' => 'blocking',
                    'user' => $userId,
                    'conversation_id' => $ticket->external_ai_session_id ?: '',
                ]);

            if (!$response->successful()) {
                Log::warning('Dify: non-2xx response', [
                    'ticket' => $ticket->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return ExternalAiResponse::empty();
            }

            $data = $response->json();
            $answer = trim((string) ($data['answer'] ?? ''));
            $conversationId = $data['conversation_id'] ?? null;

            $shouldHandoff = $answer === ''
                || str_contains(strtolower($answer), '[handoff]')
                || str_contains(strtolower($answer), 'transferir para atendente');

            return new ExternalAiResponse(
                text: $answer,
                sessionId: $conversationId,
                shouldHandoffHuman: $shouldHandoff,
                metadata: $data,
            );
        } catch (\Throwable $e) {
            Log::error('Dify: request failed', [
                'ticket' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
            return ExternalAiResponse::empty();
        }
    }
}
