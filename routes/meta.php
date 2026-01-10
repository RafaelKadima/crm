<?php

use App\Modules\Meta\Controllers\MetaAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Meta Integration Routes
|--------------------------------------------------------------------------
|
| Rotas para integração com a Meta WhatsApp Cloud API.
| Inclui OAuth, gerenciamento de integrações e templates.
|
*/

Route::prefix('api/meta')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Public Routes (OAuth Callback)
    |--------------------------------------------------------------------------
    | O callback do OAuth precisa ser público pois a Meta redireciona
    | o usuário diretamente para esta URL após autorização.
    */
    Route::get('callback', [MetaAuthController::class, 'callback'])
        ->name('meta.callback');

    /*
    |--------------------------------------------------------------------------
    | Authenticated Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware(['auth:api'])->group(function () {

        // Status da configuração (não precisa de tenant)
        Route::get('status', [MetaAuthController::class, 'status'])
            ->name('meta.status');

        // Rotas que precisam de tenant
        Route::middleware(['tenant'])->group(function () {

            // OAuth Connect (inicia o fluxo)
            Route::get('connect', [MetaAuthController::class, 'connect'])
                ->name('meta.connect');

            // Embedded Signup Callback (recebe dados do popup)
            Route::post('embedded-signup', [MetaAuthController::class, 'embeddedSignupCallback'])
                ->name('meta.embedded-signup');

            // Integrations CRUD
            Route::prefix('integrations')->name('meta.integrations.')->group(function () {

                Route::get('/', [MetaAuthController::class, 'index'])
                    ->name('index');

                Route::get('{id}', [MetaAuthController::class, 'show'])
                    ->name('show');

                Route::delete('{id}', [MetaAuthController::class, 'destroy'])
                    ->name('destroy');

                // Token Management
                Route::post('{id}/refresh-token', [MetaAuthController::class, 'refreshToken'])
                    ->name('refresh-token');

                // Templates
                Route::get('{id}/templates', [MetaAuthController::class, 'templates'])
                    ->name('templates');

                Route::post('{id}/templates/sync', [MetaAuthController::class, 'syncTemplates'])
                    ->name('templates.sync');

                // Profile
                Route::get('{id}/profile', [MetaAuthController::class, 'getProfile'])
                    ->name('profile');

                Route::put('{id}/profile', [MetaAuthController::class, 'updateProfile'])
                    ->name('profile.update');

                Route::post('{id}/profile/photo', [MetaAuthController::class, 'uploadProfilePhoto'])
                    ->name('profile.photo');
            });

            // Profile categories (não precisa de ID)
            Route::get('profile/categories', [MetaAuthController::class, 'getProfileCategories'])
                ->name('meta.profile.categories');
        });
    });
});
