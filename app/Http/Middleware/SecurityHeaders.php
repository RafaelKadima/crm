<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Aplica security headers em toda response do Laravel.
 *
 * Defesa em profundidade: o nginx já seta os mesmos headers em produção
 * (docker/nginx/sites/default.conf), mas se a config for sobrescrita,
 * trocada, ou se o request bypassar o nginx por qualquer razão (ex.: dev
 * local sem nginx, php artisan serve), os headers continuam aplicados.
 *
 * Os valores aqui DEVEM espelhar os do nginx — qualquer mudança em um
 * deve ser refletida no outro. Quando os dois aplicam, o nginx ganha
 * (último a setar).
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Não aplica em respostas que já têm headers de download/streaming —
        // CSP/HSTS atrapalham PDFs, vídeos, etc. servidos via X-Sendfile.
        if ($response->headers->has('Content-Disposition')) {
            return $response;
        }

        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload', false);
        $response->headers->set('X-Content-Type-Options', 'nosniff', false);
        $response->headers->set('X-Frame-Options', 'DENY', false);
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin', false);
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()', false);

        return $response;
    }
}
