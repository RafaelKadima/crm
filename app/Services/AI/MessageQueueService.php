<?php

namespace App\Services\AI;

use App\Models\Channel;
use App\Models\Lead;
use App\Models\SdrAgent;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Serviço para enfileirar mensagens no microserviço Python.
 * 
 * O Python agrupa mensagens do mesmo cliente antes de processar,
 * evitando respostas fragmentadas para mensagens picadas no WhatsApp.
 */
class MessageQueueService
{
    protected string $baseUrl;
    protected string $apiKey;
    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.ai_agent.url', 'http://localhost:8001');
        $this->apiKey = config('services.ai_agent.api_key', '');
        $this->timeout = 10;
    }

    /**
     * Verifica se o serviço está disponível
     */
    public function isAvailable(): bool
    {
        try {
            $response = Http::timeout(5)
                ->get("{$this->baseUrl}/health");

            return $response->successful();
        } catch (\Exception $e) {
            Log::warning('AI Queue service not available', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Enfileira uma mensagem para processamento posterior
     */
    public function enqueue(
        TicketMessage $message,
        Ticket $ticket,
        Lead $lead,
        Channel $channel,
        SdrAgent $agent
    ): bool {
        try {
            $payload = [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
                'content' => $message->message,
                'lead_id' => $lead->id,
                'tenant_id' => $channel->tenant_id,
                'agent_id' => $agent->id,
                'channel_id' => $channel->id,
                'metadata' => [
                    'contact_name' => $lead->contact?->name,
                    'contact_phone' => $lead->contact?->phone,
                    'lead_stage' => $lead->stage?->name,
                    'sent_at' => $message->sent_at?->toIso8601String(),
                ],
            ];

            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-API-Key' => $this->apiKey,
                ])
                ->post("{$this->baseUrl}/queue/enqueue", $payload);

            if ($response->successful()) {
                $data = $response->json();
                
                Log::info('Message enqueued for processing', [
                    'ticket_id' => $ticket->id,
                    'message_id' => $message->id,
                    'queue_size' => $data['queue_size'] ?? 1,
                    'is_end_intent' => $data['is_end_intent'] ?? false,
                ]);
                
                return true;
            }

            Log::error('Failed to enqueue message', [
                'ticket_id' => $ticket->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;

        } catch (\Exception $e) {
            Log::error('Enqueue message error', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Verifica o status da fila
     */
    public function getQueueStatus(): ?array
    {
        try {
            $response = Http::timeout($this->timeout)
                ->get("{$this->baseUrl}/queue/status");

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Queue status error', ['error' => $e->getMessage()]);
            return null;
        }
    }
}

