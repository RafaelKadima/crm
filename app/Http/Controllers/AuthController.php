<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login do usuário e geração de token.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['As credenciais informadas estão incorretas.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Esta conta está desativada.'],
            ]);
        }

        if ($user->tenant && !$user->tenant->is_active) {
            throw ValidationException::withMessages([
                'email' => ['O tenant desta conta está inativo.'],
            ]);
        }

        // Revoga tokens anteriores
        $user->tokens()->delete();

        // Cria novo token
        $token = $user->createToken('CRM Access Token')->accessToken;

        return response()->json([
            'message' => 'Login realizado com sucesso.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'is_active' => $user->is_active,
                'tenant_id' => $user->tenant_id,
            ],
            'tenant' => $user->tenant ? [
                'id' => $user->tenant->id,
                'name' => $user->tenant->name,
                'slug' => $user->tenant->slug,
                'plan' => $user->tenant->plan,
            ] : null,
        ]);
    }

    /**
     * Logout do usuário.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->token()->revoke();

        return response()->json([
            'message' => 'Logout realizado com sucesso.',
        ]);
    }

    /**
     * Retorna os dados do usuário autenticado.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->load('tenant', 'teams');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'phone' => $user->phone,
                'avatar' => $user->avatar,
                'is_active' => $user->is_active,
                'tenant_id' => $user->tenant_id,
                'tenant' => $user->tenant ? [
                    'id' => $user->tenant->id,
                    'name' => $user->tenant->name,
                    'slug' => $user->tenant->slug,
                    'plan' => $user->tenant->plan,
                    'ia_enabled' => $user->tenant->ia_enabled,
                ] : null,
                'teams' => $user->teams->map(fn($team) => [
                    'id' => $team->id,
                    'name' => $team->name,
                ]),
            ],
        ]);
    }

    /**
     * Atualiza o token de acesso.
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoga token atual
        $user->token()->revoke();

        // Cria novo token
        $token = $user->createToken('CRM Access Token')->accessToken;

        return response()->json([
            'message' => 'Token atualizado com sucesso.',
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }
}


