<?php

namespace App\Http\Controllers;

use App\Enums\RoleEnum;
use App\Models\Group;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class TenantController extends Controller
{
    /**
     * Lista todos os tenants (super admin).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::withCount('users', 'leads');

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

        $tenants = $query->orderBy('name')->get();

        return response()->json([
            'data' => $tenants,
        ]);
    }

    /**
     * Cria um novo tenant com usuário admin.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:100|unique:tenants,slug',
            'plan' => 'required|string|in:starter,professional,enterprise',
            'settings' => 'nullable|array',
            // Dados do usuário admin
            'admin_name' => 'required|string|max:255',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => ['required', Password::defaults()],
            'admin_phone' => 'nullable|string|max:20',
        ]);

        try {
            DB::beginTransaction();

            // Cria o tenant
            $tenant = Tenant::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'] ?? Str::slug($validated['name']),
                'plan' => $validated['plan'],
                'settings' => $validated['settings'] ?? [],
                'is_active' => true,
            ]);

            // Cria o usuário admin do tenant
            $admin = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => Hash::make($validated['admin_password']),
                'role' => RoleEnum::ADMIN,
                'phone' => $validated['admin_phone'] ?? null,
                'is_active' => true,
            ]);

            // Cria pipeline padrão para o tenant
            $this->createDefaultPipeline($tenant);

            DB::commit();

            $tenant->load('users');

            return response()->json([
                'message' => 'Empresa criada com sucesso.',
                'tenant' => $tenant,
                'admin' => $admin,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Erro ao criar empresa: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exibe um tenant.
     */
    public function show(Tenant $tenant): JsonResponse
    {
        $tenant->load(['users', 'pipelines', 'channels']);
        $tenant->loadCount(['leads', 'contacts', 'tickets']);

        return response()->json($tenant);
    }

    /**
     * Atualiza um tenant.
     */
    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100|unique:tenants,slug,' . $tenant->id,
            'plan' => 'sometimes|string|in:starter,professional,enterprise',
            'settings' => 'sometimes|array',
            'is_active' => 'sometimes|boolean',
        ]);

        $tenant->update($validated);

        return response()->json([
            'message' => 'Empresa atualizada com sucesso.',
            'tenant' => $tenant,
        ]);
    }

    /**
     * Desativa/ativa um tenant.
     */
    public function toggleActive(Tenant $tenant): JsonResponse
    {
        $tenant->update(['is_active' => !$tenant->is_active]);

        // Desativa todos os usuários se o tenant foi desativado
        if (!$tenant->is_active) {
            $tenant->users()->update(['is_active' => false]);
        }

        return response()->json([
            'message' => $tenant->is_active ? 'Empresa ativada.' : 'Empresa desativada.',
            'tenant' => $tenant,
        ]);
    }

    /**
     * Adiciona tenant a um grupo.
     */
    public function addToGroup(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'group_id' => 'required|uuid|exists:groups,id',
        ]);

        $group = Group::find($validated['group_id']);

        // Verifica se já está no grupo
        if ($group->tenants()->where('tenant_id', $tenant->id)->exists()) {
            return response()->json([
                'message' => 'Esta empresa já está neste grupo.',
            ], 422);
        }

        $group->tenants()->attach($tenant->id);

        return response()->json([
            'message' => 'Empresa adicionada ao grupo com sucesso.',
            'tenant' => $tenant,
            'group' => $group,
        ]);
    }

    /**
     * Remove tenant de um grupo.
     */
    public function removeFromGroup(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'group_id' => 'required|uuid|exists:groups,id',
        ]);

        $group = Group::find($validated['group_id']);
        $group->tenants()->detach($tenant->id);

        return response()->json([
            'message' => 'Empresa removida do grupo com sucesso.',
        ]);
    }

    /**
     * Lista grupos do tenant.
     */
    public function groups(Tenant $tenant): JsonResponse
    {
        $groups = $tenant->groups()->get();

        return response()->json([
            'data' => $groups,
        ]);
    }

    /**
     * Cria usuário para o tenant (super admin).
     */
    public function createUser(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::defaults()],
            'role' => 'required|string|in:admin,gestor,vendedor',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => RoleEnum::from($validated['role']),
            'phone' => $validated['phone'] ?? null,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'Usuário criado com sucesso.',
            'user' => $user,
        ], 201);
    }

    /**
     * Cria pipeline padrão para o tenant.
     */
    protected function createDefaultPipeline(Tenant $tenant): void
    {
        $pipeline = \App\Models\Pipeline::create([
            'tenant_id' => $tenant->id,
            'name' => 'Funil de Vendas',
            'is_default' => true,
        ]);

        $stages = [
            ['name' => 'Novo Lead', 'color' => '#3B82F6', 'order' => 1],
            ['name' => 'Qualificação', 'color' => '#F59E0B', 'order' => 2],
            ['name' => 'Apresentação', 'color' => '#8B5CF6', 'order' => 3],
            ['name' => 'Proposta', 'color' => '#EC4899', 'order' => 4],
            ['name' => 'Negociação', 'color' => '#14B8A6', 'order' => 5],
            ['name' => 'Fechamento', 'color' => '#22C55E', 'order' => 6],
        ];

        foreach ($stages as $stage) {
            \App\Models\PipelineStage::create([
                'pipeline_id' => $pipeline->id,
                'name' => $stage['name'],
                'color' => $stage['color'],
                'order' => $stage['order'],
            ]);
        }
    }
}

