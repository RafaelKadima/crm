<?php

use App\Http\Middleware\CheckFeature;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\EnsureTokenIsValid;
use App\Http\Middleware\InternalApiMiddleware;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SuperAdminMiddleware;
use App\Http\Middleware\VerifyMetaWebhookSignature;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            \App\Http\Middleware\TokenFromCookie::class,
            \Illuminate\Routing\Middleware\ThrottleRequests::class . ':api',
        ]);

        // Security headers em toda resposta (espelha config do nginx — defesa em profundidade)
        $middleware->append(SecurityHeaders::class);

        $middleware->alias([
            'tenant' => ResolveTenant::class,
            'super_admin' => SuperAdminMiddleware::class,
            'feature' => CheckFeature::class,
            'permission' => CheckPermission::class,
            'internal.api' => InternalApiMiddleware::class,
            'meta.signature' => VerifyMetaWebhookSignature::class,
            'token.valid' => EnsureTokenIsValid::class,
        ]);
        
        // Para APIs, retornar 401 JSON ao invés de redirecionar para login
        $middleware->redirectGuestsTo(function (Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return null; // Isso vai lançar AuthenticationException que será tratada abaixo
            }
            return '/login';
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Sentry integration (only if package is installed)
        if (class_exists(\Sentry\Laravel\Integration::class)) {
            \Sentry\Laravel\Integration::handles($exceptions);
        }
        
        // Retornar JSON 401 para requisições de API não autenticadas
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'error' => 'Token de autenticação inválido ou expirado.',
                ], 401);
            }
        });

        // Model not found → 404
        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => 'Recurso não encontrado.',
                ], 404);
            }
        });

        // Validation → 422 (Laravel já faz isso, mas garantimos o formato)
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => 'Dados inválidos.',
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        // Generic exceptions → 500 sem detalhes internos em produção
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                if ($e instanceof HttpException) {
                    return response()->json([
                        'error' => $e->getMessage() ?: 'Erro no servidor.',
                    ], $e->getStatusCode());
                }

                // Em produção, nunca vazar mensagem interna
                $message = app()->environment('production')
                    ? 'Erro interno do servidor.'
                    : $e->getMessage();

                return response()->json([
                    'error' => $message,
                ], 500);
            }
        });
    })->create();
