<?php

namespace App\Services;

use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Enums\TicketStatusEnum;
use App\Models\Lead;
use App\Models\LeadQueueOwner;
use App\Models\Queue;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeadTransferService
{
    /**
     * Transfere um lead para outro usuário.
     * Funciona com ou sem fila associada.
     * Atualiza a carteirização para manter o histórico.
     */
    public function transferToUser(Lead $lead, User $newUser, ?User $transferredBy = null): array
    {
        $queue = $lead->queue;

        return DB::transaction(function () use ($lead, $queue, $newUser, $transferredBy) {
            $previousOwner = $lead->owner;

            // Atualiza o owner do lead
            $lead->update(['owner_id' => $newUser->id]);

            // Se tem fila, atualiza a carteirização
            if ($queue) {
                LeadQueueOwner::setOwnerForQueue($lead, $queue, $newUser);
            }

            // Atualiza TODOS os tickets abertos do lead (não apenas um)
            $lead->tickets()
                ->where('status', TicketStatusEnum::OPEN)
                ->update(['assigned_user_id' => $newUser->id]);

            Log::info('Lead transferred to user', [
                'lead_id' => $lead->id,
                'queue_id' => $queue?->id,
                'from_user' => $previousOwner?->id,
                'to_user' => $newUser->id,
                'transferred_by' => $transferredBy?->id,
                'has_queue' => $queue !== null,
            ]);

            return [
                'success' => true,
                'message' => "Lead transferido para {$newUser->name}",
                'lead' => $lead->fresh(['owner', 'queue']),
            ];
        });
    }

    /**
     * Transfere um lead para outra fila.
     * Se não especificar usuário, usa a carteirização existente ou autodistribui.
     */
    public function transferToQueue(Lead $lead, Queue $newQueue, ?User $newUser = null, ?User $transferredBy = null): array
    {
        return DB::transaction(function () use ($lead, $newQueue, $newUser, $transferredBy) {
            $previousQueue = $lead->queue;

            // Se não especificou usuário, verifica se já tem dono nessa fila
            if (!$newUser) {
                $existingOwner = LeadQueueOwner::getOwnerForQueue($lead, $newQueue);

                if ($existingOwner) {
                    $newUser = $existingOwner;
                } elseif ($newQueue->auto_distribute && $newQueue->hasAvailableUsers()) {
                    // Autodistribui
                    $assignmentService = app(LeadAssignmentService::class);
                    $newUser = $assignmentService->assignLeadOwner($lead, $newQueue->getActiveUserIds());
                }
            }

            // Atualiza o lead para a nova fila e pipeline
            $lead->update([
                'queue_id' => $newQueue->id,
                'pipeline_id' => $newQueue->pipeline_id,
                'stage_id' => $newQueue->pipeline?->firstStage()?->id ?? $lead->stage_id,
                'owner_id' => $newUser?->id,
            ]);

            // Atualiza a carteirização na nova fila
            if ($newUser) {
                LeadQueueOwner::setOwnerForQueue($lead, $newQueue, $newUser);
            }

            // Atualiza o ticket aberto (se houver)
            $ticket = $lead->tickets()->where('status', TicketStatusEnum::OPEN)->first();
            if ($ticket) {
                $ticket->update(['assigned_user_id' => $newUser?->id]);
            }

            Log::info('Lead transferred to queue', [
                'lead_id' => $lead->id,
                'from_queue' => $previousQueue?->id,
                'to_queue' => $newQueue->id,
                'new_user' => $newUser?->id,
                'transferred_by' => $transferredBy?->id,
            ]);

            return [
                'success' => true,
                'message' => "Lead transferido para fila '{$newQueue->name}'" . ($newUser ? " - {$newUser->name}" : ''),
                'lead' => $lead->fresh(),
                'queue' => $newQueue,
                'user' => $newUser,
            ];
        });
    }

    /**
     * Encerra a conversa (fecha o ticket).
     * Reseta o queue_id do lead para que passe pelo menu de filas na próxima interação.
     */
    public function closeConversation(Ticket $ticket, ?User $closedBy = null, ?string $reason = null): array
    {
        return DB::transaction(function () use ($ticket, $closedBy, $reason) {
            // Enviar mensagem de encerramento antes de fechar (se configurada na fila)
            $this->sendCloseMessage($ticket);

            $ticket->update([
                'status' => TicketStatusEnum::CLOSED,
                'closed_at' => now(),
            ]);

            // Reseta o queue_id do lead para que passe pelo menu de filas na próxima vez
            // A carteirização (lead_queue_owners) é mantida para redirecionar ao mesmo atendente
            // quando o lead escolher a mesma fila novamente
            $previousQueueId = null;
            if ($ticket->lead) {
                $previousQueueId = $ticket->lead->queue_id;
                $ticket->lead->update(['queue_id' => null]);

                Log::info('Lead queue reset on conversation close', [
                    'lead_id' => $ticket->lead_id,
                    'previous_queue_id' => $previousQueueId,
                ]);
            }

            Log::info('Conversation closed', [
                'ticket_id' => $ticket->id,
                'lead_id' => $ticket->lead_id,
                'closed_by' => $closedBy?->id,
                'reason' => $reason,
            ]);

            return [
                'success' => true,
                'message' => 'Conversa encerrada com sucesso',
                'ticket' => $ticket->fresh(),
            ];
        });
    }

    /**
     * Envia mensagem automática de encerramento via canal do ticket.
     */
    protected function sendCloseMessage(Ticket $ticket): void
    {
        try {
            $lead = $ticket->lead;
            if (!$lead || !$lead->queue_id) return;

            $queue = Queue::find($lead->queue_id);
            if (!$queue || !$queue->close_message) return;

            $channel = $ticket->channel;
            $contact = $ticket->contact;
            if (!$channel || !$contact) return;

            // Salvar mensagem no banco
            $message = TicketMessage::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'sender_type' => SenderTypeEnum::SYSTEM,
                'direction' => MessageDirectionEnum::OUTBOUND,
                'message' => $queue->close_message,
                'sent_at' => now(),
            ]);

            // Enviar via canal (WhatsApp, Instagram, etc.)
            $this->sendViaChannel($channel, $contact, $queue->close_message);

            // Broadcast para atualizar chat em tempo real
            event(new \App\Events\TicketMessageCreated($message, $ticket));

            Log::info('Close message sent', [
                'ticket_id' => $ticket->id,
                'queue_id' => $queue->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send close message', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Envia mensagem através do canal apropriado.
     */
    protected function sendViaChannel($channel, $contact, string $message): void
    {
        $channelType = $channel->type ?? $channel->provider_type ?? '';

        if (str_contains($channelType, 'whatsapp') && $contact->phone) {
            $whatsAppService = app(WhatsAppService::class);
            $whatsAppService->loadFromChannel($channel);
            $whatsAppService->sendTextMessage($contact->phone, $message);
        } elseif (str_contains($channelType, 'instagram') && $contact->instagram_id) {
            $instagramService = app(\App\Services\InstagramService::class);
            $instagramService->sendMessage($channel, $contact->instagram_id, $message);
        }
    }

    /**
     * Reabre uma conversa (reabre o ticket).
     */
    public function reopenConversation(Ticket $ticket, ?User $reopenedBy = null): array
    {
        return DB::transaction(function () use ($ticket, $reopenedBy) {
            $ticket->update([
                'status' => TicketStatusEnum::OPEN,
                'closed_at' => null,
            ]);

            Log::info('Conversation reopened', [
                'ticket_id' => $ticket->id,
                'lead_id' => $ticket->lead_id,
                'reopened_by' => $reopenedBy?->id,
            ]);

            return [
                'success' => true,
                'message' => 'Conversa reaberta com sucesso',
                'ticket' => $ticket->fresh(),
            ];
        });
    }

    /**
     * Retorna opções de transferência para um lead.
     */
    public function getTransferOptions(Lead $lead): array
    {
        $currentQueue = $lead->queue;
        $channel = $lead->channel;
        $currentUser = auth()->user();
        $isAdmin = $currentUser && in_array($currentUser->role->value, ['admin', 'gestor']);

        // Usuários para transferência
        $sameQueueUsers = [];
        
        if ($currentQueue) {
            // Se tem fila, mostra usuários da fila
            $sameQueueUsers = $currentQueue->activeUsers()
                ->where('users.id', '!=', $lead->owner_id)
                ->get(['users.id', 'users.name', 'users.email'])
                ->toArray();
        }
        
        // Se não tem fila OU lista está vazia, mostra todos os usuários do tenant
        // Isso permite transferir leads que não estão em nenhuma fila
        if (empty($sameQueueUsers)) {
            $sameQueueUsers = User::where('tenant_id', $lead->tenant_id)
                ->where('is_active', true)
                ->when($lead->owner_id, fn($q) => $q->where('id', '!=', $lead->owner_id))
                ->get(['id', 'name', 'email'])
                ->toArray();
        }

        // Outras filas do canal (para transferir para outra fila)
        $otherQueues = [];
        if ($channel) {
            $otherQueues = $channel->activeQueues()
                ->when($currentQueue, fn($q) => $q->where('id', '!=', $currentQueue->id))
                ->with('activeUsers:id,name')
                ->get()
                ->map(fn($q) => [
                    'id' => $q->id,
                    'name' => $q->name,
                    'pipeline' => $q->pipeline?->name,
                    'users_count' => $q->activeUsers->count(),
                    'auto_distribute' => $q->auto_distribute,
                ])
                ->toArray();
        }
        
        // Se é admin e não tem filas do canal, mostra TODAS as filas do tenant
        if (empty($otherQueues) && $isAdmin) {
            $otherQueues = Queue::where('tenant_id', $lead->tenant_id)
                ->where('is_active', true)
                ->when($currentQueue, fn($q) => $q->where('id', '!=', $currentQueue->id))
                ->with('activeUsers:id,name')
                ->get()
                ->map(fn($q) => [
                    'id' => $q->id,
                    'name' => $q->name,
                    'pipeline' => $q->pipeline?->name,
                    'users_count' => $q->activeUsers->count(),
                    'auto_distribute' => $q->auto_distribute,
                ])
                ->toArray();
        }

        // Carteirizações existentes do lead (mostra onde já tem dono)
        $existingOwnerships = LeadQueueOwner::getLeadOwnerships($lead);

        return [
            'current_queue' => $currentQueue ? [
                'id' => $currentQueue->id,
                'name' => $currentQueue->name,
            ] : null,
            'current_owner' => $lead->owner ? [
                'id' => $lead->owner->id,
                'name' => $lead->owner->name,
            ] : null,
            'same_queue_users' => $sameQueueUsers,
            'other_queues' => $otherQueues,
            'existing_ownerships' => $existingOwnerships,
            'is_admin' => $isAdmin,
        ];
    }
}
