<?php

namespace App\Services;

use App\Enums\TicketStatusEnum;
use App\Models\Channel;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\LeadQueueOwner;
use App\Models\Queue;
use App\Models\Ticket;
use Illuminate\Support\Facades\Log;

class QueueRoutingService
{
    protected LeadAssignmentService $assignmentService;

    public function __construct(LeadAssignmentService $assignmentService)
    {
        $this->assignmentService = $assignmentService;
    }

    /**
     * Verifica se um lead precisa do menu de filas.
     * 
     * Lógica:
     * - Se o ticket foi fechado manualmente, queue_id é resetado para null
     * - Se queue_id é null, SEMPRE mostra o menu (ignora timeout e tickets recentes)
     * - Timeout só se aplica se lead ainda tem queue_id definido
     */
    public function needsQueueMenu(Lead $lead, Channel $channel): bool
    {
        // Se o menu de filas não está habilitado no canal, não precisa do menu
        if (!$channel->hasQueueMenu()) {
            return false;
        }

        // PRIORIDADE: Se não tem fila definida, SEMPRE precisa do menu
        // (ticket foi fechado manualmente ou é primeira interação)
        // Ignoramos tickets recém-criados porque foram criados para esta mensagem
        if (!$lead->queue_id) {
            Log::info('Lead needs queue menu (no queue_id)', [
                'lead_id' => $lead->id,
                'channel_id' => $channel->id,
            ]);
            return true;
        }

        // Se tem queue_id, verifica se tem ticket ABERTO antigo (mais de 1 minuto)
        // Tickets recém-criados (menos de 1 minuto) são da mensagem atual
        $openTicket = $lead->tickets()
            ->where('status', TicketStatusEnum::OPEN)
            ->where('created_at', '<', now()->subMinute())
            ->first();
        
        if ($openTicket) {
            // Tem ticket aberto antigo, continua conversa sem menu
            return false;
        }

        // Se tem queue_id, verifica timeout (para casos de retorno automático)
        $lastClosedTicket = $lead->tickets()
            ->where('status', TicketStatusEnum::CLOSED)
            ->orderByDesc('closed_at')
            ->first();

        if ($lastClosedTicket && $lastClosedTicket->closed_at) {
            $timeoutHours = $channel->return_timeout_hours ?? 24;
            $hoursSinceClosed = $lastClosedTicket->closed_at->diffInHours(now());

            // Se fechou há menos de X horas, volta pro último atendente (sem menu)
            if ($hoursSinceClosed < $timeoutHours) {
                Log::info('Lead returning within timeout, skipping menu', [
                    'lead_id' => $lead->id,
                    'hours_since_closed' => $hoursSinceClosed,
                    'timeout_hours' => $timeoutHours,
                    'last_owner' => $lead->owner_id,
                ]);
                return false;
            }
        }

        return false;
    }

    /**
     * Verifica se um lead de retorno deve ir direto pro último atendente.
     * Retorna o ticket reaberto ou null se precisa passar pelo menu.
     * 
     * IMPORTANTE: Se queue_id é null (ticket fechado manualmente), 
     * NÃO reabre automaticamente - deve passar pelo menu primeiro.
     */
    public function handleReturningLeadWithTimeout(Lead $lead, Channel $channel): ?Ticket
    {
        // Se queue_id é null, o ticket foi fechado manualmente
        // Deve passar pelo menu, não reabrir automaticamente
        if (!$lead->queue_id) {
            Log::info('Lead has no queue_id, must go through menu', [
                'lead_id' => $lead->id,
            ]);
            return null;
        }

        // Verifica se está dentro do timeout
        $lastClosedTicket = $lead->tickets()
            ->where('status', TicketStatusEnum::CLOSED)
            ->orderByDesc('closed_at')
            ->first();

        if (!$lastClosedTicket || !$lastClosedTicket->closed_at) {
            return null;
        }

        $timeoutHours = $channel->return_timeout_hours ?? 24;
        $hoursSinceClosed = $lastClosedTicket->closed_at->diffInHours(now());

        // Se fechou há menos de X horas, reabre o ticket
        if ($hoursSinceClosed < $timeoutHours) {
            $lastClosedTicket->update([
                'status' => TicketStatusEnum::OPEN,
                'closed_at' => null,
            ]);

            Log::info('Ticket reopened due to return within timeout', [
                'ticket_id' => $lastClosedTicket->id,
                'lead_id' => $lead->id,
                'hours_since_closed' => $hoursSinceClosed,
            ]);

            return $lastClosedTicket->fresh();
        }

        return null;
    }

