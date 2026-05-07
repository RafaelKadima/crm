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
 *     "service_account_token": "<oauth bearer>"  // já trocado por access_token
 *   }
 *
 * NOTA: a troca de service account JSON → access_token deveria ser feita
 * num job paralelo (token expira a cada 1h). Aqui usamos o token vivo
 * — orquestração de refresh fica pra OAuth proxy refactor (Sprint 5
 * follow-up).
 */
class DialogflowAdapter implements ExternalAiAdapter
{
    public function name(): string
    {
        return 'dialogflow';
    }

    public function sendMessage(Ticket $ticket, string $message, array $config): ExternalAiResponse
    {
        $required = ['project_id', 'agent_id', 'service_account_token'];
        foreach ($required as $key) {
            if (empty($config[$key])) {
                Log::warning('Dialogflow: missing config', ['missing' => $key, 'ticket' => $ticket->id]);
                return ExternalAiResponse::empty();
            }
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
            $response = Http::withToken($config['service_account_token'])
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
