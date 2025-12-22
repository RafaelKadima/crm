<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Lead;
use App\Models\ScheduledTask;
use App\Models\Stage;
use App\Services\AppointmentService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Controller para ações executadas pelo Agente IA.
 * Essas APIs são chamadas pelo microserviço Python quando o agente decide
 * executar uma ação (agendar reunião, mover estágio, etc).
 */
class AgentActionsController extends Controller
{
    protected AppointmentService $appointmentService;

    public function __construct(AppointmentService $appointmentService)
    {
        $this->appointmentService = $appointmentService;
    }

    /**
     * Move lead para outro estágio do Kanban
     */
    public function moveStage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id',
            'stage_id' => 'sometimes|uuid|exists:stages,id',
            'stage_name' => 'sometimes|string',
            'reason' => 'nullable|string',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        // Encontra o estágio pelo ID ou nome
        $stage = null;
        if (!empty($validated['stage_id'])) {
            $stage = Stage::find($validated['stage_id']);
        } elseif (!empty($validated['stage_name'])) {
            $stage = Stage::where('pipeline_id', $lead->pipeline_id)
                ->where('name', 'like', '%' . $validated['stage_name'] . '%')
                ->first();
        }

        if (!$stage) {
            return response()->json([
                'success' => false,
                'message' => 'Estágio não encontrado',
            ], 404);
        }

        $oldStage = $lead->stage;

        // Usa moveToStage para disparar eventos de integração
        $lead->moveToStage($stage, null, 'ia');

        // Registra atividade
        $lead->activities()->create([
            'type' => 'stage_changed',
            'description' => "Lead movido de '{$oldStage->name}' para '{$stage->name}'" .
                ($validated['reason'] ? " - Motivo: {$validated['reason']}" : ''),
            'source' => 'ia',
        ]);

