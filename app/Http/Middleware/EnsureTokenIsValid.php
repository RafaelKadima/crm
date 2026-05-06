<?php

namespace App\Http\Middleware;

use App\Enums\SecurityIncidentTypeEnum;
use App\Services\SecurityIncidentService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Valida que o token Passport atual foi emitido APÓS a última invalidação
 * em massa do usuário (User::tokens_invalidated_at).
 *
 * Combinado com User::invalidateAllTokens(), permite kill switch de tokens
 * sem deletar registros do oauth_access_tokens — útil pra:
 *   - Trocar de senha → invalida tokens antigos automaticamente (Observer)
 *   - "Sair de todos os dispositivos" pelo painel
 *   - Resposta a incidente de segurança
 *
 * Aplicar APÓS auth:api no stack — depende de auth()->user() resolvido.
 */
class EnsureTokenIsValid
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        $invalidatedAt = $user->tokens_invalidated_at;
        if (!$invalidatedAt) {
            return $next($request);
        }

        // Passport coloca o token model no $request->user()->token() quando
        // o guard 'api' resolve via Bearer. Se não tiver token (ex: session
        // auth), nada pra checar.
        $token = method_exists($user, 'token') ? $user->token() : null;
        if (!$token || empty($token->created_at)) {
            return $next($request);
        }

        if ($token->created_at->lt($invalidatedAt)) {
            app(SecurityIncidentService::class)->record(
                type: SecurityIncidentTypeEnum::TOKEN_REVOKED_USED,
                metadata: [
                    'token_created_at' => $token->created_at->toIso8601String(),
                    'invalidated_at' => $invalidatedAt->toIso8601String(),
                ],
                tenantId: $user->tenant_id,
                actorId: $user->id,
                actorEmail: $user->email,
            );
            abort(401, 'Token revoked. Please log in again.');
        }

        return $next($request);
    }
}
