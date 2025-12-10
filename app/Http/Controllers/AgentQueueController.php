<?php

namespace App\Http\Controllers;

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
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Controller para integração com a fila de processamento do Python.
 * 
 * O worker Python chama esses endpoints para:
 * 1. Buscar contexto completo do lead/agent
 * 2. Enviar a resposta processada
 */
class AgentQueueController extends Controller
{
    protected PythonAgentService $pythonAgentService;
    protected WhatsAppService $whatsAppService;

    public function __construct(
        PythonAgentService $pythonAgentService,
        WhatsAppService $whatsAppService
    ) {
        $this->pythonAgentService = $pythonAgentService;
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Retorna o contexto completo para o agente processar
     */
    public function getContext(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ticket_id' => 'required|uuid',
            'lead_id' => 'required|uuid',
            'agent_id' => 'required|uuid',
            'tenant_id' => 'required|uuid',
            'combined_message' => 'required|string',
            'message_count' => 'required|integer',
        ]);

        try {
            $ticket = Ticket::with(['channel', 'contact'])->find($validated['ticket_id']);
            $lead = Lead::with(['contact', 'stage', 'pipeline', 'owner'])->find($validated['lead_id']);
            $agent = SdrAgent::with(['faqs', 'knowledgeEntries'])->find($validated['agent_id']);
            $channel = $ticket?->channel;

            if (!$ticket || !$lead || !$agent || !$channel) {
                return response()->json([
                    'error' => 'Required entities not found',
                    'details' => [
                        'ticket' => $ticket ? 'found' : 'not found',
                        'lead' => $lead ? 'found' : 'not found',
                        'agent' => $agent ? 'found' : 'not found',
                        'channel' => $channel ? 'found' : 'not found',
                    ]
                ], 404);
            }

            // Monta o payload para o agente (mesmo formato do PythonAgentService)
            $payload = $this->pythonAgentService->buildPayloadForQueue(
                $validated['combined_message'],
                $ticket,
                $lead,
                $agent,
                $channel
            );

            Log::info('Context built for queue worker', [
                'ticket_id' => $ticket->id,
                'lead_id' => $lead->id,
                'combined_message_length' => strlen($validated['combined_message']),
            ]);

            return response()->json([
                'success' => true,
                'request' => $payload,
            ]);

        } catch (\Exception $e) {
            Log::error('Error building context', [
                'error' => $e->getMessage(),
                'ticket_id' => $validated['ticket_id'],
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Recebe a resposta processada pelo agente e executa as ações
     */
    public function handleResponse(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ticket_id' => 'required|uuid',
            'lead_id' => 'required|uuid',
            'channel_id' => 'required|uuid',
            'response' => 'required|array',
        ]);

        try {
            $ticket = Ticket::find($validated['ticket_id']);
            $lead = Lead::with(['contact', 'stage', 'pipeline'])->find($validated['lead_id']);
            $channel = Channel::find($validated['channel_id']);

            if (!$ticket || !$lead || !$channel) {
                return response()->json(['error' => 'Entities not found'], 404);
            }

            $response = $validated['response'];
            $action = $response['action'] ?? 'send_message';

            // Processa a ação
            $this->processAction($response, $ticket, $lead, $channel);

            Log::info('Agent response processed from queue', [
                'ticket_id' => $ticket->id,
                'lead_id' => $lead->id,
                'action' => $action,
            ]);

            return response()->json([
                'success' => true,
                'action' => $action,
            ]);

        } catch (\Exception $e) {
            Log::error('Error processing agent response', [
                'error' => $e->getMessage(),
                'ticket_id' => $validated['ticket_id'],
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Processa a ação retornada pelo agente
     */
    protected function processAction(array $result, Ticket $ticket, Lead $lead, Channel $channel): void
    {
        $action = $result['action'] ?? 'no_action';

        switch ($action) {
            case 'send_message':
                $this->handleSendMessage($result, $ticket, $lead, $channel);
                break;

            case 'schedule_meeting':
                $this->handleScheduleMeeting($result, $ticket, $lead, $channel);
                break;

            case 'move_stage':
                $this->handleMoveStage($result, $lead);
                break;

            case 'transfer_to_human':
                $this->handleTransferToHuman($result, $ticket, $lead);
                break;

            default:
                Log::info('No specific action handler', ['action' => $action]);
        }
    }

    protected function handleSendMessage(array $result, Ticket $ticket, Lead $lead, Channel $channel): void
    {
        $messageText = $result['message'] ?? '';

        if (empty($messageText)) {
            return;
        }

        // Carrega WhatsApp e envia
        $this->whatsAppService->loadFromChannel($channel);
        $phone = $lead->contact->phone;
        $this->whatsAppService->sendTextMessage($phone, $messageText);

        // Registra no ticket
        $message = TicketMessage::create([
            'tenant_id' => $channel->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::IA,
            'direction' => MessageDirectionEnum::OUTBOUND,
            'message' => $messageText,
            'sent_at' => now(),
            'metadata' => [
                'processed_by' => 'python_queue',
                'action' => $result['action'] ?? 'send_message',
                'intent' => $result['intent']['name'] ?? null,
            ],
        ]);

        event(new TicketMessageCreated($message, $ticket));
    }

    protected function handleScheduleMeeting(array $result, Ticket $ticket, Lead $lead, Channel $channel): void
    {
        $appointment = $result['appointment'] ?? null;

        if ($appointment && !empty($appointment['scheduled_at'])) {
            try {
                $appointmentService = app(\App\Services\AppointmentService::class);

                $userId = $lead->owner_id;
                if (!$userId) {
                    $userId = app(\App\Services\LeadAssignmentService::class)->assignLeadOwner($lead)->id;
                }

                $newAppointment = $appointmentService->createAppointment([
                    'tenant_id' => $lead->tenant_id,
                    'lead_id' => $lead->id,
                    'contact_id' => $lead->contact_id,
                    'user_id' => $userId,
                    'scheduled_by' => null,
                    'type' => $appointment['type'] ?? 'meeting',
                    'scheduled_at' => Carbon::parse($appointment['scheduled_at']),
                    'duration_minutes' => $appointment['duration_minutes'] ?? 30,
                    'title' => $appointment['title'] ?? 'Reunião agendada pelo SDR',
                ]);

                // Move para estágio Apresentação
                $newStage = \App\Models\PipelineStage::where('pipeline_id', $lead->pipeline_id)
                    ->where('name', 'LIKE', '%Apresenta%')
                    ->first();

                if ($newStage && $newStage->id !== $lead->stage_id) {
                    $lead->update(['stage_id' => $newStage->id]);
                    event(new LeadUpdated($lead->fresh()));
                }

                Log::info('Appointment created from queue', [
                    'appointment_id' => $newAppointment->id,
                    'scheduled_at' => $newAppointment->scheduled_at,
                ]);

            } catch (\Exception $e) {
                Log::error('Failed to create appointment from queue', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Envia mensagem de confirmação
        if (!empty($result['message'])) {
            $this->handleSendMessage($result, $ticket, $lead, $channel);
        }
    }

    protected function handleMoveStage(array $result, Lead $lead): void
    {
        $stageChange = $result['stage_change'] ?? null;

        if (!$stageChange || empty($stageChange['to_stage'])) {
            return;
        }

        $newStage = $lead->pipeline?->stages()
            ->where('name', 'LIKE', '%' . $stageChange['to_stage'] . '%')
            ->first();

        if ($newStage && $newStage->id !== $lead->stage_id) {
            $lead->update(['stage_id' => $newStage->id]);
            event(new LeadUpdated($lead->fresh()));
        }
    }

    protected function handleTransferToHuman(array $result, Ticket $ticket, Lead $lead): void
    {
        $ticket->update([
            'metadata' => array_merge($ticket->metadata ?? [], [
                'requires_human' => true,
                'transfer_reason' => $result['message'] ?? 'Solicitado pelo agente',
                'transferred_at' => now()->toIso8601String(),
            ]),
        ]);

        Log::info('Lead transferred to human from queue', [
            'lead_id' => $lead->id,
        ]);
    }
}

