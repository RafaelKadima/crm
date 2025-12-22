<?php

namespace App\Http\Controllers;

use App\Enums\PlanEnum;
use App\Models\Group;
use App\Models\Permission;
use App\Models\SuperAdminLog;
use App\Models\Tenant;
use App\Models\TenantFeature;
use App\Models\User;
use App\Services\DefaultPipelineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SuperAdminController extends Controller
{
    /**
     * Dashboard do Super Admin.
     */
    public function dashboard(): JsonResponse
    {
        $stats = [
            'total_tenants' => Tenant::count(),
            'active_tenants' => Tenant::where('is_active', true)->count(),
            'total_users' => User::where('is_super_admin', false)->count(),
            'total_leads' => DB::table('leads')->count(),
            'tenants_by_plan' => Tenant::selectRaw('plan, count(*) as count')
                ->groupBy('plan')
                ->pluck('count', 'plan'),
            'recent_tenants' => Tenant::latest()->take(5)->get(['id', 'name', 'plan', 'is_active', 'created_at']),
            'recent_logs' => SuperAdminLog::with('user:id,name')
                ->latest()
                ->take(10)
                ->get(),
        ];

        return response()->json($stats);
    }

    // ==========================================
    // TENANTS (EMPRESAS)
    // ==========================================

    /**
     * Lista todos os tenants.
     */
    public function listTenants(Request $request): JsonResponse
    {
        $query = Tenant::withCount(['users', 'leads', 'channels']);

        // Filtros
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->has('plan')) {
            $query->where('plan', $request->plan);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $tenants = $query->orderBy($request->get('sort_by', 'created_at'), $request->get('sort_dir', 'desc'))
            ->paginate($request->get('per_page', 20));

        return response()->json($tenants);
    }

    /**
     * Cria um novo tenant.
     */
    public function createTenant(Request $request): JsonResponse
    {
        \Log::info('=== CREATE TENANT REQUEST ===', [
            'data' => $request->all(),
            'user' => auth()->user()?->id,
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:100|unique:tenants,slug',
            'plan' => ['required', Rule::enum(PlanEnum::class)],
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|string|min:8',
            'whatsapp_number' => 'nullable|string',
            'ia_enabled' => 'boolean',
            'features' => 'nullable|array',
        ]);

        return DB::transaction(function () use ($validated) {
            // Criar tenant
            $tenant = Tenant::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'] ?? Str::slug($validated['name']),
                'plan' => $validated['plan'],
                'whatsapp_number' => $validated['whatsapp_number'] ?? null,
                'ia_enabled' => $validated['ia_enabled'] ?? false,
                'is_active' => true,
                'settings' => [],
            ]);

            // Criar usuário admin do tenant
            $admin = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => Hash::make($validated['admin_password']),
                'role' => 'admin',
                'is_active' => true,
            ]);

            // Criar pipelines padrão com estágios
            DefaultPipelineService::createForTenant($tenant);

            // Ativar features selecionadas
            if (!empty($validated['features'])) {
                foreach ($validated['features'] as $featureKey) {
                    TenantFeature::enableForTenant($tenant->id, $featureKey);
                }
            }

            // Log da ação
            SuperAdminLog::log('tenant.create', $tenant->id, $admin->id, [
                'tenant_name' => $tenant->name,
                'plan' => $tenant->plan->value,
                'admin_email' => $admin->email,
            ]);

            return response()->json([
                'message' => 'Empresa criada com sucesso!',
                'tenant' => $tenant->load('users'),
            ], 201);
        });
    }

    /**
     * Exibe detalhes de um tenant.
     */
    public function showTenant(Tenant $tenant): JsonResponse
    {
        $tenant->load(['users', 'channels', 'sdrAgents']);
        $tenant->loadCount(['leads', 'contacts', 'pipelines']);

        // Carrega features
        $features = TenantFeature::getTenantFeatures($tenant->id);

        return response()->json([
            'tenant' => $tenant,
            'features' => $features,
            'stats' => [
                'leads_count' => $tenant->leads_count,
                'contacts_count' => $tenant->contacts_count,
                'pipelines_count' => $tenant->pipelines_count,
                'users_count' => $tenant->users->count(),
            ],
        ]);
    }

    /**
     * Atualiza um tenant.
     */
    public function updateTenant(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => ['sometimes', 'string', 'max:100', Rule::unique('tenants', 'slug')->ignore($tenant->id)],
            'plan' => ['sometimes', Rule::enum(PlanEnum::class)],
            'whatsapp_number' => 'nullable|string',
            'ia_enabled' => 'boolean',
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
        ]);

        $oldPlan = $tenant->plan;
        $tenant->update($validated);

        // Log de mudança de plano
        if (isset($validated['plan']) && $oldPlan->value !== $validated['plan']) {
            SuperAdminLog::log('plan.change', $tenant->id, null, [
                'old_plan' => $oldPlan->value,
                'new_plan' => $validated['plan'],
            ]);
        }

        // Log de ativação/desativação
        if (isset($validated['is_active'])) {
            SuperAdminLog::log(
                $validated['is_active'] ? 'tenant.enable' : 'tenant.disable',
                $tenant->id
            );
        }

        return response()->json([
            'message' => 'Empresa atualizada com sucesso!',
            'tenant' => $tenant->fresh(),
        ]);
    }

    /**
     * Gerencia features e sub-funções de um tenant.
     *
     * Formato esperado:
     * {
     *   "features": [
     *     { "key": "ads_intelligence", "enabled": true, "all_functions": true },
     *     { "key": "sdr_ia", "enabled": true, "all_functions": false, "enabled_functions": ["sdr.agents", "sdr.documents"] },
     *     { "key": "landing_pages", "enabled": false }
     *   ]
     * }
     */
    public function updateTenantFeatures(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'features' => 'required|array',
            'features.*.key' => 'required|string',
            'features.*.enabled' => 'required|boolean',
            'features.*.all_functions' => 'nullable|boolean',
            'features.*.enabled_functions' => 'nullable|array',
            'features.*.enabled_functions.*' => 'string',
        ]);

        foreach ($validated['features'] as $feature) {
            if ($feature['enabled']) {
                $config = [];

                // Se especificou all_functions
                if (isset($feature['all_functions'])) {
                    $config['all_functions'] = $feature['all_functions'];
                }

                // Se especificou enabled_functions, definir all_functions como false
                if (isset($feature['enabled_functions']) && !empty($feature['enabled_functions'])) {
                    $config['enabled_functions'] = $feature['enabled_functions'];
                    $config['all_functions'] = false;
                }

                // Se não especificou nada, libera tudo (compatibilidade)
                if (empty($config)) {
                    $config['all_functions'] = true;
                }

                TenantFeature::enableForTenant($tenant->id, $feature['key'], $config);
                SuperAdminLog::log('feature.enable', $tenant->id, null, [
                    'feature' => $feature['key'],
                    'config' => $config,
                ]);
            } else {
                TenantFeature::disableForTenant($tenant->id, $feature['key']);
                SuperAdminLog::log('feature.disable', $tenant->id, null, ['feature' => $feature['key']]);
            }
        }

        return response()->json([
            'message' => 'Features atualizadas com sucesso!',
            'features' => TenantFeature::getTenantFeatures($tenant->id),
        ]);
    }

    /**
     * Lista todas as sub-funções disponíveis por módulo.
     */
    public function listModuleFunctions(): JsonResponse
    {
        return response()->json([
            'module_functions' => TenantFeature::getModuleFunctions(),
        ]);
    }

    // ==========================================
    // USUÁRIOS
    // ==========================================

    /**
     * Lista todos os usuários (de todos os tenants).
     */
    public function listUsers(Request $request): JsonResponse
    {
        $query = User::with('tenant:id,name')
            ->where('is_super_admin', false);

        // Filtros
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $users = $query->orderBy($request->get('sort_by', 'created_at'), $request->get('sort_dir', 'desc'))
            ->paginate($request->get('per_page', 20));

        return response()->json($users);
    }

    /**
     * Cria um novo usuário em um tenant.
     */
    public function createUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:admin,gestor,vendedor,marketing',
            'phone' => 'nullable|string',
        ]);

        $user = User::create([
            'tenant_id' => $validated['tenant_id'],
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'is_active' => true,
        ]);

        SuperAdminLog::log('user.create', $validated['tenant_id'], $user->id, [
            'email' => $user->email,
            'role' => $user->role->value,
        ]);

        return response()->json([
            'message' => 'Usuário criado com sucesso!',
            'user' => $user->load('tenant:id,name'),
        ], 201);
    }

    /**
     * Atualiza um usuário.
     */
    public function updateUser(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|string|in:admin,gestor,vendedor,marketing',
            'phone' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        SuperAdminLog::log('user.update', $user->tenant_id, $user->id, [
            'changes' => array_keys($validated),
        ]);

        return response()->json([
            'message' => 'Usuário atualizado com sucesso!',
            'user' => $user->fresh()->load('tenant:id,name'),
        ]);
    }

    /**
     * Exclui um usuário.
     */
    public function deleteUser(User $user): JsonResponse
    {
        if ($user->is_super_admin) {
            return response()->json(['error' => 'Não é possível excluir um super admin'], 403);
        }

        $tenantId = $user->tenant_id;
        $userId = $user->id;
        $email = $user->email;

        $user->delete();

        SuperAdminLog::log('user.delete', $tenantId, $userId, ['email' => $email]);

        return response()->json(['message' => 'Usuário excluído com sucesso!']);
    }

    // ==========================================
    // PERMISSÕES
    // ==========================================

    /**
     * Lista todas as permissões disponíveis.
     */
    public function listPermissions(): JsonResponse
    {
        return response()->json([
            'permissions' => Permission::getGroupedByModule(),
            'modules' => Permission::getModules(),
        ]);
    }

    /**
     * Lista features disponíveis.
     */
    public function listFeatures(): JsonResponse
    {
        return response()->json([
            'features' => TenantFeature::getAvailableFeatures(),
        ]);
    }

    /**
     * Lista planos disponíveis.
     */
    public function listPlans(): JsonResponse
    {
        $plans = [];
        foreach (PlanEnum::cases() as $plan) {
            $plans[] = [
                'value' => $plan->value,
                'label' => $plan->label(),
                'has_ia_sdr' => $plan->hasIaSdr(),
            ];
        }

        return response()->json(['plans' => $plans]);
    }

    // ==========================================
    // LOGS
    // ==========================================

    /**
     * Lista logs de ações do super admin.
     */
    public function listLogs(Request $request): JsonResponse
    {
        $query = SuperAdminLog::with(['user:id,name', 'targetTenant:id,name', 'targetUser:id,name,email']);

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        if ($request->has('tenant_id')) {
            $query->where('target_tenant_id', $request->tenant_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 50));

        return response()->json($logs);
    }

    // ==========================================
    // GRUPOS
    // ==========================================

    /**
     * Lista todos os grupos do sistema.
     */
    public function listGroups(Request $request): JsonResponse
    {
        $query = Group::with(['tenants:id,name,slug', 'users:id,name,email'])
            ->withCount(['tenants', 'users']);

        // Filtro por nome
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Filtro por status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $groups = $query->orderBy($request->get('sort_by', 'created_at'), $request->get('sort_dir', 'desc'))
            ->paginate($request->get('per_page', 20));

        return response()->json($groups);
    }

    /**
     * Cria um novo grupo (Super Admin).
     */
    public function createGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'tenant_ids' => 'nullable|array',
            'tenant_ids.*' => 'uuid|exists:tenants,id',
        ]);

        $group = Group::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']) . '-' . Str::random(6),
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        // Adiciona o super admin como owner do grupo
        $group->users()->attach($request->user()->id, ['role' => 'owner']);

        // Adiciona tenants ao grupo
        if (!empty($validated['tenant_ids'])) {
            $group->tenants()->sync($validated['tenant_ids']);
        }

        SuperAdminLog::log('group.create', null, null, [
            'group_id' => $group->id,
            'group_name' => $group->name,
            'tenants_count' => count($validated['tenant_ids'] ?? []),
        ]);

        return response()->json([
            'message' => 'Grupo criado com sucesso!',
            'group' => $group->load(['tenants', 'users']),
        ], 201);
    }

    /**
     * Exibe detalhes de um grupo (Super Admin).
     */
    public function showGroup(Group $group): JsonResponse
    {
        $group->load(['tenants', 'users']);
        $group->loadCount(['tenants', 'users']);

        return response()->json([
            'group' => $group,
        ]);
    }

    /**
     * Atualiza um grupo (Super Admin).
     */
    public function updateGroup(Request $request, Group $group): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $group->update($validated);

        SuperAdminLog::log('group.update', null, null, [
            'group_id' => $group->id,
            'changes' => array_keys($validated),
        ]);

        return response()->json([
            'message' => 'Grupo atualizado com sucesso!',
            'group' => $group->fresh()->load(['tenants', 'users']),
        ]);
    }

    /**
     * Exclui um grupo (Super Admin).
     */
    public function deleteGroup(Group $group): JsonResponse
    {
        $groupName = $group->name;
        $groupId = $group->id;

        $group->tenants()->detach();
        $group->users()->detach();
        $group->delete();

        SuperAdminLog::log('group.delete', null, null, [
            'group_id' => $groupId,
            'group_name' => $groupName,
        ]);

        return response()->json([
            'message' => 'Grupo excluído com sucesso!',
        ]);
    }

    /**
     * Adiciona tenant a um grupo (Super Admin).
     */
    public function addTenantToGroup(Request $request, Group $group): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
        ]);

        $group->tenants()->syncWithoutDetaching([$validated['tenant_id']]);

        SuperAdminLog::log('group.add_tenant', $validated['tenant_id'], null, [
            'group_id' => $group->id,
        ]);

        return response()->json([
            'message' => 'Empresa adicionada ao grupo.',
            'group' => $group->load('tenants'),
        ]);
    }

    /**
     * Remove tenant de um grupo (Super Admin).
     */
    public function removeTenantFromGroup(Group $group, Tenant $tenant): JsonResponse
    {
        $group->tenants()->detach($tenant->id);

        SuperAdminLog::log('group.remove_tenant', $tenant->id, null, [
            'group_id' => $group->id,
        ]);

        return response()->json([
            'message' => 'Empresa removida do grupo.',
        ]);
    }

    /**
     * Adiciona usuário a um grupo (Super Admin).
     */
    public function addUserToGroup(Request $request, Group $group): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'role' => 'required|in:owner,admin,viewer',
        ]);

        $group->users()->syncWithoutDetaching([
            $validated['user_id'] => ['role' => $validated['role']],
        ]);

        SuperAdminLog::log('group.add_user', null, $validated['user_id'], [
            'group_id' => $group->id,
            'role' => $validated['role'],
        ]);

        return response()->json([
            'message' => 'Usuário adicionado ao grupo.',
            'group' => $group->load('users'),
        ]);
    }

    /**
     * Remove usuário de um grupo (Super Admin).
     */
    public function removeUserFromGroup(Group $group, User $user): JsonResponse
    {
        $group->users()->detach($user->id);

        SuperAdminLog::log('group.remove_user', null, $user->id, [
            'group_id' => $group->id,
        ]);

        return response()->json([
            'message' => 'Usuário removido do grupo.',
        ]);
    }
}

