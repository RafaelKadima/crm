<?php

namespace App\Jobs;

use App\Models\AgentActionLog;
use App\Models\Channel;
use App\Models\Lead;
use App\Models\SdrAgent;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Services\AI\PythonAgentService;
use App\Services\WhatsAppService;
use App\Enums\SenderTypeEnum;
use App\Enums\MessageDirectionEnum;
use App\Events\TicketMessageCreated;
use App\Events\LeadUpdated;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job que processa respostas do agente usando o microserviço Python.
 * 
 * Fluxo:
 * 1. Envia mensagem para Python
 * 2. Recebe ação + resposta
 * 3. Executa a ação (enviar msg, mover funil, etc)
 * 4. Registra no sistema
 */
class ProcessAgentResponse implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 60;
    public int $backoff = 10;

    public function __construct(
        public TicketMessage $message,
        public Ticket $ticket,
        public Lead $lead,
        public Channel $channel,
        public SdrAgent $agent
    ) {}

    public function handle(
        PythonAgentService $pythonAgent,
        WhatsAppService $whatsAppService
    ): void {
        Log::info('Processing agent response via Python', [
            'message_id' => $this->message->id,
            'agent_id' => $this->agent->id,
            'lead_id' => $this->lead->id,
        ]);

        try {
            // Verifica se o serviço Python está disponível
            if (!$pythonAgent->isAvailable()) {
                Log::warning('Python agent service not available, using fallback');
                $this->handleFallback($whatsAppService);
                return;
            }

            // Chama o microserviço Python
            $result = $pythonAgent->run(
                $this->message,
                $this->ticket,
                $this->lead,
                $this->agent,
                $this->channel
            );

            if (!$result) {
                Log::warning('Python agent returned null, using fallback');
                $this->handleFallback($whatsAppService);
                return;
            }

            // Processa a ação retornada
            $this->processAction($result, $whatsAppService);

            Log::info('Agent response processed successfully', [
                'action' => $result['action'] ?? 'unknown',
                'lead_id' => $this->lead->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Agent response processing failed', [
                'message_id' => $this->message->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Processa a ação retornada pelo agente Python.
     */
    protected function processAction(array $result, WhatsAppService $whatsAppService): void
    {
        $action = $result['action'] ?? 'no_action';
        $startTime = microtime(true);
        $success = true;
        $errorMessage = null;

        try {
            switch ($action) {
                case 'send_message':
                    $this->handleSendMessage($result, $whatsAppService);
                    break;

                case 'move_stage':
                    $this->handleMoveStage($result, $whatsAppService);
                    break;

                case 'qualify_lead':
                    $this->handleQualifyLead($result);
                    break;

                case 'check_availability':
                    $this->handleCheckAvailability($result, $whatsAppService);
                    break;

                case 'schedule_meeting':
                    $this->handleScheduleMeeting($result, $whatsAppService);
                    break;

                case 'finalize_and_assign':
                    $this->handleFinalizeAndAssign($result, $whatsAppService);
                    break;

                case 'transfer_to_human':
                    $this->handleTransferToHuman($result, $whatsAppService);
                    break;

                case 'request_info':
                    $this->handleRequestInfo($result, $whatsAppService);
                    break;

                case 'follow_up':
                    $this->handleFollowUp($result);
                    break;

                default:
                    Log::info('No action taken', ['action' => $action]);
            }
        } catch (\Exception $e) {
            $success = false;
            $errorMessage = $e->getMessage();
            throw $e;
        } finally {
            // Registra a ação no log
            $this->logAgentAction($action, $result, $startTime, $success, $errorMessage);
        }
    }

    /**
     * Registra a ação do agente no log estruturado.
     */
    protected function logAgentAction(
        string $action,
        array $result,
        float $startTime,
        bool $success,
        ?string $errorMessage = null
    ): void {
        try {
            AgentActionLog::logAction($this->agent, $action, [
                'ticket_id' => $this->ticket->id,
                'lead_id' => $this->lead->id,
                'action_data' => [
                    'stage_change' => $result['stage_change'] ?? null,
                    'qualification' => $result['qualification'] ?? null,
                    'appointment' => $result['appointment'] ?? null,
                    'intent' => $result['intent'] ?? null,
                ],
                'trigger_message' => $this->message->message,
                'response_text' => $result['message'] ?? null,
                'model_used' => $result['model'] ?? $this->agent->ai_model ?? 'gpt-4o-mini',
                'tokens_used' => $result['usage']['total_tokens'] ?? null,
                'latency_ms' => (int) ((microtime(true) - $startTime) * 1000),
                'success' => $success,
                'error_message' => $errorMessage,
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to log agent action', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Envia mensagem para o lead.
     */
    protected function handleSendMessage(array $result, WhatsAppService $whatsAppService): void
    {
        $messageText = $result['message'] ?? '';

        if (empty($messageText)) {
            return;
        }

        // Configura WhatsApp
        $whatsAppService->loadFromChannel($this->channel);

        // Envia mensagem
        $phone = $this->lead->contact->phone;
        $whatsAppService->sendTextMessage($phone, $messageText);

        // Registra no ticket
        $this->createOutboundMessage($messageText, [
            'action' => 'send_message',
            'intent' => $result['intent']['name'] ?? null,
            'qualification' => $result['qualification'] ?? null,
        ]);
    }

    /**
     * Move o lead para outro estágio.
     */
    protected function handleMoveStage(array $result, WhatsAppService $whatsAppService): void
    {
        $stageChange = $result['stage_change'] ?? null;

        if (!$stageChange || empty($stageChange['to_stage'])) {
            return;
        }

        // Encontra o estágio pelo nome
        $newStage = $this->lead->pipeline?->stages()
            ->where('name', 'LIKE', '%' . $stageChange['to_stage'] . '%')
            ->first();

        if ($newStage && $newStage->id !== $this->lead->stage_id) {
            $oldStageId = $this->lead->stage_id;

            // Usa moveToStage para disparar eventos de integracao
            $this->lead->moveToStage($newStage, null, 'ia');

            Log::info('Lead stage updated by agent', [
                'lead_id' => $this->lead->id,
                'from_stage' => $oldStageId,
                'to_stage' => $newStage->id,
                'reason' => $stageChange['reason'] ?? '',
            ]);
        }

        // Envia mensagem se houver
        if (!empty($result['message'])) {
            $this->handleSendMessage($result, $whatsAppService);
        }
    }

    /**
     * Atualiza qualificação do lead.
     */
    protected function handleQualifyLead(array $result): void
    {
        $qualification = $result['qualification'] ?? null;

        if (!$qualification) {
            return;
        }

        // Atualiza custom_fields do lead com qualificação
        $customFields = $this->lead->custom_fields ?? [];
        $customFields['agent_qualification'] = [
            'temperature' => $qualification['temperature'] ?? 'unknown',
            'score' => $qualification['score'] ?? 0,
            'pain_points' => $qualification['pain_points'] ?? [],
            'interests' => $qualification['interests'] ?? [],
            'objections' => $qualification['objections'] ?? [],
            'updated_at' => now()->toISOString(),
        ];

        $this->lead->update(['custom_fields' => $customFields]);

        event(new LeadUpdated($this->lead->fresh()));
    }

    /**
     * Consulta disponibilidade e envia opções ao lead.
     */
    protected function handleCheckAvailability(array $result, WhatsAppService $whatsAppService): void
    {
        $appointmentService = app(\App\Services\AppointmentService::class);
        
        // Pega o responsável do lead ou qualquer vendedor com agenda
        $userId = $this->lead->owner_id;
        if (!$userId) {
            $userId = $this->lead->tenant->users()
                ->whereHas('schedules')
                ->first()
                ?->id;
        }

        // Busca próximos dias disponíveis
        $availableDays = [];
        if ($userId) {
            $availableDays = $appointmentService->getNextAvailableDays($userId, 7);
        }

        // Monta mensagem com horários disponíveis
        $message = $result['message'] ?? "Qual dia e horário ficam melhores para você?";
        
        if (!empty($availableDays)) {
            $message .= "\n\n📅 *Dias disponíveis:*\n";
            foreach (array_slice($availableDays, 0, 5) as $day) {
                $message .= "• {$day['day_name']}, {$day['formatted']} ({$day['available_slots']} horários)\n";
            }
            $message .= "\nMe diz qual prefere!";
        }

        // Envia mensagem
        $whatsAppService->loadFromChannel($this->channel);
        $phone = $this->lead->contact->phone;
        $whatsAppService->sendTextMessage($phone, $message);

        $this->createOutboundMessage($message, [
            'action' => 'check_availability',
            'available_days' => $availableDays,
        ]);
    }

    /**
     * Agenda reunião.
     */
    protected function handleScheduleMeeting(array $result, WhatsAppService $whatsAppService): void
    {
        $appointment = $result['appointment'] ?? null;
        
        if ($appointment && !empty($appointment['scheduled_at'])) {
            try {
                $appointmentService = app(\App\Services\AppointmentService::class);
                
                // Usa o responsável do lead ou round-robin se não tiver
                $userId = $this->lead->owner_id;
                if (!$userId) {
                    $userId = app(\App\Services\LeadAssignmentService::class)->assignLeadOwner($this->lead)->id;
                }
                
                $newAppointment = $appointmentService->createAppointment([
                    'tenant_id' => $this->lead->tenant_id,
                    'lead_id' => $this->lead->id,
                    'contact_id' => $this->lead->contact_id,
                    'user_id' => $userId,
                    'scheduled_by' => null, // null = agendado pela IA
                    'type' => $appointment['type'] ?? 'meeting',
                    'scheduled_at' => \Carbon\Carbon::parse($appointment['scheduled_at']),
                    'duration_minutes' => $appointment['duration_minutes'] ?? 30,
                    'title' => $appointment['title'] ?? 'Reunião agendada pelo SDR',
                    'description' => $appointment['description'] ?? null,
                    'location' => $appointment['location'] ?? null,
                ]);
                
                // Move o lead para o estágio "Apresentação" após agendar
                $this->lead->refresh();
                $newStage = \App\Models\PipelineStage::where('pipeline_id', $this->lead->pipeline_id)
                    ->where('name', 'LIKE', '%Apresenta%')
                    ->first();

                if ($newStage && $newStage->id !== $this->lead->stage_id) {
                    $oldStage = $this->lead->stage;

                    // Usa moveToStage para disparar eventos de integracao
                    $this->lead->moveToStage($newStage, null, 'ia');

                    Log::info('Lead moved to stage after scheduling', [
                        'lead_id' => $this->lead->id,
                        'from_stage' => $oldStage?->name,
                        'to_stage' => $newStage->name,
                    ]);
                }
                
                Log::info('Appointment created by agent', [
                    'lead_id' => $this->lead->id,
                    'appointment_id' => $newAppointment->id,
                    'scheduled_at' => $newAppointment->scheduled_at,
                ]);
                
            } catch (\Exception $e) {
                Log::error('Failed to create appointment', [
                    'lead_id' => $this->lead->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        
        // Envia mensagem se houver
        if (!empty($result['message'])) {
            $this->handleSendMessage($result, $whatsAppService);
        }
    }

    /**
     * Finaliza atendimento SDR e distribui para vendedor.
     */
    protected function handleFinalizeAndAssign(array $result, WhatsAppService $whatsAppService): void
    {
        $outcome = $result['sdr_outcome'] ?? 'qualified';
        $notes = $result['sdr_notes'] ?? '';

        // Define o próximo estágio baseado no resultado
        // Mapeia para estágios existentes no funil
        $stageMap = [
            'scheduled' => 'Apresentação',      // Agendou → Apresentação
            'not_interested' => 'Novo Lead',    // Não interessado → mantém
            'qualified' => 'Qualificação',      // Qualificado → Qualificação
            'need_nurturing' => 'Qualificação', // Nutrição → Qualificação
        ];

        // Tenta mover para o estágio apropriado
        $stageName = $stageMap[$outcome] ?? 'Qualificado';
        $newStage = $this->lead->pipeline?->stages()
            ->where('name', 'LIKE', '%' . $stageName . '%')
            ->first();

        if ($newStage && $newStage->id !== $this->lead->stage_id) {
            // Usa moveToStage para disparar eventos de integracao
            $this->lead->moveToStage($newStage, null, 'ia');
        }

        // Distribui para vendedor via round-robin (se não tiver responsável)
        if (!$this->lead->owner_id && $outcome !== 'not_interested') {
            $assignmentService = app(\App\Services\LeadAssignmentService::class);
            $assignmentService->assignLeadOwner($this->lead);
            
            Log::info('Lead assigned to seller via round-robin', [
                'lead_id' => $this->lead->id,
                'owner_id' => $this->lead->fresh()->owner_id,
            ]);
        }

        // Registra atividade
        $this->lead->activities()->create([
            'type' => 'sdr_completed',
            'description' => "Atendimento SDR finalizado. Resultado: {$outcome}" . 
                ($notes ? " - {$notes}" : ''),
            'source' => 'ia',
        ]);

        // Envia mensagem se houver
        if (!empty($result['message'])) {
            $this->handleSendMessage($result, $whatsAppService);
        }

        event(new LeadUpdated($this->lead->fresh()));

        Log::info('SDR finalized and lead assigned', [
            'lead_id' => $this->lead->id,
            'outcome' => $outcome,
            'new_owner' => $this->lead->fresh()->owner_id,
        ]);
    }

    /**
     * Transfere para atendimento humano.
     */
    protected function handleTransferToHuman(array $result, WhatsAppService $whatsAppService): void
    {
        // Atualiza ticket para indicar que precisa de humano
        $this->ticket->update([
            'metadata' => array_merge($this->ticket->metadata ?? [], [
                'requires_human' => true,
                'transfer_reason' => $result['message'] ?? 'Solicitado pelo agente',
                'transferred_at' => now()->toISOString(),
            ]),
        ]);

        // Notifica (poderia disparar evento para notificar vendedores)
        Log::info('Lead transferred to human', [
            'lead_id' => $this->lead->id,
            'reason' => $result['message'] ?? '',
        ]);
    }

    /**
     * Solicita informação.
     */
    protected function handleRequestInfo(array $result, WhatsAppService $whatsAppService): void
    {
        if (!empty($result['message'])) {
            $this->handleSendMessage($result, $whatsAppService);
        }
    }

    /**
     * Agenda follow-up.
     */
    protected function handleFollowUp(array $result): void
    {
        if (!$result['follow_up_needed'] || empty($result['follow_up_time'])) {
            return;
        }

        try {
            \DB::table('agent_follow_ups')->insert([
                'id' => \Str::uuid(),
                'tenant_id' => $this->channel->tenant_id,
                'sdr_agent_id' => $this->agent->id,
                'lead_id' => $this->lead->id,
                'ticket_id' => $this->ticket->id,
                'message' => $result['message'] ?? 'Follow-up automático',
                'scheduled_for' => $result['follow_up_time'],
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('Follow-up scheduled', [
                'lead_id' => $this->lead->id,
                'scheduled_for' => $result['follow_up_time'],
            ]);

        } catch (\Exception $e) {
            Log::warning('Failed to schedule follow-up', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Cria mensagem de saída no ticket.
     */
    protected function createOutboundMessage(string $content, array $metadata = []): void
    {
        $message = TicketMessage::create([
            'tenant_id' => $this->channel->tenant_id,
            'ticket_id' => $this->ticket->id,
            'sender_type' => SenderTypeEnum::IA,
            'direction' => MessageDirectionEnum::OUTBOUND,
            'message' => $content,
            'sent_at' => now(),
            'metadata' => array_merge([
                'sdr_agent_id' => $this->agent->id,
                'sdr_agent_name' => $this->agent->name,
                'processed_by' => 'python_agent',
            ], $metadata),
        ]);

        event(new TicketMessageCreated($message, $this->ticket));
    }

    /**
     * Fallback básico quando o serviço Python não está disponível.
     * 
     * Usa chamada direta à OpenAI sem as funcionalidades avançadas 
     * (RAG, memory, ML) do microserviço Python.
     */
    protected function handleFallback(WhatsAppService $whatsAppService): void
    {
        $aiService = app(\App\Services\AI\AiService::class);

        if (!$aiService->isConfigured()) {
            Log::warning('No AI service available for fallback');
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

                $this->createOutboundMessage($result['content'], [
                    'processed_by' => 'basic_fallback',
                    'model' => $result['model'] ?? 'unknown',
                    'tokens' => $result['tokens'] ?? [],
                ]);

                Log::info('Fallback response sent', [
                    'lead_id' => $this->lead->id,
                    'tokens' => $result['tokens']['total'] ?? 0,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Fallback processing failed', [
                'lead_id' => $this->lead->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('ProcessAgentResponse job failed', [
            'message_id' => $this->message->id,
            'error' => $exception->getMessage(),
        ]);
    }
}

