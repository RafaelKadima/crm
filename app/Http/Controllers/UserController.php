<?php

namespace App\Http\Controllers;

use App\Enums\RoleEnum;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Lista usuários do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        // Filtros
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->get();

        return response()->json([
            'data' => $users,
        ]);
    }

    /**
     * Cria um novo usuário.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::defaults()],
            'role' => 'required|string|in:admin,gestor,vendedor,marketing',
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|url',
            'is_active' => 'boolean',
        ]);

        // Apenas admin pode criar outros admins
        $currentUser = auth()->user();
        if ($validated['role'] === 'admin' && $currentUser->role !== RoleEnum::ADMIN) {
            return response()->json([
                'message' => 'Apenas administradores podem criar outros administradores.',
            ], 403);
        }

        $user = User::create([
            'tenant_id' => $currentUser->tenant_id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => RoleEnum::from($validated['role']),
            'phone' => $validated['phone'] ?? null,
            'avatar' => $validated['avatar'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Usuário criado com sucesso.',
            'user' => $user,
        ], 201);
    }

    /**
     * Exibe um usuário.
     */
    public function show(User $user): JsonResponse
    {
        return response()->json($user);
    }

    /**
     * Atualiza um usuário.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => ['sometimes', Password::defaults()],
            'role' => 'sometimes|string|in:admin,gestor,vendedor,marketing',
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|url',
            'is_active' => 'sometimes|boolean',
        ]);

        // Apenas admin pode alterar para admin
        $currentUser = auth()->user();
        if (isset($validated['role']) && $validated['role'] === 'admin' && $currentUser->role !== RoleEnum::ADMIN) {
            return response()->json([
                'message' => 'Apenas administradores podem alterar para o cargo de administrador.',
            ], 403);
        }

        // Não pode desativar a si mesmo
        if (isset($validated['is_active']) && !$validated['is_active'] && $user->id === $currentUser->id) {
            return response()->json([
                'message' => 'Você não pode desativar sua própria conta.',
            ], 403);
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        if (isset($validated['role'])) {
            $validated['role'] = RoleEnum::from($validated['role']);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Usuário atualizado com sucesso.',
            'user' => $user,
        ]);
    }

    /**
     * Remove um usuário.
     */
    public function destroy(User $user): JsonResponse
    {
        $currentUser = auth()->user();

        // Não pode deletar a si mesmo
        if ($user->id === $currentUser->id) {
            return response()->json([
                'message' => 'Você não pode excluir sua própria conta.',
            ], 403);
        }

        // Verifica se tem leads atribuídos
        if ($user->leads()->exists()) {
            return response()->json([
                'message' => 'Este usuário possui leads atribuídos. Reatribua os leads antes de excluir.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'Usuário excluído com sucesso.',
        ]);
    }

    /**
     * Ativa/desativa um usuário.
     */
    public function toggleActive(User $user): JsonResponse
    {
        $currentUser = auth()->user();

        if ($user->id === $currentUser->id) {
            return response()->json([
                'message' => 'Você não pode alterar o status da sua própria conta.',
            ], 403);
        }

        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'message' => $user->is_active ? 'Usuário ativado.' : 'Usuário desativado.',
            'user' => $user,
        ]);
    }

    /**
     * Retorna o perfil do usuário logado.
     */
    public function profile(): JsonResponse
    {
        $user = auth()->user();

        return response()->json([
            'user' => $user,
        ]);
    }

    /**
     * Atualiza o perfil do usuário logado.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|url',
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Perfil atualizado com sucesso.',
            'user' => $user->fresh(),
        ]);
    }

    /**
     * Altera a senha do usuário logado.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => ['required', 'confirmed', Password::defaults()],
        ]);

        // Verifica senha atual
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Senha atual incorreta.',
                'errors' => ['current_password' => ['Senha atual incorreta.']],
            ], 422);
        }

        // Atualiza senha
        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        return response()->json([
            'message' => 'Senha alterada com sucesso.',
        ]);
    }
}

