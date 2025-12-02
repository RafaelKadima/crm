<?php

namespace App\Http\Controllers;

use App\Enums\MessageDirectionEnum;
use App\Enums\SenderTypeEnum;
use App\Enums\TicketStatusEnum;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketController extends Controller
{
    /**
     * Lista tickets com filtros.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::with(['lead', 'contact', 'channel', 'assignedUser']);

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

        $query->orderByDesc('created_at');

        $tickets = $query->paginate($request->get('per_page', 15));

        return response()->json($tickets);
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

        $ticket = Ticket::create($validated);
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
     */
    public function sendMessage(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string',
            'direction' => 'nullable|string|in:inbound,outbound',
        ]);

        $message = TicketMessage::create([
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

        return response()->json([
            'message' => 'Mensagem enviada com sucesso.',
            'ticket_message' => $message,
        ], 201);
    }

    /**
     * Transfere o ticket para outro usuário.
     */
    public function transfer(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'assigned_user_id' => 'required|uuid|exists:users,id',
        ]);

        $newUser = User::find($validated['assigned_user_id']);
        $ticket->transferTo($newUser);

        $ticket->load(['lead', 'contact', 'channel', 'assignedUser']);

        return response()->json([
            'message' => 'Ticket transferido com sucesso.',
            'ticket' => $ticket,
        ]);
    }

    /**
     * Fecha o ticket.
     */
    public function close(Request $request, Ticket $ticket): JsonResponse
    {
        $request->validate([
            'result' => 'nullable|string|max:255',
        ]);

        $ticket->close();
        $ticket->load(['lead', 'contact', 'channel', 'assignedUser']);

        return response()->json([
            'message' => 'Ticket fechado com sucesso.',
            'ticket' => $ticket,
        ]);
    }
}


