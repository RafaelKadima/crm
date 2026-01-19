<?php

namespace App\Jobs;

use App\Models\Channel;
use App\Models\Lead;
use App\Models\SdrAgent;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Services\AI\PythonAgentService;
use App\Services\WhatsAppService;
use App\Enums\SenderTypeEnum;
use App\Enums\MessageDirectionEnum;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Job com debounce para processar respostas do agente.
 * Aguarda X segundos para agrupar mensagens fragmentadas do lead.
 */
class ProcessAgentResponseDebounced implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 90;

    // Tempo de debounce em segundos
    public const DEBOUNCE_SECONDS = 5;

    public function __construct(
        public TicketMessage $lastMessage,
        public Ticket $ticket,
        public Lead $lead,
        public Channel $channel,
        public SdrAgent $agent
    ) {}

    public function handle(
        PythonAgentService $pythonAgent,
        WhatsAppService $whatsAppService
    ): void {
        // Safety check: Se a fila do lead tem sdr_disabled, não processa
        $this->lead->loadMissing('queue');
        if ($this->lead->queue && $this->lead->queue->sdr_disabled) {
            Log::info('Agent debounce: SDR disabled for queue, skipping', [
                'ticket_id' => $this->ticket->id,
                'queue_id' => $this->lead->queue_id,
                'queue_name' => $this->lead->queue->name,
            ]);
            return;
        }

        $cacheKey = "agent_processing:{$this->ticket->id}";

        // Verifica se já está processando
        if (Cache::has($cacheKey)) {
            Log::info('Agent debounce: already processing, skipping', [
                'ticket_id' => $this->ticket->id,
            ]);
            return;
        }
        
        // Marca como processando (por 30 segundos)
        Cache::put($cacheKey, true, 30);

        try {
            // Busca mensagens NÃO respondidas do lead
            // Pega a última resposta da IA e busca mensagens depois dela
            $lastIaMessage = TicketMessage::where('ticket_id', $this->ticket->id)
                ->where('sender_type', SenderTypeEnum::IA)
                ->orderBy('created_at', 'desc')
                ->first();
            
            $query = TicketMessage::where('ticket_id', $this->ticket->id)
                ->where('sender_type', SenderTypeEnum::CONTACT)
                ->where('direction', MessageDirectionEnum::INBOUND);
            
            if ($lastIaMessage) {
                $query->where('created_at', '>', $lastIaMessage->created_at);
            }
            
            $pendingMessages = $query->orderBy('created_at', 'asc')->get();

            Log::info('Agent debounce: found pending messages', [
                'ticket_id' => $this->ticket->id,
                'pending_count' => $pendingMessages->count(),
                'last_ia_message_at' => $lastIaMessage?->created_at,
            ]);

            if ($pendingMessages->isEmpty()) {
                Log::info('Agent debounce: no pending messages', [
                    'ticket_id' => $this->ticket->id,
                ]);
                Cache::forget($cacheKey);
                return;
            }

            // Combina todas as mensagens em uma só
            $combinedMessage = $pendingMessages->pluck('message')->join("\n");
            $lastMessage = $pendingMessages->last();

            Log::info('Agent debounce: processing combined messages', [
                'ticket_id' => $this->ticket->id,
                'message_count' => $pendingMessages->count(),
                'combined_message' => substr($combinedMessage, 0, 200),
            ]);

            // Cria uma mensagem virtual combinada para o agente
            $virtualMessage = clone $lastMessage;
            $virtualMessage->message = $combinedMessage;

            // Verifica se o serviço Python está disponível
            if (!$pythonAgent->isAvailable()) {
                Log::warning('Python agent service not available, using basic fallback');
                $this->handleBasicFallback($whatsAppService, $combinedMessage);
                Cache::forget($cacheKey);
                return;
            }

            // Chama o microserviço Python com a mensagem combinada
            $result = $pythonAgent->run(
                $virtualMessage,
                $this->ticket,
                $this->lead,
                $this->agent,
                $this->channel
            );

            if (!$result) {
                Log::warning('Python agent returned null, using basic fallback');
                $this->handleBasicFallback($whatsAppService, $combinedMessage);
                Cache::forget($cacheKey);
                return;
            }

            // Processa a ação retornada
            $this->processAction($result, $whatsAppService, $lastMessage);

            Log::info('Agent debounce: response processed successfully', [
                'action' => $result['action'] ?? 'unknown',
                'lead_id' => $this->lead->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Agent debounce processing failed', [
                'ticket_id' => $this->ticket->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        } finally {
            Cache::forget($cacheKey);
        }
    }

    /**
     * Processa a ação retornada pelo agente.
     */
    protected function processAction(array $result, WhatsAppService $whatsAppService, TicketMessage $message): void
    {
        // Delega para o ProcessAgentResponse original
        $job = new ProcessAgentResponse(
            $message,
            $this->ticket,
            $this->lead,
            $this->channel,
            $this->agent
        );

        // Chama o processamento de ação diretamente
        $reflection = new \ReflectionClass($job);
        $method = $reflection->getMethod('processAction');
        $method->setAccessible(true);
        $method->invoke($job, $result, $whatsAppService);
    }

    /**
     * Dispara o job com debounce.
     */
    public static function dispatchWithDebounce(
        TicketMessage $message,
        Ticket $ticket,
        Lead $lead,
        Channel $channel,
        SdrAgent $agent
    ): void {
        // Cancela jobs pendentes anteriores deste ticket
        $cacheKey = "agent_debounce_job:{$ticket->id}";
        
        // Se já tem um job agendado, não agenda outro
        if (Cache::has($cacheKey)) {
            Log::info('Agent debounce: job already scheduled, updating', [
                'ticket_id' => $ticket->id,
                'message_id' => $message->id,
            ]);
            // Atualiza o timer do cache para estender o debounce
            Cache::put($cacheKey, $message->id, now()->addSeconds(self::DEBOUNCE_SECONDS + 2));
            return;
        }
        
        // Marca que há um job agendado
        Cache::put($cacheKey, $message->id, now()->addSeconds(self::DEBOUNCE_SECONDS + 2));
        
        // Dispara o job com delay
        self::dispatch($message, $ticket, $lead, $channel, $agent)
            ->delay(now()->addSeconds(self::DEBOUNCE_SECONDS));
        
        Log::info('Agent debounce: job scheduled', [
            'ticket_id' => $ticket->id,
            'message_id' => $message->id,
            'delay_seconds' => self::DEBOUNCE_SECONDS,
        ]);
    }

    /**
     * Fallback básico quando o serviço Python não está disponível.
     * Usa chamada direta à OpenAI sem as funcionalidades avançadas.
     */
    protected function handleBasicFallback(WhatsAppService $whatsAppService, string $combinedMessage): void
    {
        $aiService = app(\App\Services\AI\AiService::class);

        if (!$aiService->isConfigured()) {
            Log::warning('No AI service available for fallback in debounced job');
            return;
        }

        try {
            // Monta histórico básico
            $history = $this->ticket->messages()
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->reverse()
                ->map(fn($m) => [
                    'role' => $m->sender_type->value === 'contact' ? 'user' : 'assistant',
                    'content' => $m->message,
                ])
                ->values()
                ->toArray();

            // System prompt básico
            $systemPrompt = $this->agent->system_prompt ?? 
                "Você é um assistente de vendas profissional. Responda de forma clara e objetiva.";

            // Chama OpenAI diretamente
            $result = $aiService->chat(
                $history,
                $systemPrompt,
                $this->agent->ai_model ?? 'gpt-4o-mini',
                (float) ($this->agent->temperature ?? 0.7)
            );

            if ($result && !empty($result['content'])) {
                $whatsAppService->loadFromChannel($this->channel);
                $phone = $this->lead->contact->phone;
                $whatsAppService->sendTextMessage($phone, $result['content']);

                // Registra a mensagem enviada
                $outboundMessage = \App\Models\TicketMessage::create([
                    'tenant_id' => $this->channel->tenant_id,
                    'ticket_id' => $this->ticket->id,
                    'sender_type' => SenderTypeEnum::IA,
                    'direction' => MessageDirectionEnum::OUTBOUND,
                    'message' => $result['content'],
                    'sent_at' => now(),
                    'metadata' => [
                        'sdr_agent_id' => $this->agent->id,
                        'sdr_agent_name' => $this->agent->name,
                        'processed_by' => 'basic_fallback_debounced',
                        'combined_message_length' => strlen($combinedMessage),
                        'model' => $result['model'] ?? 'unknown',
                        'tokens' => $result['tokens'] ?? [],
                    ],
                ]);

                event(new \App\Events\TicketMessageCreated($outboundMessage, $this->ticket));

                Log::info('Debounced fallback response sent', [
                    'lead_id' => $this->lead->id,
                    'ticket_id' => $this->ticket->id,
                    'tokens' => $result['tokens']['total'] ?? 0,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Debounced fallback processing failed', [
                'lead_id' => $this->lead->id,
                'ticket_id' => $this->ticket->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

