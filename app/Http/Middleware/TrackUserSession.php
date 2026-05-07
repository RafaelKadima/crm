<?php

namespace App\Http\Middleware;

use App\Models\UserSession;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tracking de sessão por user+token. Cria a row na primeira request
 * e atualiza last_activity_at em batches (cache 60s) pra não escrever
 * no DB em cada request.
 *
 * Se o token está marcado como revoked_at != null, retorna 401 (não
 * é só kill switch global — granular por device).
 */
class TrackUserSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $token = $user && method_exists($user, 'token') ? $user->token() : null;

        if (!$user || !$token) {
            return $next($request);
        }

        $tokenId = (string) $token->id;
        $cacheKey = "user_session:{$tokenId}";

        // Cria a sessão na primeira request com este token
        $session = Cache::remember($cacheKey, 300, function () use ($user, $tokenId, $request) {
            return UserSession::firstOrCreate(
                ['token_id' => $tokenId],
                [
                    'user_id' => $user->id,
                    'ip' => $request->ip(),
                    'user_agent' => substr((string) $request->userAgent(), 0, 500),
                    'device_name' => UserSession::parseDeviceName($request->userAgent()),
                    'last_activity_at' => now(),
                ]
            );
        });

        // Verifica se a sessão foi revogada por device (granular)
        if ($session->revoked_at) {
            Cache::forget($cacheKey);
            abort(401, 'Sessão revogada. Faça login novamente.');
        }

        // Atualiza last_activity em batch (1x por minuto por token)
        $touchKey = "user_session_touched:{$tokenId}";
        if (!Cache::has($touchKey)) {
            $session->update(['last_activity_at' => now()]);
            Cache::put($touchKey, 1, 60);
        }

        return $next($request);
    }
}
