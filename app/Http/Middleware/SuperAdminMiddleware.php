<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return response()->json(['error' => 'Não autenticado'], 401);
        }

        if (!auth()->user()->isSuperAdmin()) {
            return response()->json(['error' => 'Acesso negado. Apenas super administradores podem acessar esta área.'], 403);
        }

        return $next($request);
    }
}
