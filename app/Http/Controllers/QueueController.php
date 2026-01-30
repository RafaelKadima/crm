<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Queue;
use App\Models\User;
use App\Services\QueueRoutingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class QueueController extends Controller
{
    protected QueueRoutingService $routingService;

    public function __construct(QueueRoutingService $routingService)
    {
        $this->routingService = $routingService;
    }

    /**
     * Lista todas as filas do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Queue::with(['channel:id,name,type', 'pipeline:id,name', 'sdrAgent:id,name', 'users:id,name,email'])
            ->withCount(['leads', 'users']);

        // Filtro por canal
        if ($request->has('channel_id')) {
            $query->where('channel_id', $request->channel_id);
        }

        // Filtro por status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $queues = $query->orderBy('channel_id')->orderBy('menu_option')->get();

        return response()->json([
            'data' => $queues,
        ]);
    }

    /**
     * Lista filas de um canal específico.
     */
    public function byChannel(Channel $channel): JsonResponse
    {
        $queues = $channel->queues()
            ->with(['pipeline:id,name', 'sdrAgent:id,name', 'users:id,name,email'])
            ->withCount(['leads', 'users'])
            ->get();

        // Gera preview do menu
        $menuPreview = $this->routingService->getFormattedMenuText($channel);

        return response()->json([
            'data' => $queues,
            'menu_preview' => $menuPreview,
            'stats' => $this->routingService->getQueueStats($channel),
        ]);
    }

    /**
     * Exibe uma fila específica.
     */
    public function show(Queue $queue): JsonResponse
    {
        $queue->load(['channel:id,name,type', 'pipeline:id,name,stages', 'users:id,name,email,role']);
        $queue->loadCount(['leads', 'users']);

        // Leads aguardando distribuição
        $queue->leads_waiting = $queue->leads()->whereNull('owner_id')->count();

        return response()->json($queue);
    }

    /**
     * Cria uma nova fila.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel_id' => 'required|uuid|exists:channels,id',
            'pipeline_id' => 'required|uuid|exists:pipelines,id',
            'sdr_agent_id' => 'nullable|uuid|exists:sdr_agents,id',
            'name' => 'required|string|max:100',
            'menu_option' => [
                'required',
                'integer',
                'min:1',
                'max:9',
                Rule::unique('queues')->where(function ($query) use ($request) {
                    return $query->where('channel_id', $request->channel_id);
                }),
            ],
            'menu_label' => 'required|string|max:100',
            'welcome_message' => 'nullable|string|max:1000',
            'close_message' => 'nullable|string|max:1000',
            'auto_distribute' => 'boolean',
            'is_active' => 'boolean',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'uuid|exists:users,id',
        ]);

        $queue = DB::transaction(function () use ($validated) {
            $queue = Queue::create([
                'channel_id' => $validated['channel_id'],
                'pipeline_id' => $validated['pipeline_id'],
                'sdr_agent_id' => $validated['sdr_agent_id'] ?? null,
                'name' => $validated['name'],
                'menu_option' => $validated['menu_option'],
                'menu_label' => $validated['menu_label'],
                'welcome_message' => $validated['welcome_message'] ?? null,
                'close_message' => $validated['close_message'] ?? null,
                'auto_distribute' => $validated['auto_distribute'] ?? true,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            // Vincula usuários se fornecidos
            if (!empty($validated['user_ids'])) {
                $queue->users()->attach($validated['user_ids']);
            }

            return $queue;
        });

        $queue->load(['channel:id,name', 'pipeline:id,name', 'sdrAgent:id,name', 'users:id,name']);

        return response()->json([
            'message' => 'Fila criada com sucesso.',
            'queue' => $queue,
        ], 201);
    }

    /**
     * Atualiza uma fila.
     */
    public function update(Request $request, Queue $queue): JsonResponse
    {
        \Log::info('Queue update request', [
            'queue_id' => $queue->id,
            'all_input' => $request->all(),
            'sdr_disabled_raw' => $request->input('sdr_disabled'),
        ]);

        $validated = $request->validate([
            'pipeline_id' => 'sometimes|uuid|exists:pipelines,id',
            'sdr_agent_id' => 'nullable|uuid|exists:sdr_agents,id',
            'sdr_disabled' => 'sometimes|boolean',
            'name' => 'sometimes|string|max:100',
            'menu_option' => [
                'sometimes',
                'integer',
                'min:1',
                'max:9',
                Rule::unique('queues')->where(function ($query) use ($queue) {
                    return $query->where('channel_id', $queue->channel_id);
                })->ignore($queue->id),
            ],
            'menu_label' => 'sometimes|string|max:100',
            'welcome_message' => 'nullable|string|max:1000',
            'close_message' => 'nullable|string|max:1000',
            'auto_distribute' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
        ]);

        \Log::info('Queue update validated data', ['validated' => $validated]);

        $queue->update($validated);
        $queue->load(['channel:id,name', 'pipeline:id,name', 'sdrAgent:id,name', 'users:id,name']);

        return response()->json([
            'message' => 'Fila atualizada com sucesso.',
            'queue' => $queue,
        ]);
    }

    /**
     * Remove uma fila.
     */
    public function destroy(Queue $queue): JsonResponse
    {
        // Verifica se há leads na fila
        $leadsCount = $queue->leads()->count();
        
        if ($leadsCount > 0) {
            return response()->json([
                'error' => "Não é possível excluir. Existem {$leadsCount} leads associados a esta fila.",
            ], 422);
        }

        $queue->delete();

        return response()->json([
            'message' => 'Fila excluída com sucesso.',
        ]);
    }

    /**
     * Adiciona usuários a uma fila.
     */
    public function addUsers(Request $request, Queue $queue): JsonResponse
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'uuid|exists:users,id',
        ]);

        // Adiciona apenas os que não estão na fila
        $existingUserIds = $queue->users()->pluck('users.id')->toArray();
        $newUserIds = array_diff($validated['user_ids'], $existingUserIds);

        if (!empty($newUserIds)) {
            $queue->users()->attach($newUserIds);
        }

        $queue->load('users:id,name,email');

        return response()->json([
            'message' => count($newUserIds) . ' usuário(s) adicionado(s) à fila.',
            'queue' => $queue,
        ]);
    }

    /**
     * Remove usuários de uma fila.
     */
    public function removeUsers(Request $request, Queue $queue): JsonResponse
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'uuid|exists:users,id',
        ]);

        $queue->users()->detach($validated['user_ids']);
        $queue->load('users:id,name,email');

        return response()->json([
            'message' => 'Usuário(s) removido(s) da fila.',
            'queue' => $queue,
        ]);
    }

    /**
     * Atualiza status de um usuário na fila (ativo/inativo).
     */
    public function updateUserStatus(Request $request, Queue $queue, User $user): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => 'required|boolean',
            'priority' => 'sometimes|integer|min:0|max:100',
        ]);

        $queue->users()->updateExistingPivot($user->id, [
            'is_active' => $validated['is_active'],
            'priority' => $validated['priority'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Status do usuário atualizado.',
        ]);
    }

    /**
     * Sincroniza os usuários de uma fila (substitui todos).
     */
    public function syncUsers(Request $request, Queue $queue): JsonResponse
    {
        $validated = $request->validate([
            'user_ids' => 'present|array',
            'user_ids.*' => 'uuid|exists:users,id',
        ]);

        $queue->users()->sync($validated['user_ids']);
        $queue->load('users:id,name,email');

        return response()->json([
            'message' => 'Usuários da fila atualizados.',
            'queue' => $queue,
        ]);
    }

    /**
     * Reordena as opções do menu de filas.
     */
    public function reorderMenu(Request $request, Channel $channel): JsonResponse
    {
        $validated = $request->validate([
            'order' => 'required|array',
            'order.*.queue_id' => 'required|uuid|exists:queues,id',
            'order.*.menu_option' => 'required|integer|min:1|max:9',
        ]);

        DB::transaction(function () use ($validated, $channel) {
            foreach ($validated['order'] as $item) {
                Queue::where('id', $item['queue_id'])
                    ->where('channel_id', $channel->id)
                    ->update(['menu_option' => $item['menu_option']]);
            }
        });

        return response()->json([
            'message' => 'Menu reordenado com sucesso.',
            'menu_preview' => $this->routingService->getFormattedMenuText($channel),
        ]);
    }

    /**
     * Toggle autodistribuição de uma fila.
     */
    public function toggleAutoDistribute(Queue $queue): JsonResponse
    {
        $queue->update([
            'auto_distribute' => !$queue->auto_distribute,
        ]);

        return response()->json([
            'message' => $queue->auto_distribute 
                ? 'Autodistribuição ativada.' 
                : 'Autodistribuição desativada.',
            'auto_distribute' => $queue->auto_distribute,
        ]);
    }

    /**
     * Distribui leads sem dono de uma fila.
     */
    public function distributeWaitingLeads(Queue $queue): JsonResponse
    {
        if (!$queue->hasAvailableUsers()) {
            return response()->json([
                'error' => 'Não há usuários disponíveis na fila para distribuição.',
            ], 422);
        }

        $leadsWithoutOwner = $queue->leads()->whereNull('owner_id')->get();

        if ($leadsWithoutOwner->isEmpty()) {
            return response()->json([
                'message' => 'Não há leads aguardando distribuição.',
                'distributed' => 0,
            ]);
        }

        $distributed = 0;
        foreach ($leadsWithoutOwner as $lead) {
            $this->routingService->distributeLeadInQueue($lead, $queue);
            $distributed++;
        }

        return response()->json([
            'message' => "{$distributed} lead(s) distribuído(s) com sucesso.",
            'distributed' => $distributed,
        ]);
    }

    /**
     * Retorna estatísticas de todas as filas de um canal.
     */
    public function stats(Channel $channel): JsonResponse
    {
        return response()->json([
            'stats' => $this->routingService->getQueueStats($channel),
        ]);
    }
}

