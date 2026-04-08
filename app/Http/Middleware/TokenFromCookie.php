<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TokenFromCookie
{
    /**
     * Se o header Authorization não estiver presente mas o cookie crm_token existir,
     * injeta o token no header para que o Passport possa autenticar normalmente.
     *
     * Isso permite que o frontend use httpOnly cookies em vez de localStorage,
     * enquanto mantém compatibilidade com clientes que enviam Bearer token no header
     * (ex: Python worker, mobile apps).
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->bearerToken() && $request->cookie('crm_token')) {
            $request->headers->set('Authorization', 'Bearer ' . $request->cookie('crm_token'));
        }

        return $next($request);
    }
}
