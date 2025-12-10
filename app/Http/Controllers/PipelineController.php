<?php

namespace App\Http\Controllers;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PipelineController extends Controller
{
    /**
     * Lista pipelines acessíveis pelo usuário.
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        $query = Pipeline::with(['stages', 'sdrAgent'])
            ->accessibleBy($user)
            ->orderBy('name');

        // Incluir informações de permissão do usuário atual
        $pipelines = $query->get()->map(function ($pipeline) use ($user) {
            $pipeline->user_permissions = [
                'can_view' => $pipeline->userHasAccess($user),
                'can_edit' => $pipeline->userCanEdit($user),
                'can_manage_leads' => $pipeline->userCanManageLeads($user),
                'is_admin' => $user->role === 'admin' || $user->is_super_admin,
            ];
            return $pipeline;
        });

        return response()->json($pipelines);
    }

    /**
     * Cria um novo pipeline.
     */
    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        // Admin e gestor podem criar pipelines
        if (!in_array($user->role->value, ['admin', 'gestor']) && !$user->is_super_admin) {
            return response()->json(['error' => 'Sem permissão para criar pipelines.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_default' => 'nullable|boolean',
            'is_public' => 'nullable|boolean',
            'sdr_agent_id' => 'nullable|uuid|exists:sdr_agents,id',
            'stages' => 'nullable|array',
            'stages.*.name' => 'required|string|max:255',
            'stages.*.color' => 'nullable|string|max:20',
            'stages.*.order' => 'nullable|integer|min:0',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'uuid|exists:users,id',
        ]);

        $validated['tenant_id'] = $user->tenant_id;
        $stagesData = $validated['stages'] ?? [];
        $userIds = $validated['user_ids'] ?? [];
        unset($validated['stages'], $validated['user_ids']);

        $pipeline = Pipeline::create($validated);

        // Criar estágios se fornecidos
        if (!empty($stagesData)) {
            foreach ($stagesData as $index => $stageData) {
                PipelineStage::create([
                    'tenant_id' => $user->tenant_id,
                    'pipeline_id' => $pipeline->id,
                    'name' => $stageData['name'],
                    'color' => $stageData['color'] ?? '#6366F1',
                    'order' => $stageData['order'] ?? $index,
                ]);
            }
        }

        // Adicionar permissões de usuário
        if (!empty($userIds)) {
            foreach ($userIds as $userId) {
                $pipeline->users()->attach($userId, [
                    'id' => Str::uuid(),
                    'tenant_id' => $user->tenant_id,
                    'can_view' => true,
                    'can_edit' => false,
                    'can_delete' => false,
                    'can_manage_leads' => true,
                ]);
            }
        }

        if ($validated['is_default'] ?? false) {
            $pipeline->setAsDefault();
        }

        $pipeline->load(['stages', 'users', 'sdrAgent']);

        return response()->json([
            'message' => 'Pipeline criado com sucesso.',
            'pipeline' => $pipeline,
        ], 201);
    }

    /**
     * Exibe um pipeline específico.
     */
    public function show(Pipeline $pipeline): JsonResponse
    {
        $user = auth()->user();
        
        if (!$pipeline->userHasAccess($user)) {
            return response()->json(['error' => 'Sem permissão para ver este pipeline.'], 403);
        }

        $pipeline->load(['stages', 'users', 'sdrAgent']);
        $pipeline->user_permissions = [
            'can_view' => true,
            'can_edit' => $pipeline->userCanEdit($user),
            'can_manage_leads' => $pipeline->userCanManageLeads($user),
            'is_admin' => $user->role === 'admin' || $user->is_super_admin,
        ];

        return response()->json($pipeline);
    }

    /**
     * Atualiza um pipeline.
     */
    public function update(Request $request, Pipeline $pipeline): JsonResponse
    {
        $user = auth()->user();
        
        if (!$pipeline->userCanEdit($user)) {
            return response()->json(['error' => 'Sem permissão para editar este pipeline.'], 403);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_default' => 'nullable|boolean',
            'is_public' => 'nullable|boolean',
            'sdr_agent_id' => 'nullable|uuid|exists:sdr_agents,id',
        ]);

        $pipeline->update($validated);

        if ($validated['is_default'] ?? false) {
            $pipeline->setAsDefault();
        }

        $pipeline->load(['stages', 'users', 'sdrAgent']);

