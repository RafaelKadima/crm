<?php

namespace App\Http\Controllers;

use App\Enums\ChannelTypeEnum;
use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Enums\TicketStatusEnum;
use App\Events\TicketMessageCreated;
use App\Events\TicketStatusChanged;
use App\Models\Queue;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use App\Services\LeadTransferService;
use App\Services\WhatsAppService;
use App\Services\InstagramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class TicketController extends Controller
{
    protected LeadTransferService $transferService;

    public function __construct(LeadTransferService $transferService)
    {
        $this->transferService = $transferService;
    }
    /**
     * Lista tickets com filtros.
     * 
     * Permissões por role:
     * - Administrador: vê todos os tickets
     * - Gestor: vê tickets das filas onde está cadastrado
     * - Vendedor/Marketing: vê apenas tickets onde é responsável ou é dono do lead
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            $query = Ticket::with(['lead', 'contact', 'channel', 'assignedUser', 'lastMessage'])
                ->withCount('messages')
                ->where('tenant_id', $user->tenant_id); // SEMPRE filtrar por tenant

        // Aplica filtro baseado no role do usuário
        if ($user->isAdmin()) {
            // Admin vê todos os tickets do SEU tenant
        } elseif ($user->isGestor()) {
            // Gestor vê tickets das filas onde está cadastrado
            $userQueueIds = $user->queues()->pluck('queues.id')->toArray();
            
            if (!empty($userQueueIds)) {
                $query->where(function ($q) use ($user, $userQueueIds) {
                    // Tickets de leads nas filas do gestor
                    $q->whereHas('lead', function ($leadQuery) use ($userQueueIds) {
                        $leadQuery->whereIn('queue_id', $userQueueIds);
                    })
                    // OU tickets onde é o responsável direto
                    ->orWhere('assigned_user_id', $user->id);
                });
            } else {
                // Gestor sem filas vê apenas os seus
                $query->where('assigned_user_id', $user->id);
            }
        } else {
            // Vendedor/Marketing vê apenas os seus
            $query->where(function ($q) use ($user) {
                $q->where('assigned_user_id', $user->id)
                  ->orWhereHas('lead', function ($leadQuery) use ($user) {
                      $leadQuery->where('owner_id', $user->id);
                  });
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('assigned_user_id')) {
            $query->where('assigned_user_id', $request->assigned_user_id);
        }

        if ($request->has('channel_id')) {
            $query->where('channel_id', $request->channel_id);
        }

        if ($request->has('contact_phone')) {
            $query->whereHas('contact', function ($q) use ($request) {
                $q->where('phone', 'like', "%{$request->contact_phone}%");
            });
        }

        // Filtro especial: tickets aguardando seleção de fila
        if ($request->has('waiting_queue') && $request->waiting_queue) {
            $query->whereHas('lead', function ($q) {
                $q->whereNull('queue_id');
            })->where('status', '!=', 'closed');
        }

        $query->orderByDesc('created_at');

        $tickets = $query->paginate(min((int) $request->get('per_page', 15), 100));

        return response()->json($tickets);
        } catch (\Exception $e) {
            Log::error('Error listing tickets', ['error' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Cria um novo ticket.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact_id' => 'required|uuid|exists:contacts,id',
            'channel_id' => 'required|uuid|exists:channels,id',
            'lead_id' => 'nullable|uuid|exists:leads,id',
            'assigned_user_id' => 'nullable|uuid|exists:users,id',
        ]);

        // Criação manual via API/painel = ação explícita do atendente.
        // Já nasce OPEN (não passa pelo estado pendente, pois alguém está atuando).
        $ticket = Ticket::create([
            ...$validated,
            'status' => TicketStatusEnum::OPEN,
        ]);
        $ticket->load(['lead', 'contact', 'channel', 'assignedUser']);

        return response()->json([
            'message' => 'Ticket criado com sucesso.',
            'ticket' => $ticket,
        ], 201);
    }

    /**
     * Exibe um ticket específico com mensagens.
     */
    public function show(Ticket $ticket): JsonResponse
    {
        $ticket->load(['lead.stage', 'contact', 'channel', 'assignedUser', 'messages']);

        return response()->json($ticket);
    }

    /**
     * Atualiza um ticket.
     */
    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|string|in:open,pending,waiting_customer,closed',
            'assigned_user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $ticket->update($validated);
        $ticket->load(['lead', 'contact', 'channel', 'assignedUser']);

        return response()->json([
            'message' => 'Ticket atualizado com sucesso.',
            'ticket' => $ticket,
        ]);
    }

    /**
     * Remove um ticket.
     */
    public function destroy(Ticket $ticket): JsonResponse
    {
        $ticket->delete();

        return response()->json([
            'message' => 'Ticket removido com sucesso.',
        ]);
    }

    /**
     * Envia uma mensagem no ticket.
     * Envia via WhatsApp/Instagram se o canal suportar.
     */
    public function sendMessage(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string',
            'direction' => 'nullable|string|in:inbound,outbound',
        ]);

        $ticket->load(['channel', 'contact', 'lead']);
        $channel = $ticket->channel;
        $contact = $ticket->contact;

        // Verifica se tem contato e telefone para WhatsApp
        if (!$contact) {
            return response()->json(['error' => 'Ticket não possui contato associado.'], 400);
        }

        // Reabre o ticket se estiver fechado
        if ($ticket->status === TicketStatusEnum::CLOSED) {
            $ticket->update([
                'status' => TicketStatusEnum::OPEN,
                'closed_at' => null,
            ]);
        }

        try {
            // Envia via canal apropriado
            $channelResponse = null;

            if ($channel && $channel->type === ChannelTypeEnum::WHATSAPP) {
                if (!$contact->phone) {
                    return response()->json(['error' => 'Contato não possui telefone cadastrado.'], 400);
                }
                $whatsAppService = new WhatsAppService($channel);
                $channelResponse = $whatsAppService->sendTextMessage($contact->phone, $validated['message']);
            } elseif ($channel && $channel->type === ChannelTypeEnum::INSTAGRAM) {
                $igUserId = $contact->extra_data['instagram_user_id'] ?? null;
                if ($igUserId) {
                    $instagramService = new InstagramService($channel);
                    $channelResponse = $instagramService->sendTextMessage($igUserId, $validated['message']);
                }
            }

            // Salva mensagem no banco
            $ticketMessage = TicketMessage::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'sender_type' => SenderTypeEnum::USER,
                'sender_id' => auth()->id(),
                'message' => $validated['message'],
                'direction' => $validated['direction'] ?? MessageDirectionEnum::OUTBOUND,
                'sent_at' => now(),
            ]);

            // Atualiza último contato do lead
            if ($ticket->lead) {
                $ticket->lead->updateLastInteraction(\App\Enums\InteractionSourceEnum::HUMAN);
            }

            // Broadcast para atualização em tempo real
            event(new TicketMessageCreated($ticketMessage, $ticket));

            // Invalida cache de mensagens
            self::invalidateMessagesCache($ticket->id);

            return response()->json($ticketMessage, 201);

        } catch (\Exception $e) {
            Log::error('Failed to send message', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Erro ao enviar mensagem: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Envia uma mensagem de template do WhatsApp.
     *
     * POST /api/tickets/{ticket}/template
     */
    public function sendTemplate(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'template_id' => 'required|uuid|exists:whatsapp_templates,id',
            'variables' => 'nullable|array',
        ]);

        $ticket->load(['channel', 'contact', 'lead']);
        $channel = $ticket->channel;
        $contact = $ticket->contact;

        if (!$contact) {
            return response()->json(['error' => 'Ticket não possui contato associado.'], 400);
        }

        if (!$contact->phone) {
            return response()->json(['error' => 'Contato não possui telefone cadastrado.'], 400);
        }

        if (!$channel || $channel->type !== ChannelTypeEnum::WHATSAPP) {
            return response()->json(['error' => 'Este ticket não é do canal WhatsApp.'], 400);
        }

        // Busca o template
        $template = \App\Models\WhatsAppTemplate::find($validated['template_id']);

        if (!$template || !$template->canSend()) {
            return response()->json(['error' => 'Template não encontrado ou não aprovado.'], 400);
        }

        try {
            // Prepara os componentes do template
            $components = [];
            $variables = $validated['variables'] ?? [];

            // Body variables
            if (!empty($variables)) {
                $bodyParameters = array_map(fn($value) => [
                    'type' => 'text',
                    'text' => (string) $value,
                ], array_values($variables));

                $components[] = [
                    'type' => 'body',
                    'parameters' => $bodyParameters,
                ];
            }

            // Envia via WhatsApp API
            $whatsAppService = new WhatsAppService($channel);
            $channelResponse = $whatsAppService->sendTemplateMessage(
                $contact->phone,
                $template->name,
                $template->language ?? 'pt_BR',
                $components
            );

            Log::info('[SEND TEMPLATE] WhatsApp response', [
                'ticket_id' => $ticket->id,
                'template_name' => $template->name,
                'response' => $channelResponse,
            ]);

            // Renderiza o body do template para salvar no banco
            $renderedBody = $template->renderBody($variables);

            // Salva mensagem no banco
            $ticketMessage = TicketMessage::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'sender_type' => SenderTypeEnum::USER,
                'sender_id' => auth()->id(),
                'message' => $renderedBody,
                'direction' => MessageDirectionEnum::OUTBOUND,
                'sent_at' => now(),
                'metadata' => [
                    'type' => 'template',
                    'template_id' => $template->id,
                    'template_name' => $template->name,
                    'whatsapp_message_id' => $channelResponse['messages'][0]['id'] ?? null,
                ],
            ]);

            // Atualiza último contato do lead
            if ($ticket->lead) {
                $ticket->lead->updateLastInteraction(\App\Enums\InteractionSourceEnum::HUMAN);
            }

            // Broadcast para atualização em tempo real
            event(new TicketMessageCreated($ticketMessage, $ticket));

            // Invalida cache de mensagens
            self::invalidateMessagesCache($ticket->id);

            return response()->json($ticketMessage, 201);

        } catch (\Exception $e) {
            Log::error('Failed to send template', [
                'ticket_id' => $ticket->id,
                'template_id' => $template->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Erro ao enviar template: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Transfere o ticket/lead para outro usuário (na mesma fila).
     */
    public function transfer(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
        ]);

        $lead = $ticket->lead;
        if (!$lead) {
            return response()->json(['message' => 'Ticket não possui lead associado.'], 400);
        }

        $newUser = User::find($validated['user_id']);
        $previousOwnerId = $lead->owner_id;
        $result = $this->transferService->transferToUser($lead, $newUser, auth()->user());

        $ticket->load(['lead.queue', 'lead.owner', 'contact', 'channel', 'assignedUser']);

        // 🔥 Broadcast para atualização em tempo real
        $lead->refresh()->load(['contact', 'owner', 'stage', 'channel']);
        broadcast(new \App\Events\LeadUpdated($lead, 'transferred'))->toOthers();

        return response()->json([
            'message' => $result['message'],
            'ticket' => $ticket,
            'previous_owner_id' => $previousOwnerId,
            'new_owner' => $newUser->only(['id', 'name']),
        ]);
    }

    /**
     * Transfere o ticket/lead para outra fila.
     */
    public function transferToQueue(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'queue_id' => 'required|uuid|exists:queues,id',
            'user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $lead = $ticket->lead;
        if (!$lead) {
            return response()->json(['message' => 'Ticket não possui lead associado.'], 400);
        }

        $newQueue = Queue::find($validated['queue_id']);
        $newUser = isset($validated['user_id']) ? User::find($validated['user_id']) : null;
        $previousOwnerId = $lead->owner_id;

        $result = $this->transferService->transferToQueue($lead, $newQueue, $newUser, auth()->user());

        $ticket->load(['lead.queue', 'lead.owner', 'contact', 'channel', 'assignedUser']);

        // 🔥 Broadcast para atualização em tempo real
        $lead->refresh()->load(['contact', 'owner', 'stage', 'channel']);
        broadcast(new \App\Events\LeadUpdated($lead, 'transferred'))->toOthers();

        return response()->json([
            'message' => $result['message'],
            'ticket' => $ticket,
            'queue' => $result['queue'],
            'user' => $result['user'],
            'previous_owner_id' => $previousOwnerId,
        ]);
    }

    /**
     * Retorna opções de transferência para o ticket/lead.
     */
    public function transferOptions(Ticket $ticket): JsonResponse
    {
        $lead = $ticket->lead;
        if (!$lead) {
            return response()->json(['message' => 'Ticket não possui lead associado.'], 400);
        }

        $options = $this->transferService->getTransferOptions($lead);

        return response()->json($options);
    }

    /**
     * Fecha o ticket (encerra a conversa).
     */
    public function close(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:255',
        ]);

        $result = $this->transferService->closeConversation(
            $ticket, 
            auth()->user(), 
            $validated['reason'] ?? null
        );

        return response()->json([
            'message' => $result['message'],
            'ticket' => $result['ticket'],
        ]);
    }

    /**
     * Reabre o ticket.
     */
    public function reopen(Ticket $ticket): JsonResponse
    {
        $result = $this->transferService->reopenConversation($ticket, auth()->user());

        return response()->json([
            'message' => $result['message'],
            'ticket' => $result['ticket'],
        ]);
    }

    /**
     * Marca o ticket como aberto pela primeira vez.
     *
     * Chamado pelo frontend quando um atendente clica numa conversa pendente.
     * Transição: pending → open. Idempotente para todos os outros estados.
     *
     * IMPORTANTE: este endpoint NÃO mexe em assigned_user_id nem em lead.owner_id.
     * Ownership continua sendo responsabilidade exclusiva da autodistribuição da fila.
     * O campo first_viewer_id é apenas métrica de SLA, não representa titularidade.
     */
    public function markAsOpened(Ticket $ticket): JsonResponse
    {
        // Idempotente: se não está pendente, não faz nada — só devolve o ticket atual.
        if ($ticket->status !== TicketStatusEnum::PENDING) {
            $ticket->load(['lead', 'contact', 'channel', 'assignedUser']);
            return response()->json([
                'message' => 'Ticket já estava aberto.',
                'ticket' => $ticket,
                'changed' => false,
            ]);
        }

        $previousStatus = $ticket->status->value;

        $ticket->update([
            'status' => TicketStatusEnum::OPEN,
            // first_viewed_at / first_viewer_id só são preenchidos uma vez
            // (não sobrescrevem se já tiverem valor de uma rodada anterior).
            'first_viewed_at' => $ticket->first_viewed_at ?? now(),
            'first_viewer_id' => $ticket->first_viewer_id ?? auth()->id(),
        ]);

        $ticket->load(['lead', 'contact', 'channel', 'assignedUser']);

        Log::info('Ticket marked as opened by first viewer', [
            'ticket_id' => $ticket->id,
            'first_viewer_id' => $ticket->first_viewer_id,
            'first_viewed_at' => $ticket->first_viewed_at?->toIso8601String(),
            'assigned_user_id' => $ticket->assigned_user_id, // preservado, NÃO foi alterado
        ]);

        // Broadcast pra atualizar a inbox dos outros atendentes em tempo real.
        broadcast(new TicketStatusChanged($ticket, $previousStatus))->toOthers();

        return response()->json([
            'message' => 'Ticket aberto com sucesso.',
            'ticket' => $ticket,
            'changed' => true,
        ]);
    }

    /**
     * Busca mensagens do ticket com paginação (lazy load).
     * Retorna as mensagens mais recentes primeiro.
     */
    public function messages(Request $request, Ticket $ticket): JsonResponse
    {
        $perPage = min((int) $request->get('per_page', 30), 100);
        $page = $request->get('page', 1);

        // Cache key para as últimas mensagens (primeira página)
        $cacheKey = "ticket:{$ticket->id}:messages:page:{$page}";
        $cacheTtl = 30; // 30 segundos

        // Tenta buscar do cache se for a primeira página
        if ($page == 1 && Cache::has($cacheKey)) {
            $cachedData = Cache::get($cacheKey);
            return response()->json($cachedData);
        }

        // Busca mensagens ordenadas por data (mais recentes primeiro)
        $messages = TicketMessage::where('ticket_id', $ticket->id)
            ->orderByDesc('sent_at')
            ->paginate($perPage);

        // Formata os dados
        $data = [
            'data' => $messages->items(),
            'current_page' => $messages->currentPage(),
            'last_page' => $messages->lastPage(),
            'per_page' => $messages->perPage(),
            'total' => $messages->total(),
            'has_more' => $messages->hasMorePages(),
        ];

        // Cache apenas a primeira página
        if ($page == 1) {
            Cache::put($cacheKey, $data, $cacheTtl);
        }

        return response()->json($data);
    }

    /**
     * Invalida o cache de mensagens do ticket.
     * Chamado quando uma nova mensagem é enviada.
     */
    public static function invalidateMessagesCache(string $ticketId): void
    {
        Cache::forget("ticket:{$ticketId}:messages:page:1");
    }

    /**
     * Toggle IA para este ticket.
     * Quando desativada, o vendedor assume e a IA apenas observa/aprende.
     */
    public function toggleIa(Ticket $ticket): JsonResponse
    {
        if ($ticket->hasIaEnabled()) {
            $ticket->disableIa(auth()->user());
            $message = 'IA desativada. Você assumiu o atendimento.';
        } else {
            $ticket->enableIa();
            $message = 'IA reativada. O agente voltará a responder automaticamente.';
        }

        return response()->json([
            'message' => $message,
            'ia_enabled' => $ticket->ia_enabled,
            'ticket' => $ticket->fresh(),
        ]);
    }

    /**
     * Retorna o status da IA para este ticket.
     */
    public function iaStatus(Ticket $ticket): JsonResponse
    {
        return response()->json([
            'ia_enabled' => $ticket->hasIaEnabled(),
            'ia_disabled_by' => $ticket->iaDisabledBy?->name,
            'ia_disabled_at' => $ticket->ia_disabled_at?->toISOString(),
        ]);
    }

    /**
     * Edita uma mensagem do ticket.
     * Apenas mensagens enviadas pelo usuário atual podem ser editadas.
     * A edição é apenas visual no CRM - não altera no WhatsApp.
     */
    public function updateMessage(Request $request, Ticket $ticket, string $messageId): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:4096',
        ]);

        $ticketMessage = TicketMessage::where('id', $messageId)
            ->where('ticket_id', $ticket->id)
            ->first();

        if (!$ticketMessage) {
            return response()->json(['error' => 'Mensagem não encontrada.'], 404);
        }

        // Apenas mensagens enviadas pelo próprio usuário ou por outros usuários/IA podem ser editadas
        // Mensagens recebidas do cliente (inbound) não podem ser editadas
        if ($ticketMessage->direction === MessageDirectionEnum::INBOUND) {
            return response()->json(['error' => 'Não é possível editar mensagens recebidas.'], 403);
        }

        // Salva a mensagem original no metadata (se ainda não foi editada)
        $metadata = $ticketMessage->metadata ?? [];
        if (!isset($metadata['original_message'])) {
            $metadata['original_message'] = $ticketMessage->message;
        }
        $metadata['edited_at'] = now()->toIso8601String();
        $metadata['edited_by'] = auth()->id();

        $ticketMessage->update([
            'message' => $validated['message'],
            'metadata' => $metadata,
        ]);

        return response()->json([
            'message' => 'Mensagem editada com sucesso.',
            'ticket_message' => $ticketMessage,
        ]);
    }

    /**
     * Exclui uma mensagem do ticket.
     * Apenas mensagens enviadas pelo usuário atual podem ser excluídas.
     * A exclusão é apenas visual no CRM - não altera no WhatsApp.
     */
    public function deleteMessage(Request $request, Ticket $ticket, string $messageId): JsonResponse
    {
        $ticketMessage = TicketMessage::where('id', $messageId)
            ->where('ticket_id', $ticket->id)
            ->first();

        if (!$ticketMessage) {
            return response()->json(['error' => 'Mensagem não encontrada.'], 404);
        }

        // Apenas mensagens enviadas (outbound) podem ser excluídas
        if ($ticketMessage->direction === MessageDirectionEnum::INBOUND) {
            return response()->json(['error' => 'Não é possível excluir mensagens recebidas.'], 403);
        }

        // Soft delete - marca como excluída no metadata em vez de deletar
        $metadata = $ticketMessage->metadata ?? [];
        $metadata['deleted_at'] = now()->toIso8601String();
        $metadata['deleted_by'] = auth()->id();
        $metadata['original_message'] = $ticketMessage->message;

        $ticketMessage->update([
            'message' => '[Mensagem excluída]',
            'metadata' => $metadata,
        ]);

        return response()->json([
            'message' => 'Mensagem excluída com sucesso.',
        ]);
    }
}


