<?php

namespace App\Http\Controllers;

use App\Enums\RoleEnum;
use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermissionController extends Controller
{
    /**
     * Lista todas as permissões disponíveis agrupadas por módulo.
     */
    public function index(): JsonResponse
    {
        $permissions = Permission::all()->groupBy('module');
        $modules = Permission::getModules();

        $result = [];
        foreach ($modules as $key => $name) {
            $result[] = [
                'key' => $key,
                'name' => $name,
                'permissions' => $permissions->get($key, collect())->map(fn($p) => [
                    'id' => $p->id,
                    'key' => $p->key,
                    'name' => $p->name,
                    'description' => $p->description,
                ])->values(),
            ];
        }

        return response()->json($result);
    }

    /**
     * Lista permissões padrão de cada role.
     */
    public function rolePermissions(): JsonResponse
    {
        $roles = [];
        foreach (RoleEnum::cases() as $role) {
            $permissions = RolePermission::getPermissionsForRole($role->value);
            $roles[] = [
                'role' => $role->value,
                'label' => $role->label(),
                'permissions' => $permissions,
            ];
        }

        return response()->json($roles);
    }

    /**
     * Retorna as permissões de um usuário específico.
     */
    public function userPermissions(User $user): JsonResponse
    {
        // Permissões do role
        $rolePermissions = RolePermission::getPermissionsForRole($user->role->value);

        // Permissões customizadas
        $customPermissions = $user->customPermissions()
            ->get()
            ->mapWithKeys(fn($p) => [$p->key => $p->pivot->granted])
            ->toArray();

        // Permissões efetivas
        $effectivePermissions = $user->getEffectivePermissions();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'role' => $user->role->value,
                'role_label' => $user->role->label(),
            ],
            'role_permissions' => $rolePermissions,
            'custom_permissions' => $customPermissions,
            'effective_permissions' => $effectivePermissions,
        ]);
    }

    /**
     * Atualiza as permissões customizadas de um usuário.
     * 
     * O Admin pode:
     * - Conceder permissões extras (além do role)
     * - Revogar permissões do role
     */
    public function updateUserPermissions(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*.key' => 'required|string|exists:permissions,key',
            'permissions.*.granted' => 'required|boolean',
        ]);

        // Apenas Admin pode alterar permissões
        if (!auth()->user()->isAdmin() && !auth()->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Apenas administradores podem alterar permissões.'], 403);
        }

        // Não pode alterar permissões de outro admin
        if ($user->isAdmin() && $user->id !== auth()->id()) {
            return response()->json(['message' => 'Não é possível alterar permissões de outro administrador.'], 403);
        }

        DB::transaction(function () use ($user, $validated) {
            foreach ($validated['permissions'] as $perm) {
                $permission = Permission::where('key', $perm['key'])->first();
                
                if (!$permission) continue;

                // Verifica se é permissão padrão do role
                $isRoleDefault = RolePermission::where('role', $user->role->value)
                    ->where('permission_id', $permission->id)
                    ->exists();

                if ($perm['granted'] && $isRoleDefault) {
                    // Se está concedendo e já é padrão do role, remove customização
                    $user->customPermissions()->detach($permission->id);
                } elseif (!$perm['granted'] && !$isRoleDefault) {
                    // Se está revogando e não é padrão do role, remove customização
                    $user->customPermissions()->detach($permission->id);
                } else {
                    // Caso contrário, salva customização
                    $user->customPermissions()->syncWithoutDetaching([
                        $permission->id => ['granted' => $perm['granted']],
                    ]);
                }
            }
        });

        return response()->json([
            'message' => 'Permissões atualizadas com sucesso.',
            'effective_permissions' => $user->fresh()->getEffectivePermissions(),
        ]);
    }

    /**
     * Reseta as permissões de um usuário para o padrão do role.
     */
    public function resetUserPermissions(User $user): JsonResponse
    {
        // Apenas Admin pode alterar permissões
        if (!auth()->user()->isAdmin() && !auth()->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Apenas administradores podem alterar permissões.'], 403);
        }

        // Remove todas as permissões customizadas
        $user->customPermissions()->detach();

        return response()->json([
            'message' => 'Permissões resetadas para o padrão do role.',
            'effective_permissions' => $user->fresh()->getEffectivePermissions(),
        ]);
    }

    /**
     * Retorna as permissões do usuário logado.
     */
    public function myPermissions(): JsonResponse
    {
        $user = auth()->user();

        return response()->json([
            'role' => $user->role->value,
            'role_label' => $user->role->label(),
            'is_admin' => $user->isAdmin(),
            'is_super_admin' => $user->isSuperAdmin(),
            'permissions' => $user->getEffectivePermissions(),
        ]);
    }
}