    /**
     * Gera o menu de filas para um canal.
     */
    public function generateMenu(Channel $channel): array
    {
        return Queue::generateMenuForChannel($channel->id);
    }

    /**
     * Processa a resposta do menu e roteia o lead para a fila correta.
     */
    public function processMenuResponse(Lead $lead, Channel $channel, string $response): ?Queue
    {
        $queue = Queue::findByMenuResponse($channel->id, $response);

        if (!$queue) {
            Log::warning('Queue not found for menu response', [
                'lead_id' => $lead->id,
                'channel_id' => $channel->id,
                'response' => $response,
            ]);
            return null;
        }

        // Roteia o lead para a fila
        return $this->routeLeadToQueue($lead, $queue);
    }

    /**
     * Roteia um lead para uma fila específica.
     * 
     * Verifica se o lead já tem dono (carteirização) nessa fila:
     * - SIM: Vai direto para o dono existente
     * - NÃO: Autodistribui se ativo ou fica sem dono
     * 
     * IMPORTANTE: Se o lead já estava neste pipeline, mantém o estágio atual.
     * Só vai para o primeiro estágio se for um pipeline diferente.
     */
    public function routeLeadToQueue(Lead $lead, Queue $queue): Queue
    {
        // #region agent log H6 - Route to queue entry
        file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H6','location'=>'QueueRoutingService:routeLeadToQueue:ENTRY','message'=>'Lead being routed to queue','data'=>['lead_id'=>$lead->id,'queue_id'=>$queue->id,'queue_name'=>$queue->name,'auto_distribute'=>$queue->auto_distribute],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
        // #endregion
        
        // Verifica se o lead já tem dono nesta fila (carteirização)
        $existingOwner = LeadQueueOwner::getOwnerForQueue($lead, $queue);
        
        // Determina o stage_id correto:
        // - Se o lead já estava neste pipeline, mantém o estágio atual
        // - Se está mudando de pipeline, vai para o primeiro estágio
        $isSamePipeline = $lead->pipeline_id === $queue->pipeline_id;
        $stageId = $isSamePipeline && $lead->stage_id
            ? $lead->stage_id 
            : ($queue->pipeline->firstStage()?->id ?? $lead->stage_id);
        
        if ($existingOwner) {
            // Lead já tem dono nesta fila - vai direto para ele
            $lead->update([
                'queue_id' => $queue->id,
                'pipeline_id' => $queue->pipeline_id,
                'stage_id' => $stageId,
                'owner_id' => $existingOwner->id,
            ]);

            Log::info('Lead routed to queue with existing owner (carteirização)', [
                'lead_id' => $lead->id,
                'queue_id' => $queue->id,
                'queue_name' => $queue->name,
                'owner_id' => $existingOwner->id,
                'owner_name' => $existingOwner->name,
                'kept_stage' => $isSamePipeline,
            ]);
        } else {
            // Lead não tem dono nesta fila
            $lead->update([
                'queue_id' => $queue->id,
                'pipeline_id' => $queue->pipeline_id,
                'stage_id' => $stageId,
            ]);

            Log::info('Lead routed to queue (new)', [
                'lead_id' => $lead->id,
                'queue_id' => $queue->id,
                'queue_name' => $queue->name,
                'pipeline_id' => $queue->pipeline_id,
                'stage_id' => $stageId,
                'kept_stage' => $isSamePipeline,
            ]);

            // Se a fila tem autodistribuição ativa, distribui o lead
            if ($queue->auto_distribute && $queue->hasAvailableUsers()) {
                $this->distributeLeadInQueue($lead, $queue);
            }
        }

        return $queue;
    }