        return response()->json([
            'message' => 'Pipeline atualizado com sucesso.',
            'pipeline' => $pipeline,
        ]);
    }

    /**
     * Remove um pipeline.
     */
    public function destroy(Pipeline $pipeline): JsonResponse
    {
        $user = auth()->user();
        
        if (!in_array($user->role->value, ['admin', 'gestor']) && !$user->is_super_admin) {
            return response()->json(['error' => 'Apenas administradores e gestores podem excluir pipelines.'], 403);
        }

        // Não permitir excluir pipeline padrão
        if ($pipeline->is_default) {
            return response()->json(['error' => 'Não é possível excluir o pipeline padrão.'], 400);
        }

        $pipeline->delete();

        return response()->json([
            'message' => 'Pipeline removido com sucesso.',
        ]);
    }

    /**
     * Lista usuários com acesso ao pipeline.
     */
    public function users(Pipeline $pipeline): JsonResponse
    {
        $users = $pipeline->users()->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'permissions' => [
                    'can_view' => $user->pivot->can_view,
                    'can_edit' => $user->pivot->can_edit,
                    'can_delete' => $user->pivot->can_delete,
                    'can_manage_leads' => $user->pivot->can_manage_leads,
                ],
            ];
        });

        return response()->json($users);
    }

    /**
     * Adiciona usuário ao pipeline.
     */
    public function addUser(Request $request, Pipeline $pipeline): JsonResponse
    {
        $user = auth()->user();
        
        if (!in_array($user->role->value, ['admin', 'gestor']) && !$user->is_super_admin) {
            return response()->json(['error' => 'Sem permissão.'], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'can_view' => 'nullable|boolean',
            'can_edit' => 'nullable|boolean',
            'can_delete' => 'nullable|boolean',
            'can_manage_leads' => 'nullable|boolean',
        ]);

        // Verificar se já existe
        if ($pipeline->users()->where('user_id', $validated['user_id'])->exists()) {
            return response()->json(['error' => 'Usuário já tem acesso a este pipeline.'], 400);
        }

        $pipeline->users()->attach($validated['user_id'], [
            'id' => Str::uuid(),
            'tenant_id' => $user->tenant_id,
            'can_view' => $validated['can_view'] ?? true,
            'can_edit' => $validated['can_edit'] ?? false,
            'can_delete' => $validated['can_delete'] ?? false,
            'can_manage_leads' => $validated['can_manage_leads'] ?? true,
        ]);

        return response()->json([
            'message' => 'Usuário adicionado ao pipeline.',
        ]);
    }

    /**
     * Atualiza permissões de um usuário no pipeline.
     */
    public function updateUserPermissions(Request $request, Pipeline $pipeline, string $userId): JsonResponse
    {
        $user = auth()->user();
        
        if (!in_array($user->role->value, ['admin', 'gestor']) && !$user->is_super_admin) {
            return response()->json(['error' => 'Sem permissão.'], 403);
        }

        $validated = $request->validate([
            'can_view' => 'nullable|boolean',
            'can_edit' => 'nullable|boolean',
            'can_delete' => 'nullable|boolean',
            'can_manage_leads' => 'nullable|boolean',
        ]);

        $pipeline->users()->updateExistingPivot($userId, $validated);

        return response()->json([
            'message' => 'Permissões atualizadas.',
        ]);
    }

    /**
     * Remove usuário do pipeline.
     */
    public function removeUser(Pipeline $pipeline, string $userId): JsonResponse
    {
        $user = auth()->user();
        
        if (!in_array($user->role->value, ['admin', 'gestor']) && !$user->is_super_admin) {
            return response()->json(['error' => 'Sem permissão.'], 403);
        }

        $pipeline->users()->detach($userId);

        return response()->json([
            'message' => 'Usuário removido do pipeline.',
        ]);
    }

    /**
     * Sincroniza usuários do pipeline.
     */
    public function syncUsers(Request $request, Pipeline $pipeline): JsonResponse
    {
        $user = auth()->user();
        
        if (!in_array($user->role->value, ['admin', 'gestor']) && !$user->is_super_admin) {
            return response()->json(['error' => 'Sem permissão.'], 403);
        }

        $validated = $request->validate([
            'users' => 'required|array',
            'users.*.user_id' => 'required|uuid|exists:users,id',
            'users.*.can_view' => 'nullable|boolean',
            'users.*.can_edit' => 'nullable|boolean',
            'users.*.can_delete' => 'nullable|boolean',
            'users.*.can_manage_leads' => 'nullable|boolean',
        ]);

        // Montar array para sync
        $syncData = [];
        foreach ($validated['users'] as $userData) {
            $syncData[$userData['user_id']] = [
                'id' => Str::uuid(),
                'tenant_id' => $user->tenant_id,
                'can_view' => $userData['can_view'] ?? true,
                'can_edit' => $userData['can_edit'] ?? false,
                'can_delete' => $userData['can_delete'] ?? false,
                'can_manage_leads' => $userData['can_manage_leads'] ?? true,
            ];
        }

        $pipeline->users()->sync($syncData);

        return response()->json([
            'message' => 'Usuários sincronizados.',
        ]);
    }

    /**
     * Lista os estágios de um pipeline.
     */
    public function stages(Pipeline $pipeline): JsonResponse
    {
        return response()->json($pipeline->stages);
    }

    /**
     * Cria um novo estágio no pipeline.
     */
    public function storeStage(Request $request, Pipeline $pipeline): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:20',
            'gtm_event_key' => 'nullable|string|max:100',
        ]);

        // Se não informou a ordem, coloca no final
        if (!isset($validated['order'])) {
            $maxOrder = $pipeline->stages()->max('order') ?? -1;
            $validated['order'] = $maxOrder + 1;
        }

        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['pipeline_id'] = $pipeline->id;

        $stage = PipelineStage::create($validated);

        return response()->json([
            'message' => 'Estágio criado com sucesso.',
            'stage' => $stage,
        ], 201);
    }

    /**
     * Atualiza um estágio do pipeline.
     */
    public function updateStage(Request $request, Pipeline $pipeline, PipelineStage $stage): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:20',
            'gtm_event_key' => 'nullable|string|max:100',
        ]);

        $stage->update($validated);

        return response()->json([
            'message' => 'Estágio atualizado com sucesso.',
            'stage' => $stage,
        ]);
    }

    /**
     * Remove um estágio do pipeline.
     */
    public function destroyStage(Pipeline $pipeline, PipelineStage $stage): JsonResponse
    {
        $stage->delete();

        return response()->json([
            'message' => 'Estágio removido com sucesso.',
        ]);
    }
}


