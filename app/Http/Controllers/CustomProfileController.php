<?php

namespace App\Http\Controllers;

use App\Models\CustomProfile;
use App\Support\CustomPermissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * CRUD de Custom Profiles dentro do tenant. Apenas admin/super_admin
 * pode gerenciar — endpoints exigem permission `users_manage` (que é
 * ADMIN_ONLY_ACTIONS — bloqueado pra não-admins).
 */
class CustomProfileController extends Controller
{
    /**
     * Catálogo das 35 permission keys + agrupamento + lista de
     * ADMIN_ONLY_ACTIONS. Útil pro frontend renderizar o form de edit.
     */
    public function catalog(Request $request): JsonResponse
    {
        $this->ensureCanManage($request);

        return response()->json([
            'permissions' => CustomPermissions::PERMISSIONS,
            'admin_only_actions' => CustomPermissions::ADMIN_ONLY_ACTIONS,
            'groups' => CustomPermissions::groups(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureCanManage($request);

        $profiles = CustomProfile::query()
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $profiles]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $this->ensureCanManage($request);

        $profile = CustomProfile::with('users:id,name,email,custom_profile_id')
            ->findOrFail($id);

        return response()->json([
            'data' => $profile,
            'resolved_permissions' => $profile->resolvedPermissions(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureCanManage($request);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'custom_permissions' => 'sometimes|array',
            'menu_permissions' => 'sometimes|array',
            'is_default' => 'sometimes|boolean',
        ]);

        $profile = DB::transaction(function () use ($request, $validated) {
            $profile = CustomProfile::create([
                'tenant_id' => $request->user()->tenant_id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'custom_permissions' => CustomPermissions::sanitize($validated['custom_permissions'] ?? []),
                'menu_permissions' => $validated['menu_permissions'] ?? null,
                'is_default' => $validated['is_default'] ?? false,
            ]);

            // Apenas um default por tenant
            if ($profile->is_default) {
                CustomProfile::where('tenant_id', $profile->tenant_id)
                    ->where('id', '!=', $profile->id)
                    ->update(['is_default' => false]);
            }

            return $profile;
        });

        return response()->json(['data' => $profile], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureCanManage($request);

        $profile = CustomProfile::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'description' => 'nullable|string|max:500',
            'custom_permissions' => 'sometimes|array',
            'menu_permissions' => 'sometimes|array',
            'is_default' => 'sometimes|boolean',
        ]);

        DB::transaction(function () use ($profile, $validated) {
            if (array_key_exists('custom_permissions', $validated)) {
                $validated['custom_permissions'] = CustomPermissions::sanitize($validated['custom_permissions']);
            }

            $profile->update($validated);

            if (!empty($validated['is_default'])) {
                CustomProfile::where('tenant_id', $profile->tenant_id)
                    ->where('id', '!=', $profile->id)
                    ->update(['is_default' => false]);
            }
        });

        return response()->json(['data' => $profile->fresh()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->ensureCanManage($request);

        $profile = CustomProfile::findOrFail($id);

        // Não deletar se ainda há users vinculados — preserva integridade
        if ($profile->users()->exists()) {
            return response()->json([
                'message' => 'Não é possível excluir profile com usuários vinculados. Migre os usuários primeiro.',
            ], 409);
        }

        $profile->delete();

        return response()->json(['message' => 'Profile excluído.']);
    }

    /**
     * Atribui um profile a um user e (opcionalmente) habilita o RBAC
     * v2 pra esse user. POST /api/custom-profiles/{id}/assign
     */
    public function assignToUser(Request $request, string $id): JsonResponse
    {
        $this->ensureCanManage($request);

        $validated = $request->validate([
            'user_id' => 'required|uuid|exists:users,id',
            'enabled' => 'sometimes|boolean',
        ]);

        $profile = CustomProfile::findOrFail($id);
        $user = \App\Models\User::findOrFail($validated['user_id']);

        if ($user->tenant_id !== $profile->tenant_id) {
            return response()->json(['message' => 'User e profile pertencem a tenants diferentes.'], 422);
        }

        $user->forceFill([
            'custom_profile_id' => $profile->id,
            'custom_profile_enabled' => $validated['enabled'] ?? true,
        ])->save();

        return response()->json([
            'message' => 'Profile atribuído.',
            'user_id' => $user->id,
            'profile_id' => $profile->id,
            'enabled' => $user->custom_profile_enabled,
        ]);
    }

    protected function ensureCanManage(Request $request): void
    {
        $user = $request->user();
        if (!$user || !$user->hasPermission('users_manage')) {
            abort(403, 'Apenas administradores podem gerenciar custom profiles.');
        }
    }
}
