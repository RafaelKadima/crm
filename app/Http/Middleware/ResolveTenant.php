<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenant
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Verifica se o usuário está autenticado
        if (!auth()->check()) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        // Verifica se o usuário tem um tenant associado
        $user = auth()->user();
        
        if (!$user->tenant_id) {
            return response()->json([
                'message' => 'User does not belong to any tenant.'
            ], 403);
        }

        // Verifica se o tenant está ativo
        if ($user->tenant && !$user->tenant->is_active) {
            return response()->json([
                'message' => 'Tenant is inactive.'
            ], 403);
        }

        // Compartilha o tenant no request para fácil acesso
        $request->merge(['current_tenant' => $user->tenant]);

        return $next($request);
    }
}


