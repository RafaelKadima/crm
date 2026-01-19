<?php

namespace App\Services;

use App\Models\Channel;
use App\Models\Lead;
use App\Models\SdrAgent;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class N8nWebhookService
{
    protected string $baseUrl;
    protected ?SemanticSearchService $semanticSearch = null;
    protected ?ContextCacheService $cacheService = null;

    public function __construct(
        ?SemanticSearchService $semanticSearch = null,
        ?ContextCacheService $cacheService = null
    ) {
        $this->baseUrl = config('services.n8n.base_url', 'http://localhost:5678');
        $this->semanticSearch = $semanticSearch ?? app(SemanticSearchService::class);
        $this->cacheService = $cacheService ?? app(ContextCacheService::class);
    }

    /**
     * Busca o SDR Agent para o lead/canal.
     */
    protected function findSdrAgent(Channel $channel, ?Lead $lead = null): ?SdrAgent
    {
        // Se a fila do lead tem SDR desabilitado, não usa nenhum agente
        if ($lead && $lead->queue_id) {
            $lead->loadMissing('queue');
            if ($lead->queue && $lead->queue->sdr_disabled) {
                return null;
            }
        }

        // Priority 1: Queue's SDR Agent
        if ($lead && $lead->queue_id) {
            $lead->loadMissing('queue.sdrAgent');
            if ($lead->queue && $lead->queue->sdr_agent_id) {
                $agent = $lead->queue->sdrAgent;
                if ($agent && $agent->is_active) {
                    return $agent;
                }
            }
        }

        // Priority 2: Pipeline's SDR Agent
        if ($lead && $lead->pipeline_id) {
            $lead->loadMissing('pipeline.sdrAgent');
            if ($lead->pipeline && $lead->pipeline->sdr_agent_id) {
                $agent = $lead->pipeline->sdrAgent;
                if ($agent && $agent->is_active) {
                    return $agent;
                }
            }
        }

        // Priority 3: Channel's SDR Agent
        if ($channel->sdr_agent_id) {
            $channel->loadMissing('sdrAgent');
            $agent = $channel->sdrAgent;
            if ($agent && $agent->is_active) {
                return $agent;
            }
        }

        // Fallback: Any active agent linked to channel
        return SdrAgent::where('channel_id', $channel->id)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Notifica o n8n sobre nova mensagem recebida.
     */
    public function notifyNewMessage(TicketMessage $message, Ticket $ticket, Lead $lead, Channel $channel): bool
    {
        if (!$channel->hasIa() || empty($channel->ia_workflow_id)) {
            Log::debug('Channel does not have IA configured', ['channel_id' => $channel->id]);
            return false;
        }

        $webhookUrl = $this->buildWebhookUrl($channel->ia_workflow_id);

        try {
            $payload = $this->buildMessagePayload($message, $ticket, $lead, $channel);
            
            $response = Http::timeout(10)
                ->post($webhookUrl, $payload);

            if ($response->successful()) {
                Log::info('n8n webhook notified successfully', [
                    'workflow_id' => $channel->ia_workflow_id,
                    'message_id' => $message->id,
                ]);
                return true;
            }

            Log::warning('n8n webhook failed', [
                'workflow_id' => $channel->ia_workflow_id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return false;

        } catch (\Exception $e) {
            Log::error('n8n webhook error', [
                'workflow_id' => $channel->ia_workflow_id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Notifica o n8n sobre novo lead criado.
     */
    public function notifyNewLead(Lead $lead, Channel $channel): bool
    {
        if (!$channel->hasIa() || empty($channel->ia_workflow_id)) {
            return false;
        }

        $webhookUrl = $this->buildWebhookUrl($channel->ia_workflow_id . '-new-lead');

        try {
            $payload = $this->buildLeadPayload($lead, $channel);
            
            $response = Http::timeout(10)
                ->post($webhookUrl, $payload);

            return $response->successful();

        } catch (\Exception $e) {
            Log::error('n8n new lead webhook error', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Constrói URL do webhook n8n.
     */
    protected function buildWebhookUrl(string $workflowId): string
    {
        // Se já é uma URL completa, usa diretamente
        if (str_starts_with($workflowId, 'http')) {
            return $workflowId;
        }

        // Senão, monta a URL do n8n
        return "{$this->baseUrl}/webhook/{$workflowId}";
    }

    /**
     * Constrói payload da mensagem para o n8n.
     */
    protected function buildMessagePayload(TicketMessage $message, Ticket $ticket, Lead $lead, Channel $channel): array
    {
        $lead->load(['contact', 'owner', 'stage', 'products', 'queue']);

        // Busca o SDR Agent configurado (respeitando sdr_disabled da fila)
        $sdrAgent = $this->findSdrAgent($channel, $lead);

        $payload = [
            'event' => 'message.received',
            'timestamp' => now()->toIso8601String(),
            
            // Dados da mensagem
            'message' => [
                'id' => $message->id,
                'content' => $message->message,
                'direction' => $message->direction->value,
                'sender_type' => $message->sender_type->value,
                'sent_at' => $message->sent_at?->toIso8601String(),
            ],
            
            // Dados do ticket
            'ticket' => [
                'id' => $ticket->id,
                'status' => $ticket->status->value,
            ],
            
            // Dados do lead
            'lead' => [
                'id' => $lead->id,
                'status' => $lead->status->value,
                'value' => $lead->value,
                'stage' => $lead->stage ? [
                    'id' => $lead->stage->id,
                    'name' => $lead->stage->name,
                    'order' => $lead->stage->order,
                ] : null,
                'owner' => $lead->owner ? [
                    'id' => $lead->owner->id,
                    'name' => $lead->owner->name,
                ] : null,
                'products' => $lead->products->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'price' => $p->current_price,
                ])->toArray(),
                'source' => $this->detectLeadSource($lead),
            ],
            
            // Dados do contato
            'contact' => [
                'id' => $lead->contact->id,
                'name' => $lead->contact->name,
                'phone' => $lead->contact->phone,
                'email' => $lead->contact->email,
                'cpf' => $lead->contact->cpf,
                'address' => $lead->contact->address,
            ],
            
            // Dados do canal
            'channel' => [
                'id' => $channel->id,
                'name' => $channel->name,
                'type' => $channel->type->value,
                'ia_mode' => $channel->ia_mode->value,
            ],

            // URLs da API para o n8n usar
            'api' => [
                'update_stage' => url("/api/ia/leads/{$lead->id}/update-stage"),
                'update_data' => url("/api/ia/leads/{$lead->id}/update-data"),
                'assign_owner' => url("/api/ia/leads/{$lead->id}/assign-owner"),
                'send_message' => url("/api/ia/tickets/{$ticket->id}/messages"),
                'send_whatsapp' => url("/api/whatsapp/tickets/{$ticket->id}/send"),
            ],
        ];

        // Adiciona dados do SDR Agent se existir (com RAG + Cache)
        if ($sdrAgent) {
            $sdrAgent->markAsUsed();
            
            // RAG: Busca apenas contexto relevante para a mensagem
            $ragContext = $this->semanticSearch->searchRelevantContext(
                $sdrAgent,
                $message->message, // Query é a mensagem do usuário
                maxChunks: 5,
                maxTokens: 2000
            );

            // Cache: Otimiza envio do prompt estático
            $optimizedPayload = $this->cacheService->buildOptimizedPayload($sdrAgent, $ragContext);

            $payload['sdr_agent'] = [
                'id' => $sdrAgent->id,
                'name' => $sdrAgent->name,
                'model' => $sdrAgent->ai_model,
                'temperature' => (float) $sdrAgent->temperature,
                'language' => $sdrAgent->language,
                'tone' => $sdrAgent->tone,
                
                // Prompt com instruções do pipeline do lead
                'prompt' => $sdrAgent->buildFullPrompt($lead->pipeline),
                
                // Contexto otimizado com RAG (apenas o relevante)
                'context' => $optimizedPayload,
                
                // Métricas para monitoramento
                'rag_metrics' => [
                    'chunks_found' => $ragContext['chunks_found'] ?? 0,
                    'chunks_selected' => $ragContext['chunks_selected'] ?? 0,
                    'estimated_tokens' => $ragContext['total_tokens'] ?? 0,
                    'cache_valid' => $optimizedPayload['cache']['valid'] ?? false,
                ],
            ];

            // Marca cache como usado
            $this->cacheService->markCacheUsed($sdrAgent);

            Log::info('SDR Agent RAG context built', [
                'agent_id' => $sdrAgent->id,
                'message_preview' => substr($message->message, 0, 50),
                'chunks_selected' => $ragContext['chunks_selected'] ?? 0,
                'tokens' => $ragContext['total_tokens'] ?? 0,
            ]);
        }

        return $payload;
    }

    /**
     * Constrói payload do lead para o n8n.
     */
    protected function buildLeadPayload(Lead $lead, Channel $channel): array
    {
        $lead->load(['contact', 'stage']);

        return [
            'event' => 'lead.created',
            'timestamp' => now()->toIso8601String(),
            'lead' => [
                'id' => $lead->id,
                'status' => $lead->status->value,
                'source' => $this->detectLeadSource($lead),
            ],
            'contact' => [
                'id' => $lead->contact->id,
                'name' => $lead->contact->name,
                'phone' => $lead->contact->phone,
            ],
            'channel' => [
                'id' => $channel->id,
                'name' => $channel->name,
                'type' => $channel->type->value,
            ],
        ];
    }

    /**
     * Detecta a origem do lead (landing page, whatsapp, etc).
     */
    protected function detectLeadSource(Lead $lead): string
    {
        // Verifica se veio de landing page
        if ($lead->contact && $lead->contact->source === 'landing_page') {
            return 'landing_page';
        }

        // Verifica extra_data do contato
        $extraData = $lead->contact->extra_data ?? [];
        if (!empty($extraData['landing_page_id'])) {
            return 'landing_page';
        }

        // Retorna o canal
        return $lead->channel?->type->value ?? 'unknown';
    }
}

