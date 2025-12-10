<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\UserSchedule;
use App\Services\AppointmentService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    protected AppointmentService $appointmentService;

    public function __construct(AppointmentService $appointmentService)
    {
        $this->appointmentService = $appointmentService;
    }

    /**
     * Lista agendamentos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Appointment::with(['lead.contact', 'user', 'scheduledBy'])
            ->orderBy('scheduled_at', 'desc');

        // Filtros
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('lead_id')) {
            $query->where('lead_id', $request->lead_id);
        }

        if ($request->filled('date_from')) {
            $query->where('scheduled_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->where('scheduled_at', '<=', $request->date_to);
        }

        if ($request->boolean('upcoming')) {
            $query->upcoming();
        }

        if ($request->boolean('today')) {
            $query->today();
        }

        $appointments = $query->paginate($request->get('per_page', 20));

        return response()->json($appointments);
    }

    /**
     * Cria um agendamento
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => 'required|uuid|exists:leads,id',
            'user_id' => 'required|uuid|exists:users,id',
            'type' => 'sometimes|in:meeting,visit,demo,follow_up,other',
            'scheduled_at' => 'required|date|after:now',
            'duration_minutes' => 'sometimes|integer|min:15|max:480',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:500',
            'meeting_link' => 'nullable|url',
        ]);

        // Busca o contact_id do lead
        $lead = \App\Models\Lead::findOrFail($validated['lead_id']);
        $validated['contact_id'] = $lead->contact_id;
        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['scheduled_by'] = auth()->id();

        $appointment = $this->appointmentService->createAppointment($validated);

        return response()->json([
            'message' => 'Agendamento criado com sucesso.',
            'appointment' => $appointment->load(['lead.contact', 'user']),
        ], 201);
    }

    /**
     * Exibe um agendamento
     */
    public function show(Appointment $appointment): JsonResponse
    {
        $appointment->load([
            'lead.contact',
            'user',
            'scheduledBy',
            'scheduledTasks',
            'originalAppointment',
            'rescheduledAppointments',
        ]);

        return response()->json($appointment);
    }

    /**
     * Atualiza um agendamento
     */
    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'sometimes|in:meeting,visit,demo,follow_up,other',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'location' => 'nullable|string|max:500',
            'meeting_link' => 'nullable|url',
            'notes' => 'nullable|string',
        ]);

        $appointment->update($validated);

        return response()->json([
            'message' => 'Agendamento atualizado.',
            'appointment' => $appointment->fresh(['lead.contact', 'user']),
        ]);
    }

    /**
     * Confirma um agendamento
     */
    public function confirm(Appointment $appointment): JsonResponse
    {
        if (!$appointment->can_be_confirmed) {
            return response()->json([
                'message' => 'Este agendamento não pode ser confirmado.',
            ], 422);
        }

        $appointment = $this->appointmentService->confirmAppointment($appointment);

        return response()->json([
            'message' => 'Agendamento confirmado!',
            'appointment' => $appointment,
        ]);
    }

    /**
     * Cancela um agendamento
     */
    public function cancel(Request $request, Appointment $appointment): JsonResponse
    {
        if (!$appointment->can_be_cancelled) {
            return response()->json([
                'message' => 'Este agendamento não pode ser cancelado.',
            ], 422);
        }

        $reason = $request->input('reason');
        $appointment = $this->appointmentService->cancelAppointment($appointment, $reason);

        return response()->json([
            'message' => 'Agendamento cancelado.',
            'appointment' => $appointment,
        ]);
    }

    /**
     * Marca como concluído
     */
    public function complete(Request $request, Appointment $appointment): JsonResponse
    {
        $outcome = $request->input('outcome');
        $appointment->complete($outcome);

        return response()->json([
            'message' => 'Agendamento marcado como concluído.',
            'appointment' => $appointment,
        ]);
    }

    /**
     * Marca como no-show
     */
    public function noShow(Appointment $appointment): JsonResponse
    {
        $appointment->markAsNoShow();

        return response()->json([
            'message' => 'Lead marcado como não compareceu.',
            'appointment' => $appointment,
        ]);
    }

    /**
     * Reagenda
     */
    public function reschedule(Request $request, Appointment $appointment): JsonResponse
    {
        $validated = $request->validate([
            'scheduled_at' => 'required|date|after:now',
            'duration_minutes' => 'sometimes|integer|min:15|max:480',
        ]);

        $newDateTime = Carbon::parse($validated['scheduled_at']);
        $duration = $validated['duration_minutes'] ?? null;

        $newAppointment = $this->appointmentService->rescheduleAppointment(
            $appointment, 
            $newDateTime, 
            $duration
        );

        return response()->json([
            'message' => 'Agendamento remarcado com sucesso.',
            'appointment' => $newAppointment->load(['lead.contact', 'user']),
            'original_appointment' => $appointment->fresh(),
        ]);
    }

    /**
     * Busca horários disponíveis
     */
    public function availableSlots(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'date' => 'required|date',
            'duration' => 'sometimes|integer|min:15|max:480',
        ]);

        $date = Carbon::parse($validated['date']);
        $duration = $validated['duration'] ?? 30;

        $slots = $this->appointmentService->getAvailableSlots(
            $validated['user_id'],
            $date,
            $duration
        );

        return response()->json([
            'date' => $date->format('Y-m-d'),
            'user_id' => $validated['user_id'],
            'slots' => $slots,
        ]);
    }

    /**
     * Próximos dias disponíveis
     */
    public function availableDays(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'days' => 'sometimes|integer|min:1|max:60',
        ]);

        $days = $this->appointmentService->getNextAvailableDays(
            $validated['user_id'],
            $validated['days'] ?? 14
        );

        return response()->json([
            'user_id' => $validated['user_id'],
            'available_days' => $days,
        ]);
    }

    // =========================================================================
    // SCHEDULE (Agenda do Usuário)
    // =========================================================================

    /**
     * Lista agenda de um usuário
     */
    public function listSchedules(Request $request): JsonResponse
    {
        $userId = $request->input('user_id', auth()->id());

        $schedules = UserSchedule::where('user_id', $userId)
            ->orderBy('day_of_week')
            ->get();

        return response()->json([
            'user_id' => $userId,
            'schedules' => $schedules,
        ]);
    }

    /**
     * Configura agenda de um dia
     */
    public function setSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'sometimes|uuid|exists:users,id',
            'day_of_week' => 'required|integer|min:0|max:6',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'break_start' => 'nullable|date_format:H:i',
            'break_end' => 'nullable|date_format:H:i|after:break_start',
            'slot_duration' => 'sometimes|integer|min:15|max:120',
            'is_active' => 'sometimes|boolean',
        ]);

        $userId = $validated['user_id'] ?? auth()->id();

        $schedule = UserSchedule::updateOrCreate(
            [
                'user_id' => $userId,
                'day_of_week' => $validated['day_of_week'],
            ],
            [
                'tenant_id' => auth()->user()->tenant_id,
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
                'break_start' => $validated['break_start'] ?? null,
                'break_end' => $validated['break_end'] ?? null,
                'slot_duration' => $validated['slot_duration'] ?? 30,
                'is_active' => $validated['is_active'] ?? true,
            ]
        );

        return response()->json([
            'message' => 'Agenda atualizada.',
            'schedule' => $schedule,
        ]);
    }

    /**
     * Configura agenda completa (todos os dias de uma vez)
     */
    public function setWeekSchedule(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'sometimes|uuid|exists:users,id',
            'schedules' => 'required|array',
            'schedules.*.day_of_week' => 'required|integer|min:0|max:6',
            'schedules.*.start_time' => 'required|date_format:H:i',
            'schedules.*.end_time' => 'required|date_format:H:i',
            'schedules.*.break_start' => 'nullable|date_format:H:i',
            'schedules.*.break_end' => 'nullable|date_format:H:i',
            'schedules.*.slot_duration' => 'sometimes|integer|min:15|max:120',
            'schedules.*.is_active' => 'sometimes|boolean',
        ]);

        $userId = $validated['user_id'] ?? auth()->id();
        $tenantId = auth()->user()->tenant_id;

        $savedSchedules = [];

        foreach ($validated['schedules'] as $scheduleData) {
            $schedule = UserSchedule::updateOrCreate(
                [
                    'user_id' => $userId,
                    'day_of_week' => $scheduleData['day_of_week'],
                ],
                [
                    'tenant_id' => $tenantId,
                    'start_time' => $scheduleData['start_time'],
                    'end_time' => $scheduleData['end_time'],
                    'break_start' => $scheduleData['break_start'] ?? null,
                    'break_end' => $scheduleData['break_end'] ?? null,
                    'slot_duration' => $scheduleData['slot_duration'] ?? 30,
                    'is_active' => $scheduleData['is_active'] ?? true,
                ]
            );
            $savedSchedules[] = $schedule;
        }

        return response()->json([
            'message' => 'Agenda semanal configurada.',
            'schedules' => $savedSchedules,
        ]);
    }
}