        Log::info('Agent moved lead stage', [
            'lead_id' => $lead->id,
            'from_stage' => $oldStage->name,
            'to_stage' => $stage->name,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Lead movido para {$stage->name}",
            'lead' => $lead->fresh(['stage', 'contact']),
        ]);
    }

    /**
     * Agenda uma reunião/visita
     */
    public function scheduleAppointment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id',
            'type' => 'sometimes|in:meeting,visit,demo,follow_up,other',
            'scheduled_at' => 'required|date|after:now',
            'duration_minutes' => 'sometimes|integer|min:15|max:480',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:500',
        ]);

        $lead = Lead::with('contact')->findOrFail($validated['lead_id']);

        // Usa o responsável do lead ou round-robin se não tiver
        $userId = $lead->owner_id;
        if (!$userId) {
            $userId = app(\App\Services\LeadAssignmentService::class)->assignOwner($lead)->owner_id;
        }

        $appointmentData = [
            'tenant_id' => $lead->tenant_id,
            'lead_id' => $lead->id,
            'contact_id' => $lead->contact_id,
            'user_id' => $userId,
            'scheduled_by' => null, // null = agendado pela IA
            'type' => $validated['type'] ?? 'meeting',
            'scheduled_at' => Carbon::parse($validated['scheduled_at']),
            'duration_minutes' => $validated['duration_minutes'] ?? 30,
            'title' => $validated['title'],
            'description' => $validated['description'],
            'location' => $validated['location'],
        ];

        $appointment = $this->appointmentService->createAppointment($appointmentData);

        Log::info('Agent scheduled appointment', [
            'lead_id' => $lead->id,
            'appointment_id' => $appointment->id,
            'scheduled_at' => $appointment->scheduled_at,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Agendamento criado com sucesso',
            'appointment' => $appointment->load(['user', 'lead.contact']),
            'formatted_date' => Carbon::parse($appointment->scheduled_at)->format('d/m/Y'),
            'formatted_time' => Carbon::parse($appointment->scheduled_at)->format('H:i'),
        ]);
    }

    /**
     * Busca horários disponíveis para agendamento
     */
    public function getAvailableSlots(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id',
            'date' => 'sometimes|date',
            'days_ahead' => 'sometimes|integer|min:1|max:30',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);
        
        // Usa o responsável do lead
        $userId = $lead->owner_id;
        if (!$userId) {
            // Se não tiver responsável, busca qualquer vendedor disponível
            $userId = $lead->tenant->users()
                ->whereHas('schedules')
                ->first()
                ?->id;
        }

        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhum vendedor com agenda configurada',
                'available_slots' => [],
            ]);
        }

        // Se especificou data, retorna slots daquele dia
        if (!empty($validated['date'])) {
            $date = Carbon::parse($validated['date']);
            $slots = $this->appointmentService->getAvailableSlots($userId, $date);
            
            return response()->json([
                'success' => true,
                'date' => $date->format('Y-m-d'),
                'slots' => $slots,
            ]);
        }

        // Senão, retorna próximos dias disponíveis
        $daysAhead = $validated['days_ahead'] ?? 14;
        $availableDays = $this->appointmentService->getNextAvailableDays($userId, $daysAhead);

        return response()->json([
            'success' => true,
            'available_days' => $availableDays,
        ]);
    }

    /**
     * Qualifica o lead (atualiza temperatura, score, etc)
     */
    public function qualifyLead(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id',
            'temperature' => 'sometimes|in:hot,warm,cold',
            'score' => 'sometimes|integer|min:0|max:100',
            'notes' => 'nullable|string',
            'interests' => 'nullable|array',
            'pain_points' => 'nullable|array',
            'objections' => 'nullable|array',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        $updateData = [];

        if (isset($validated['temperature'])) {
            $updateData['temperature'] = $validated['temperature'];
        }

        if (isset($validated['score'])) {
            $updateData['score'] = $validated['score'];
        }

        // Salva dados no custom_fields
        $customFields = $lead->custom_fields ?? [];
        
        if (!empty($validated['interests'])) {
            $customFields['interests'] = $validated['interests'];
        }
        if (!empty($validated['pain_points'])) {
            $customFields['pain_points'] = $validated['pain_points'];
        }
        if (!empty($validated['objections'])) {
            $customFields['objections'] = $validated['objections'];
        }

        if (!empty($customFields)) {
            $updateData['custom_fields'] = $customFields;
        }

        $lead->update($updateData);

        // Registra atividade
        if (!empty($validated['notes'])) {
            $lead->activities()->create([
                'type' => 'lead_qualified',
                'description' => "Lead qualificado pela IA: {$validated['notes']}",
                'source' => 'ia',
            ]);
        }

        Log::info('Agent qualified lead', [
            'lead_id' => $lead->id,
            'temperature' => $validated['temperature'] ?? null,
            'score' => $validated['score'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lead qualificado',
            'lead' => $lead->fresh(['contact', 'stage']),
        ]);
    }

    /**
     * Agenda um follow-up
     */
    public function scheduleFollowUp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id',
            'message' => 'required|string',
            'scheduled_for' => 'required|date|after:now',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        $task = ScheduledTask::create([
            'tenant_id' => $lead->tenant_id,
            'lead_id' => $lead->id,
            'type' => 'follow_up',
            'scheduled_for' => Carbon::parse($validated['scheduled_for']),
            'message' => $validated['message'],
            'channel' => 'whatsapp',
            'status' => 'pending',
        ]);

        Log::info('Agent scheduled follow-up', [
            'lead_id' => $lead->id,
            'task_id' => $task->id,
            'scheduled_for' => $task->scheduled_for,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Follow-up agendado',
            'task' => $task,
        ]);
    }

    /**
     * Transfere para atendimento humano
     */
    public function transferToHuman(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id',
            'reason' => 'required|string',
            'priority' => 'sometimes|in:low,medium,high',
            'user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        // Atualiza o lead para indicar que precisa de atendimento humano
        $lead->update([
            'needs_human_attention' => true,
            'human_attention_reason' => $validated['reason'],
            'human_attention_priority' => $validated['priority'] ?? 'medium',
        ]);

        // Se especificou usuário, transfere para ele
        if (!empty($validated['user_id'])) {
            $lead->update(['owner_id' => $validated['user_id']]);
        }

        // Registra atividade
        $lead->activities()->create([
            'type' => 'transferred_to_human',
            'description' => "Transferido para atendimento humano. Motivo: {$validated['reason']}",
            'source' => 'ia',
        ]);

        Log::info('Agent transferred to human', [
            'lead_id' => $lead->id,
            'reason' => $validated['reason'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lead transferido para atendimento humano',
            'lead' => $lead->fresh(['owner', 'contact']),
        ]);
    }

    /**
     * Lista estágios disponíveis
     */
    public function listStages(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id',
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        $stages = Stage::where('pipeline_id', $lead->pipeline_id)
            ->orderBy('order')
            ->get(['id', 'name', 'order', 'color']);

        return response()->json([
            'success' => true,
            'current_stage' => $lead->stage,
            'stages' => $stages,
        ]);
    }
}