    /**
     * Distribui um lead entre os usuários da fila.
     * Salva a carteirização para que o lead volte pro mesmo atendente no futuro.
     */
    public function distributeLeadInQueue(Lead $lead, Queue $queue): void
    {
        $eligibleUserIds = $queue->getActiveUserIds();

        if (empty($eligibleUserIds)) {
            Log::warning('No eligible users in queue for distribution', [
                'lead_id' => $lead->id,
                'queue_id' => $queue->id,
            ]);
            return;
        }

        try {
            $assignedUser = $this->assignmentService->assignLeadOwner($lead, $eligibleUserIds);
            
            // Salva a carteirização (lead → fila → usuário)
            LeadQueueOwner::setOwnerForQueue($lead, $queue, $assignedUser);
            
            Log::info('Lead distributed in queue (carteirização salva)', [
                'lead_id' => $lead->id,
                'queue_id' => $queue->id,
                'assigned_user_id' => $assignedUser->id,
                'assigned_user_name' => $assignedUser->name,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to distribute lead in queue', [
                'lead_id' => $lead->id,
                'queue_id' => $queue->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Verifica se a mensagem é uma resposta válida de menu.
     */
    public function isValidMenuResponse(Channel $channel, string $message): bool
    {
        $message = trim($message);
        
        // Verifica se é um número dentro do range de opções
        if (is_numeric($message)) {
            $option = (int) $message;
            return Queue::where('channel_id', $channel->id)
                ->where('menu_option', $option)
                ->where('is_active', true)
                ->exists();
        }

        // Verifica se contém alguma palavra-chave das filas
        return Queue::where('channel_id', $channel->id)
            ->where('is_active', true)
            ->where(function ($query) use ($message) {
                $query->where('menu_label', 'LIKE', "%{$message}%")
                    ->orWhere('name', 'LIKE', "%{$message}%");
            })
            ->exists();
    }

    /**
     * Retorna a fila padrão do canal (primeira ativa).
     */
    public function getDefaultQueue(Channel $channel): ?Queue
    {
        return Queue::where('channel_id', $channel->id)
            ->where('is_active', true)
            ->orderBy('menu_option')
            ->first();
    }

    /**
     * Processa roteamento de lead de retorno (que já teve interação anterior).
     * Mantém o lead na mesma fila e com o mesmo owner se possível.
     */
    public function handleReturningLead(Lead $lead, Channel $channel): void
    {
        // Se o lead já tem owner, mantém o owner
        if ($lead->owner_id) {
            Log::info('Returning lead kept with same owner', [
                'lead_id' => $lead->id,
                'owner_id' => $lead->owner_id,
            ]);
            return;
        }

        // Se o lead tem fila mas não tem owner, tenta distribuir novamente
        if ($lead->queue_id && !$lead->owner_id) {
            $queue = $lead->queue;
            if ($queue && $queue->auto_distribute && $queue->hasAvailableUsers()) {
                $this->distributeLeadInQueue($lead, $queue);
            }
        }
    }

    /**
     * Gera texto formatado do menu para envio via WhatsApp.
     * Usa as configurações personalizadas do canal se disponíveis.
     */
    public function getFormattedMenuText(Channel $channel, ?string $headerText = null): string
    {
        // Se tem headerText personalizado (ex: resposta inválida), usa ele
        if ($headerText) {
            $menu = $this->generateMenu($channel);
            return "{$headerText}\n\n{$menu['text']}\n\nDigite o número da opção desejada.";
        }
        
        // Usa o método do canal que já tem as configurações personalizadas
        return $channel->getQueueMenuText();
    }

    /**
     * Retorna a mensagem de resposta inválida do canal.
     */
    public function getInvalidResponseText(Channel $channel): string
    {
        return $channel->getQueueMenuInvalidResponse();
    }

    /**
     * Retorna estatísticas das filas de um canal.
     */
    public function getQueueStats(Channel $channel): array
    {
        $queues = $channel->activeQueues()->withCount(['leads', 'users'])->get();
        
        return $queues->map(function ($queue) {
            $leadsWithoutOwner = Lead::where('queue_id', $queue->id)
                ->whereNull('owner_id')
                ->count();
            
            return [
                'queue_id' => $queue->id,
                'name' => $queue->name,
                'leads_count' => $queue->leads_count,
                'users_count' => $queue->users_count,
                'leads_waiting' => $leadsWithoutOwner,
                'auto_distribute' => $queue->auto_distribute,
            ];
        })->toArray();
    }
}

