<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Models\SdrAgent;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Job para salvar contexto da conversa para aprendizado da IA.
 * 
 * Este job é executado quando a IA está desabilitada no ticket,
 * mas queremos continuar coletando dados para treinar o agente.
 * 
 * Ele envia as mensagens recentes (incluindo respostas do vendedor humano)
 * para o ai-service salvar na memória de longo prazo do lead.
 */
class SaveConversationContext implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $timeout = 30;
    public array $backoff = [5, 15, 30];

    public function __construct(
        public string $ticketId,
        public string $leadId,
        public string $agentId,
        public string $tenantId
    ) {}

    public function handle(): void
    {
        $ticket = Ticket::find($this->ticketId);
        $lead = Lead::with('contact')->find($this->leadId);
        $agent = SdrAgent::find($this->agentId);

        if (!$ticket || !$lead || !$agent) {
            Log::warning('SaveConversationContext: missing required entities', [
                'ticket_id' => $this->ticketId,
                'lead_id' => $this->leadId,
                'agent_id' => $this->agentId,
            ]);
            return;
        }

        // Busca as últimas mensagens do ticket (incluindo do vendedor humano)
        $messages = TicketMessage::where('ticket_id', $this->ticketId)
            ->orderBy('sent_at', 'desc')
            ->take(20)
            ->get()
            ->reverse()
            ->values();

        if ($messages->isEmpty()) {
            return;
        }

        // Formata as mensagens para o ai-service
        $formattedMessages = $messages->map(function ($msg) {
            return [
                'id' => $msg->id,
                'content' => $msg->message,
                'direction' => $msg->direction->value ?? $msg->direction,
                'sender_type' => $msg->sender_type->value ?? $msg->sender_type,
                'created_at' => $msg->sent_at?->toISOString() ?? now()->toISOString(),
            ];
        })->toArray();

        // Prepara payload para o ai-service
        $payload = [
            'action' => 'save_learning_context',
            'ticket_id' => $this->ticketId,
            'lead' => [
                'id' => $lead->id,
                'name' => $lead->contact?->name ?? 'Lead',
                'phone' => $lead->contact?->phone ?? '',
            ],
            'agent_id' => $this->agentId,
            'tenant_id' => $this->tenantId,
            'messages' => $formattedMessages,
            'metadata' => [
                'ia_was_disabled' => true,
                'human_handled' => true,
                'saved_at' => now()->toISOString(),
            ],
        ];

        try {
            $aiServiceUrl = config('services.ai.base_url', 'http://localhost:8001');
            
            $response = Http::timeout(10)
                ->post("{$aiServiceUrl}/learning/save-context", $payload);

            if ($response->successful()) {
                Log::info('Conversation context saved for learning', [
                    'ticket_id' => $this->ticketId,
                    'lead_id' => $this->leadId,
                    'messages_count' => count($formattedMessages),
                ]);
            } else {
                Log::warning('AI service returned error for learning context', [
                    'ticket_id' => $this->ticketId,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to save conversation context for learning', [
                'ticket_id' => $this->ticketId,
                'error' => $e->getMessage(),
            ]);
            
            // Re-throw para retry
            throw $e;
        }
    }
}
