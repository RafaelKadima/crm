<?php

namespace App\Services\ExternalAi;

use App\Models\Ticket;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Adapter Dialogflow CX (v3). Documentação:
 * https://cloud.google.com/dialogflow/cx/docs/reference/rest/v3/projects.locations.agents.sessions/detectIntent
 *
 * Config esperado em channel.external_ai_config:
 *   {
 *     "provider": "dialogflow",
 *     "project_id": "my-project-12345",
 *     "location": "global" | "us-central1" | ...,
 *     "agent_id": "<uuid>",
 *     "language_code": "pt-BR",
 *
 *     // Forma RECOMENDADA — JSON inteiro do service account
 *     // (encrypted via cast Eloquent quando salvo). Refresh
 *     // automático via JWT exchange com cache 55min.
 *     "service_account_json": { "client_email": ..., "private_key": ..., "token_uri": ... }
 *
 *     // OU forma legacy (deprecated) — token raw já trocado
 *     // (responsabilidade do operador refrescar em <1h)
 *     "service_account_token": "ya29.a0..."
 *   }
 *
 * Refresh automático implementado pelo GoogleAuthService:
 *   - JWT signing manual com RS256 (openssl_sign nativo)
 *   - Token cacheado no Redis por 55min (5min buffer antes de expirar)
 *   - Múltiplos channels com mesmo service account compartilham cache
 */
class DialogflowAdapter implements ExternalAiAdapter
{
    public function name(): string
    {
        return 'dialogflow';
    }

    public function sendMessage(Ticket $ticket, string $message, array $config): ExternalAiResponse
    {
        if (empty($config['project_id']) || empty($config['agent_id'])) {
            Log::warning('Dialogflow: missing project_id ou agent_id', ['ticket' => $ticket->id]);
            return ExternalAiResponse::empty();
        }

        $accessToken = app(GoogleAuthService::class)->getDialogflowAccessToken($config);
        if (!$accessToken) {
            Log::warning('Dialogflow: failed to obtain access token', ['ticket' => $ticket->id]);
            return ExternalAiResponse::empty();
        }

        $location = $config['location'] ?? 'global';
        $sessionId = $ticket->external_ai_session_id ?: (string) Str::uuid();
        $languageCode = $config['language_code'] ?? 'pt-BR';

        $endpoint = sprintf(
            'https://%sdialogflow.googleapis.com/v3/projects/%s/locations/%s/agents/%s/sessions/%s:detectIntent',
            $location === 'global' ? '' : "{$location}-",
            $config['project_id'],
            $location,
            $config['agent_id'],
            $sessionId,
        );

        try {
            $response = Http::withToken($accessToken)
                ->timeout(15)
                ->post($endpoint, [
                    'queryInput' => [
                        'text' => ['text' => $message],
                        'languageCode' => $languageCode,
                    ],
                ]);

            if (!$response->successful()) {
                Log::warning('Dialogflow: non-2xx response', [
                    'ticket' => $ticket->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return ExternalAiResponse::empty();
            }

            $data = $response->json();
            $messages = $data['queryResult']['responseMessages'] ?? [];
            $text = '';
            foreach ($messages as $msg) {
                if (!empty($msg['text']['text'][0])) {
                    $text .= $msg['text']['text'][0] . "\n";
                }
            }

            $intent = $data['queryResult']['match']['intent']['displayName'] ?? '';
            $shouldHandoff = stripos($intent, 'handoff') !== false
                || stripos($intent, 'human') !== false
                || empty(trim($text));

            return new ExternalAiResponse(
                text: trim($text),
                sessionId: $sessionId,
                shouldHandoffHuman: $shouldHandoff,
                metadata: ['intent' => $intent, 'raw' => $data],
            );
        } catch (\Throwable $e) {
            Log::error('Dialogflow: request failed', [
                'ticket' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
            return ExternalAiResponse::empty();
        }
    }
}
