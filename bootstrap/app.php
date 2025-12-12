<?php

use App\Http\Middleware\CheckFeature;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\InternalApiMiddleware;
use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\SuperAdminMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'tenant' => ResolveTenant::class,
            'super_admin' => SuperAdminMiddleware::class,
            'feature' => CheckFeature::class,
            'permission' => CheckPermission::class,
            'internal.api' => InternalApiMiddleware::class,
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
    })->create();
