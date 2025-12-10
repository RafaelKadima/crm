<?php

namespace App\Jobs;

use App\Models\ScheduledTask;
use App\Models\TicketMessage;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessScheduledTasks implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function handle(WhatsAppService $whatsAppService): void
    {
        $tasks = ScheduledTask::readyToExecute()
            ->with(['lead.contact', 'appointment', 'ticket'])
            ->limit(50)
            ->get();

        Log::info('Processing scheduled tasks', ['count' => $tasks->count()]);

        foreach ($tasks as $task) {
            try {
                $this->processTask($task, $whatsAppService);
            } catch (\Exception $e) {
                Log::error('Failed to process scheduled task', [
                    'task_id' => $task->id,
                    'error' => $e->getMessage(),
                ]);
                $task->markAsFailed($e->getMessage());
            }
        }
    }

    protected function processTask(ScheduledTask $task, WhatsAppService $whatsAppService): void
    {
        $task->update(['status' => 'processing']);

        $lead = $task->lead;
        $contact = $lead->contact;

        if (!$contact || !$contact->phone) {
            throw new \Exception('Contato não possui telefone');
        }

        // Busca ticket ativo ou cria um
        $ticket = $task->ticket ?? $lead->tickets()->whereIn('status', ['open', 'pending'])->first();

        if (!$ticket) {
            // Cria um novo ticket para essa comunicação
            $channel = $lead->tenant->channels()
                ->where('type', 'whatsapp')
                ->where('is_active', true)
                ->first();

            if (!$channel) {
                throw new \Exception('Nenhum canal WhatsApp ativo encontrado');
            }

            $ticket = $lead->tickets()->create([
                'tenant_id' => $lead->tenant_id,
                'channel_id' => $channel->id,
                'contact_id' => $contact->id,
                'status' => 'open',
            ]);
        }

        // Envia mensagem via WhatsApp
        $result = $whatsAppService->sendMessage(
            $ticket->channel,
            $contact->phone,
            $task->message
        );

        if (!$result['success']) {
            throw new \Exception($result['error'] ?? 'Erro ao enviar mensagem');
        }

        // Cria registro da mensagem
        TicketMessage::create([
            'tenant_id' => $lead->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => 'ia',
            'sender_id' => null,
            'direction' => 'outbound',
            'message' => $task->message,
            'external_id' => $result['message_id'] ?? null,
            'status' => 'sent',
            'metadata' => [
                'scheduled_task_id' => $task->id,
                'task_type' => $task->type,
            ],
        ]);

        // Marca tarefa como enviada
        $task->markAsSent();

        // Se for lembrete de agendamento, atualiza o appointment
        if ($task->type === 'appointment_reminder' && $task->appointment) {
            $task->appointment->update([
                'reminder_sent' => true,
                'reminder_sent_at' => now(),
            ]);
        }

        Log::info('Scheduled task processed', [
            'task_id' => $task->id,
            'type' => $task->type,
            'lead_id' => $lead->id,
        ]);
    }
}

