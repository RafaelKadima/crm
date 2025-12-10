<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InternalApiMiddleware
{
    /**
     * Handle an incoming request.
     * 
     * Valida requisições internas usando uma API key secreta.
     * Usado para comunicação entre o Laravel e o microserviço Python.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $internalKey = config('services.internal.api_key');
        $providedKey = $request->header('X-Internal-Key');

        // Se não tiver chave configurada, bloqueia por segurança
        if (empty($internalKey)) {
            return response()->json([
                'error' => 'Internal API not configured',
                'message' => 'INTERNAL_API_KEY not set in environment',
            ], 500);
        }

        // Valida a chave
        if (empty($providedKey) || !hash_equals($internalKey, $providedKey)) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid or missing X-Internal-Key header',
            ], 401);
        }

        return $next($request);
    }
}

