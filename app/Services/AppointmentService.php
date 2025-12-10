<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Lead;
use App\Models\ScheduledTask;
use App\Models\User;
use App\Models\UserSchedule;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AppointmentService
{
    /**
     * Cria um agendamento e as tarefas de lembrete
     */
    public function createAppointment(array $data): Appointment
    {
        return DB::transaction(function () use ($data) {
            // Cria o agendamento
            $appointment = Appointment::create([
                'tenant_id' => $data['tenant_id'],
                'lead_id' => $data['lead_id'],
                'contact_id' => $data['contact_id'],
                'user_id' => $data['user_id'],
                'scheduled_by' => $data['scheduled_by'] ?? null,
                'type' => $data['type'] ?? 'meeting',
                'scheduled_at' => $data['scheduled_at'],
                'duration_minutes' => $data['duration_minutes'] ?? 30,
                'title' => $data['title'] ?? null,
                'description' => $data['description'] ?? null,
                'location' => $data['location'] ?? null,
                'meeting_link' => $data['meeting_link'] ?? null,
                'metadata' => $data['metadata'] ?? null,
            ]);

            // Calcula ends_at
            $appointment->update([
                'ends_at' => Carbon::parse($appointment->scheduled_at)->addMinutes($appointment->duration_minutes),
            ]);

            // Cria tarefa de lembrete (1 dia antes)
            $this->createReminderTask($appointment);

            // Registra atividade no lead
            $appointment->lead->activities()->create([
                'tenant_id' => $appointment->tenant_id,
                'type' => 'appointment_scheduled',
                'description' => "Agendamento criado: {$appointment->type_name} para " . 
                    Carbon::parse($appointment->scheduled_at)->format('d/m/Y H:i'),
                'user_id' => $data['scheduled_by'] ?? null,
                'source' => $data['scheduled_by'] ? 'user' : 'ia',
            ]);

            Log::info('Appointment created', [
                'appointment_id' => $appointment->id,
                'lead_id' => $appointment->lead_id,
                'scheduled_at' => $appointment->scheduled_at,
            ]);

            return $appointment;
        });
    }

    /**
     * Cria tarefa de lembrete para o dia anterior
     */
    public function createReminderTask(Appointment $appointment): ?ScheduledTask
    {
        $scheduledAt = Carbon::parse($appointment->scheduled_at);
        $hoursUntilAppointment = now()->diffInHours($scheduledAt, false);
        
        // Não cria lembrete se faltam menos de 2 horas ou já passou
        if ($hoursUntilAppointment < 2) {
            return null;
        }

        // Define quando enviar o lembrete
        if ($hoursUntilAppointment >= 24) {
            // Mais de 24h: lembrete 1 dia antes às 10h
            $reminderDate = $scheduledAt->copy()->subDay()->setTime(10, 0);
            // Se já passou das 10h, agenda para agora + 1 hora
            if ($reminderDate->isPast()) {
                $reminderDate = now()->addHour();
            }
        } else {
            // Entre 2h e 24h: lembrete 2h antes
            $reminderDate = $scheduledAt->copy()->subHours(2);
        }

        $lead = $appointment->lead;
        $contact = $appointment->contact;

        $message = $this->buildReminderMessage($appointment);

        return ScheduledTask::create([
            'tenant_id' => $appointment->tenant_id,
            'lead_id' => $appointment->lead_id,
            'appointment_id' => $appointment->id,
            'type' => 'appointment_reminder',
            'scheduled_for' => $reminderDate,
            'message' => $message,
            'channel' => 'whatsapp',
            'status' => 'pending',
            'metadata' => [
                'appointment_type' => $appointment->type,
                'appointment_date' => $scheduledAt->format('Y-m-d H:i'),
            ],
        ]);
    }

    /**
     * Constrói mensagem de lembrete
     */
    protected function buildReminderMessage(Appointment $appointment): string
    {
        $contact = $appointment->contact;
        $scheduledAt = Carbon::parse($appointment->scheduled_at);
        
        $typeMessages = [
            'meeting' => 'nossa reunião',
            'visit' => 'sua visita à nossa loja',
            'demo' => 'a demonstração do produto',
            'follow_up' => 'nossa conversa',
            'other' => 'nosso encontro',
        ];

        $typeText = $typeMessages[$appointment->type] ?? 'nosso compromisso';
        $dateFormatted = $scheduledAt->format('d/m/Y');
        $timeFormatted = $scheduledAt->format('H:i');

        $message = "Olá {$contact->name}! 👋\n\n";
        $message .= "Passando para lembrar sobre {$typeText} amanhã, dia {$dateFormatted} às {$timeFormatted}.\n\n";
        
        if ($appointment->location) {
            $message .= "📍 Local: {$appointment->location}\n\n";
        }
        
        if ($appointment->meeting_link) {
            $message .= "🔗 Link da reunião: {$appointment->meeting_link}\n\n";
        }

        $message .= "Você confirma sua presença? Por favor, responda:\n";
        $message .= "✅ *SIM* para confirmar\n";
        $message .= "❌ *NÃO* se precisar remarcar\n\n";
        $message .= "Aguardo seu retorno! 😊";

        return $message;
    }

    /**
     * Busca horários disponíveis de um usuário
     */
    public function getAvailableSlots(
        string $userId, 
        Carbon $date, 
        int $duration = 30
    ): array {
        $dayOfWeek = $date->dayOfWeek;

        // Busca schedule do usuário para este dia
        $schedule = UserSchedule::where('user_id', $userId)
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (!$schedule) {
            return [];
        }

        // Busca agendamentos existentes para este dia
        $bookedSlots = Appointment::where('user_id', $userId)
            ->whereDate('scheduled_at', $date)
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->get()
            ->map(fn($a) => Carbon::parse($a->scheduled_at)->format('H:i'))
            ->toArray();

        return $schedule->getAvailableSlots($date, $bookedSlots);
    }

    /**
     * Busca próximos dias disponíveis
     */
    public function getNextAvailableDays(
        string $userId, 
        int $daysToCheck = 14
    ): array {
        $availableDays = [];
        $currentDate = Carbon::today();

        for ($i = 0; $i < $daysToCheck; $i++) {
            $date = $currentDate->copy()->addDays($i);
            $slots = $this->getAvailableSlots($userId, $date);
            
            if (!empty($slots)) {
                $availableDays[] = [
                    'date' => $date->format('Y-m-d'),
                    'day_name' => $date->locale('pt_BR')->dayName,
                    'formatted' => $date->format('d/m/Y'),
                    'available_slots' => count($slots),
                ];
            }
        }

        return $availableDays;
    }

    /**
     * Confirma agendamento e notifica
     */
    public function confirmAppointment(Appointment $appointment): Appointment
    {
        $appointment->confirm();

        // Registra atividade
        $appointment->lead->activities()->create([
            'type' => 'appointment_confirmed',
            'description' => "Agendamento confirmado pelo lead",
            'source' => 'user',
        ]);

        return $appointment;
    }

    /**
     * Cancela agendamento
     */
    public function cancelAppointment(Appointment $appointment, string $reason = null): Appointment
    {
        $appointment->cancel($reason);

        // Registra atividade
        $appointment->lead->activities()->create([
            'type' => 'appointment_cancelled',
            'description' => "Agendamento cancelado" . ($reason ? ": {$reason}" : ''),
            'source' => 'user',
        ]);

        return $appointment;
    }

    /**
     * Reagenda
     */
    public function rescheduleAppointment(
        Appointment $appointment, 
        Carbon $newDateTime,
        int $duration = null
    ): Appointment {
        $newAppointment = $appointment->reschedule($newDateTime, $duration);

        // Cria lembrete para novo agendamento
        $this->createReminderTask($newAppointment);

        // Registra atividade
        $appointment->lead->activities()->create([
            'type' => 'appointment_rescheduled',
            'description' => "Agendamento remarcado para " . $newDateTime->format('d/m/Y H:i'),
            'source' => 'user',
        ]);

        return $newAppointment;
    }
}

