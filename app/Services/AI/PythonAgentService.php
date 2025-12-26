<?php

namespace App\Services\AI;

use App\Models\Lead;
use App\Models\SdrAgent;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\Channel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * Serviço que integra com o microserviço Python de IA.
 * 
 * Este serviço é responsável por:
 * - Enviar requisições para o agente Python
 * - Processar respostas e executar ações
 * - Gerenciar fallbacks
 */
class PythonAgentService
{
    protected string $baseUrl;
    protected string $apiKey;
    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.ai_agent.url', 'http://localhost:8001');
        $this->apiKey = config('services.ai_agent.api_key', '');
        $this->timeout = config('services.ai_agent.timeout', 30);
    }

    /**
     * Executa o agente para uma mensagem recebida.
     */
    public function run(
        TicketMessage $message,
        Ticket $ticket,
        Lead $lead,
        SdrAgent $agent,
        Channel $channel
    ): ?array {
        try {
            // Monta payload
            $payload = $this->buildPayload($message, $ticket, $lead, $agent, $channel);

            // Chama o microserviço Python
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'X-API-Key' => $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/agent/run", $payload);

            if (!$response->successful()) {
                Log::error('Python agent request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $result = $response->json();

            // Log da interação
            $this->logInteraction($lead, $agent, $message, $result);

            return $result;

        } catch (\Exception $e) {
            Log::error('Python agent service error', [
                'error' => $e->getMessage(),
                'lead_id' => $lead->id,
            ]);
            return null;
        }
    }

    /**
     * Monta o payload para o microserviço Python.
     */
    protected function buildPayload(
        TicketMessage $message,
        Ticket $ticket,
        Lead $lead,
        SdrAgent $agent,
        Channel $channel
    ): array {
        // Carrega histórico de mensagens
        $history = $ticket->messages()
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->reverse()
            ->map(fn($m) => [
                'id' => $m->id,
                'content' => $m->message,
                'direction' => $m->direction->value,
                'sender_type' => $m->sender_type->value,
                'created_at' => $m->created_at->toISOString(),
                'metadata' => $m->metadata,
            ])
            ->values()
            ->toArray();

        // Carrega produtos do tenant
        $products = $lead->tenant->products()
            ->where('is_active', true)
            ->limit(20)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price' => $p->price,
                'description' => $p->description,
            ])
            ->toArray();

        // Carrega estágios do pipeline
        $stages = [];
        if ($lead->pipeline) {
            $stages = $lead->pipeline->stages()
                ->orderBy('order')
                ->get()
                ->map(fn($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'order' => $s->order,
                ])
                ->toArray();
        }

        return [
            // Mensagem atual
            'message' => $message->message,
            'message_id' => $message->id,
            'message_type' => $this->detectMessageType($message),

            // Lead
            'lead' => [
                'id' => $lead->id,
                'name' => $lead->contact->name ?? 'Lead',
                'phone' => $lead->contact->phone ?? '',
                'email' => $lead->contact->email ?? null,
                'stage_id' => $lead->stage_id,
                'stage_name' => $lead->stage?->name,
                'queue_id' => $lead->queue_id,
                'queue_name' => $lead->queue?->name,
                'value' => $lead->value ?? 0,
                'custom_fields' => is_array($lead->custom_fields) && !empty($lead->custom_fields) 
                    ? (object) $lead->custom_fields 
                    : (object) [],
                'created_at' => $lead->created_at?->toISOString(),
            ],

            // Agente
            'agent' => [
                'id' => $agent->id,
                'name' => $agent->name,
                'type' => $agent->type ?? 'sdr',
                'prompt' => $agent->system_prompt ?? $agent->prompt ?? 'Você é um assistente de vendas profissional.',
                'temperature' => $agent->temperature ?? 0.7,
                'ai_model' => $agent->ai_model ?? 'gpt-4o-mini',
                'max_tokens' => $agent->max_tokens ?? 1000,
                'auto_qualify' => $agent->auto_qualify ?? true,
                'auto_move_stage' => $agent->auto_move_stage ?? true,
                'transfer_on_complex' => $agent->transfer_on_complex ?? true,
                'forbidden_topics' => $agent->forbidden_topics ?? [],
                'required_qualifications' => $agent->required_qualifications ?? [],
                'tone' => $agent->tone ?? 'professional',
                'language' => $agent->language ?? 'pt-BR',
            ],

            // Tenant
            'tenant' => [
                'id' => $lead->tenant_id,
                'name' => $lead->tenant->name ?? '',
                'timezone' => $lead->tenant->timezone ?? 'America/Sao_Paulo',
                'business_hours' => $lead->tenant->business_hours ?? null,
                'products' => $products,
                'stages' => $stages,
            ],

            // Histórico
            'history' => $history,

            // Metadados
            'channel_id' => $channel->id,
            'ticket_id' => $ticket->id,

            // Flags
            'include_rag' => true,
            'include_long_memory' => true,
        ];
    }

    /**
     * Monta o payload para o worker de fila (mensagem combinada).
     */
    public function buildPayloadForQueue(
        string $combinedMessage,
        Ticket $ticket,
        Lead $lead,
        SdrAgent $agent,
        Channel $channel
    ): array {
        // Carrega histórico de mensagens
        $history = $ticket->messages()
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->reverse()
            ->map(fn($m) => [
                'id' => $m->id,
                'content' => $m->message,
                'direction' => $m->direction->value,
                'sender_type' => $m->sender_type->value,
                'created_at' => $m->created_at->toISOString(),
                'metadata' => $m->metadata,
            ])
            ->values()
            ->toArray();

        // Carrega produtos do tenant
        $products = $lead->tenant->products()
            ->where('is_active', true)
            ->limit(20)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price' => $p->price,
                'description' => $p->description,
            ])
            ->toArray();

        // Carrega estágios do pipeline
        $stages = [];
        if ($lead->pipeline) {
            $stages = $lead->pipeline->stages()
                ->orderBy('order')
                ->get()
                ->map(fn($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'order' => $s->order,
                ])
                ->toArray();
        }

        return [
            // Mensagem combinada (pode ter múltiplas linhas)
            'message' => $combinedMessage,
            'message_id' => 'combined_' . now()->timestamp,
            'message_type' => 'text',

            // Lead
            'lead' => [
                'id' => $lead->id,
                'name' => $lead->contact->name ?? 'Lead',
                'phone' => $lead->contact->phone ?? '',
                'email' => $lead->contact->email ?? null,
                'stage_id' => $lead->stage_id,
                'stage_name' => $lead->stage?->name,
                'value' => $lead->value ?? 0,
                'custom_fields' => is_array($lead->custom_fields) && !empty($lead->custom_fields) 
                    ? (object) $lead->custom_fields 
                    : (object) [],
                'created_at' => $lead->created_at?->toISOString(),
            ],

            // Agente
            'agent' => [
                'id' => $agent->id,
                'name' => $agent->name,
                'type' => $agent->type ?? 'sdr',
                'prompt' => $agent->system_prompt ?? $agent->prompt ?? 'Você é um assistente de vendas profissional.',
                'temperature' => $agent->temperature ?? 0.7,
                'ai_model' => $agent->ai_model ?? 'gpt-4o-mini',
                'max_tokens' => $agent->max_tokens ?? 1000,
                'auto_qualify' => $agent->auto_qualify ?? true,
                'auto_move_stage' => $agent->auto_move_stage ?? true,
                'transfer_on_complex' => $agent->transfer_on_complex ?? true,
                'forbidden_topics' => $agent->forbidden_topics ?? [],
                'required_qualifications' => $agent->required_qualifications ?? [],
                'tone' => $agent->tone ?? 'professional',
                'language' => $agent->language ?? 'pt-BR',
            ],

            // Tenant
            'tenant' => [
                'id' => $lead->tenant_id,
                'name' => $lead->tenant->name ?? '',
                'timezone' => $lead->tenant->timezone ?? 'America/Sao_Paulo',
                'business_hours' => $lead->tenant->business_hours ?? null,
                'products' => $products,
                'stages' => $stages,
            ],

            // Histórico
            'history' => $history,

            // Metadados
            'channel_id' => $channel->id,
            'ticket_id' => $ticket->id,

            // Flags
            'include_rag' => true,
            'include_long_memory' => true,
        ];
    }

    /**
     * Detecta o tipo da mensagem.
     */
    protected function detectMessageType(TicketMessage $message): string
    {
        $metadata = $message->metadata ?? [];

        if (!empty($metadata['audio_url']) || !empty($metadata['voice_url'])) {
            return 'audio';
        }

        if (!empty($metadata['image_url']) || !empty($metadata['media_url'])) {
            return 'image';
        }

        return 'text';
    }

    /**
     * Registra log da interação.
     */
    protected function logInteraction(
        Lead $lead,
        SdrAgent $agent,
        TicketMessage $message,
        array $result
    ): void {
        try {
            \DB::table('agent_interaction_logs')->insert([
                'id' => \Str::uuid(),
                'tenant_id' => $lead->tenant_id,
                'sdr_agent_id' => $agent->id,
                'lead_id' => $lead->id,
                'ticket_id' => $message->ticket_id,
                'message_id' => $message->id,
                'user_message' => $message->message,
                'detected_intent' => $result['intent']['name'] ?? null,
                'intent_confidence' => $result['intent']['confidence'] ?? null,
                'action_taken' => $result['action'] ?? 'unknown',
                'agent_response' => $result['message'] ?? null,
                'action_confidence' => $result['decision']['confidence'] ?? null,
                'lead_temperature' => $result['qualification']['temperature'] ?? null,
                'lead_score' => $result['qualification']['score'] ?? null,
                'qualification_data' => json_encode($result['qualification'] ?? []),
                'rag_chunks_used' => $result['context_used']['rag_chunks'] ?? 0,
                'history_messages_used' => $result['context_used']['history_messages'] ?? 0,
                'response_time_ms' => $result['metrics']['duration_ms'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to log agent interaction', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Classifica intenção de uma mensagem.
     */
    public function classifyIntent(string $message, array $history = []): ?array
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders(['X-API-Key' => $this->apiKey])
                ->post("{$this->baseUrl}/agent/classify-intent", [
                    'message' => $message,
                    'history' => $history,
                ]);

            return $response->successful() ? $response->json() : null;

        } catch (\Exception $e) {
            Log::error('Intent classification failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Qualifica um lead.
     */
    public function qualifyLead(Lead $lead, array $messages): ?array
    {
        try {
            $response = Http::timeout(15)
                ->withHeaders(['X-API-Key' => $this->apiKey])
                ->post("{$this->baseUrl}/agent/qualify", [
                    'lead' => [
                        'id' => $lead->id,
                        'name' => $lead->contact->name ?? 'Lead',
                        'phone' => $lead->contact->phone ?? '',
                        'email' => $lead->contact->email ?? null,
                        'stage_name' => $lead->stage?->name,
                        'value' => $lead->value ?? 0,
                    ],
                    'messages' => $messages,
                ]);

            return $response->successful() ? $response->json() : null;

        } catch (\Exception $e) {
            Log::error('Lead qualification failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Verifica se o serviço está disponível.
     */
    public function isAvailable(): bool
    {
        $cacheKey = 'ai_agent_service_available';

        return Cache::remember($cacheKey, 60, function () {
            try {
                $response = Http::timeout(5)
                    ->get("{$this->baseUrl}/health");

                return $response->successful();

            } catch (\Exception $e) {
                return false;
            }
        });
    }
}

