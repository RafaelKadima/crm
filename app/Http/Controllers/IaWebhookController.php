<?php

namespace App\Http\Controllers;

use App\Enums\ActivitySourceEnum;
use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\PipelineStage;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Services\LeadAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IaWebhookController extends Controller
{
    public function __construct(
        protected LeadAssignmentService $assignmentService
    ) {}

    /**
     * IA atualiza o estágio do lead.
     */
    public function updateStage(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'stage_id' => 'required|uuid|exists:pipeline_stages,id',
        ]);

        $oldStage = $lead->stage;
        $newStage = PipelineStage::find($validated['stage_id']);

        $lead->moveToStage($newStage);

        // Registra atividade como IA
        LeadActivity::stageChanged($lead, $oldStage, $newStage, null, ActivitySourceEnum::IA);

        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner']);

        return response()->json([
            'success' => true,
            'message' => 'Estágio atualizado pela IA.',
            'lead' => $lead,
        ]);
    }

    /**
     * IA atualiza dados do lead/contato.
     */
    public function updateData(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'contact_name' => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_cpf' => 'nullable|string|max:14',
            'contact_address' => 'nullable|array',
            'lead_value' => 'nullable|numeric|min:0',
            'lead_expected_close_date' => 'nullable|date',
        ]);

        // Atualiza dados do contato
        $contactData = array_filter([
            'name' => $validated['contact_name'] ?? null,
            'email' => $validated['contact_email'] ?? null,
            'cpf' => $validated['contact_cpf'] ?? null,
            'address' => $validated['contact_address'] ?? null,
        ]);

        if (!empty($contactData)) {
            $lead->contact->update($contactData);
        }

        // Atualiza dados do lead
        $leadData = array_filter([
            'value' => $validated['lead_value'] ?? null,
            'expected_close_date' => $validated['lead_expected_close_date'] ?? null,
        ]);

        if (!empty($leadData)) {
            $lead->update($leadData);
        }

        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner']);

        return response()->json([
            'success' => true,
            'message' => 'Dados atualizados pela IA.',
            'lead' => $lead,
        ]);
    }

    /**
     * IA atribui o lead a um vendedor (Round-Robin).
     */
    public function assignOwner(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $oldOwner = $lead->owner;

        if (!empty($validated['user_id'])) {
            $newOwner = \App\Models\User::find($validated['user_id']);
            $lead->assignTo($newOwner);
        } else {
            // Round-Robin automático
            $newOwner = $this->assignmentService->assignLeadOwner($lead);
        }

        // Registra atividade como IA
        LeadActivity::ownerAssigned($lead, $oldOwner, $newOwner, null, ActivitySourceEnum::IA);

        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner']);

        return response()->json([
            'success' => true,
            'message' => 'Lead atribuído pela IA.',
            'lead' => $lead,
            'assigned_to' => [
                'id' => $newOwner->id,
                'name' => $newOwner->name,
            ],
        ]);
    }

    /**
     * IA envia uma mensagem em um ticket.
     */
    public function sendMessage(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $message = TicketMessage::create([
            'tenant_id' => $ticket->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::IA,
            'sender_id' => null,
            'message' => $validated['message'],
            'direction' => MessageDirectionEnum::OUTBOUND,
            'sent_at' => now(),
        ]);

        // Atualiza último contato do lead
        if ($ticket->lead) {
            $ticket->lead->updateLastInteraction(\App\Enums\InteractionSourceEnum::IA);
            
            // Registra atividade
            LeadActivity::messageSent($ticket->lead, $message, ActivitySourceEnum::IA);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mensagem enviada pela IA.',
            'ticket_message' => $message,
        ]);
    }

    /**
     * Webhook para receber dados de sistemas externos (ERP, etc).
     */
    public function externalWebhook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|in:contact_update,lead_create,lead_update',
            'data' => 'required|array',
        ]);

        $type = $validated['type'];
        $data = $validated['data'];

        switch ($type) {
            case 'contact_update':
                return $this->handleContactUpdate($data);

            case 'lead_create':
                return $this->handleLeadCreate($data);

            case 'lead_update':
                return $this->handleLeadUpdate($data);

            default:
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de webhook não suportado.',
                ], 400);
        }
    }

    /**
     * Processa atualização de contato vinda de sistema externo.
     */
    protected function handleContactUpdate(array $data): JsonResponse
    {
        $contact = Contact::where('phone', $data['phone'] ?? '')
            ->orWhere('email', $data['email'] ?? '')
            ->first();

        if (!$contact) {
            return response()->json([
                'success' => false,
                'message' => 'Contato não encontrado.',
            ], 404);
        }

        $contact->update(array_filter([
            'name' => $data['name'] ?? null,
            'email' => $data['email'] ?? null,
            'cpf' => $data['cpf'] ?? null,
            'address' => $data['address'] ?? null,
            'extra_data' => $data['extra_data'] ?? null,
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Contato atualizado.',
            'contact' => $contact,
        ]);
    }

    /**
     * Processa criação de lead vinda de sistema externo.
     */
    protected function handleLeadCreate(array $data): JsonResponse
    {
        // Valida dados obrigatórios
        if (empty($data['contact_phone']) || empty($data['channel_id']) || empty($data['pipeline_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Dados obrigatórios faltando: contact_phone, channel_id, pipeline_id.',
            ], 422);
        }

        // Busca ou cria o contato
        $contact = Contact::firstOrCreate(
            ['phone' => $data['contact_phone']],
            ['name' => $data['contact_name'] ?? 'Novo Contato']
        );

        // Busca o primeiro estágio do pipeline
        $pipeline = \App\Models\Pipeline::find($data['pipeline_id']);
        if (!$pipeline) {
            return response()->json([
                'success' => false,
                'message' => 'Pipeline não encontrado.',
            ], 404);
        }

        $firstStage = $pipeline->firstStage();
        if (!$firstStage) {
            return response()->json([
                'success' => false,
                'message' => 'Pipeline sem estágios configurados.',
            ], 422);
        }

        // Cria o lead
        $lead = Lead::create([
            'contact_id' => $contact->id,
            'pipeline_id' => $pipeline->id,
            'stage_id' => $firstStage->id,
            'channel_id' => $data['channel_id'],
            'value' => $data['value'] ?? null,
        ]);

        $lead->load(['contact', 'pipeline', 'stage', 'channel']);

        return response()->json([
            'success' => true,
            'message' => 'Lead criado.',
            'lead' => $lead,
        ], 201);
    }

    /**
     * Processa atualização de lead vinda de sistema externo.
     */
    protected function handleLeadUpdate(array $data): JsonResponse
    {
        if (empty($data['lead_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'lead_id é obrigatório.',
            ], 422);
        }

        $lead = Lead::find($data['lead_id']);
        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead não encontrado.',
            ], 404);
        }

        $lead->update(array_filter([
            'status' => $data['status'] ?? null,
            'value' => $data['value'] ?? null,
            'expected_close_date' => $data['expected_close_date'] ?? null,
        ]));

        $lead->load(['contact', 'pipeline', 'stage', 'channel', 'owner']);

        return response()->json([
            'success' => true,
            'message' => 'Lead atualizado.',
            'lead' => $lead,
        ]);
    }
}


