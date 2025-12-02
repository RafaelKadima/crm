<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\IaWebhookController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\PipelineController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TicketController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rotas públicas de autenticação
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

// Rotas protegidas por autenticação
Route::middleware('auth:api')->group(function () {

    // Autenticação
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });

    // Rotas que requerem tenant
    Route::middleware('tenant')->group(function () {

        // Leads
        Route::prefix('leads')->group(function () {
            Route::get('/', [LeadController::class, 'index']);
            Route::post('/', [LeadController::class, 'store']);
            Route::get('{lead}', [LeadController::class, 'show']);
            Route::put('{lead}', [LeadController::class, 'update']);
            Route::delete('{lead}', [LeadController::class, 'destroy']);
            Route::put('{lead}/stage', [LeadController::class, 'updateStage']);
            Route::put('{lead}/assign', [LeadController::class, 'assign']);
        });

        // Contatos
        Route::prefix('contacts')->group(function () {
            Route::get('/', [ContactController::class, 'index']);
            Route::post('/', [ContactController::class, 'store']);
            Route::get('{contact}', [ContactController::class, 'show']);
            Route::put('{contact}', [ContactController::class, 'update']);
            Route::delete('{contact}', [ContactController::class, 'destroy']);
        });

        // Tickets
        Route::prefix('tickets')->group(function () {
            Route::get('/', [TicketController::class, 'index']);
            Route::post('/', [TicketController::class, 'store']);
            Route::get('{ticket}', [TicketController::class, 'show']);
            Route::put('{ticket}', [TicketController::class, 'update']);
            Route::delete('{ticket}', [TicketController::class, 'destroy']);
            Route::post('{ticket}/messages', [TicketController::class, 'sendMessage']);
            Route::put('{ticket}/transfer', [TicketController::class, 'transfer']);
            Route::put('{ticket}/close', [TicketController::class, 'close']);
        });

        // Pipelines
        Route::prefix('pipelines')->group(function () {
            Route::get('/', [PipelineController::class, 'index']);
            Route::post('/', [PipelineController::class, 'store']);
            Route::get('{pipeline}', [PipelineController::class, 'show']);
            Route::put('{pipeline}', [PipelineController::class, 'update']);
            Route::delete('{pipeline}', [PipelineController::class, 'destroy']);
            Route::get('{pipeline}/stages', [PipelineController::class, 'stages']);
            Route::post('{pipeline}/stages', [PipelineController::class, 'storeStage']);
            Route::put('{pipeline}/stages/{stage}', [PipelineController::class, 'updateStage']);
            Route::delete('{pipeline}/stages/{stage}', [PipelineController::class, 'destroyStage']);
        });

        // Canais
        Route::prefix('channels')->group(function () {
            Route::get('/', [ChannelController::class, 'index']);
            Route::post('/', [ChannelController::class, 'store']);
            Route::get('{channel}', [ChannelController::class, 'show']);
            Route::put('{channel}', [ChannelController::class, 'update']);
            Route::delete('{channel}', [ChannelController::class, 'destroy']);
        });

        // Tarefas
        Route::prefix('tasks')->group(function () {
            Route::get('/', [TaskController::class, 'index']);
            Route::post('/', [TaskController::class, 'store']);
            Route::get('{task}', [TaskController::class, 'show']);
            Route::put('{task}', [TaskController::class, 'update']);
            Route::delete('{task}', [TaskController::class, 'destroy']);
            Route::put('{task}/complete', [TaskController::class, 'complete']);
        });

        // Relatórios
        Route::prefix('reports')->group(function () {
            Route::get('funnel', [ReportController::class, 'funnel']);
            Route::get('productivity', [ReportController::class, 'productivity']);
            Route::get('ia', [ReportController::class, 'ia']);
            Route::get('distribution', [ReportController::class, 'distribution']);
        });
    });

    // Endpoints da IA (n8n -> CRM)
    Route::prefix('ia')->group(function () {
        Route::post('leads/{lead}/update-stage', [IaWebhookController::class, 'updateStage']);
        Route::post('leads/{lead}/update-data', [IaWebhookController::class, 'updateData']);
        Route::post('leads/{lead}/assign-owner', [IaWebhookController::class, 'assignOwner']);
        Route::post('tickets/{ticket}/messages', [IaWebhookController::class, 'sendMessage']);
    });

    // Webhook externo (ERP -> CRM)
    Route::post('external/webhook', [IaWebhookController::class, 'externalWebhook']);

    // Grupos (Visão Multi-Loja)
    Route::prefix('groups')->group(function () {
        Route::get('/', [GroupController::class, 'index']);
        Route::post('/', [GroupController::class, 'store']);
        Route::get('{group}', [GroupController::class, 'show']);
        Route::put('{group}', [GroupController::class, 'update']);
        Route::delete('{group}', [GroupController::class, 'destroy']);

        // Gerenciamento de tenants do grupo
        Route::post('{group}/tenants', [GroupController::class, 'addTenant']);
        Route::delete('{group}/tenants/{tenant}', [GroupController::class, 'removeTenant']);

        // Gerenciamento de usuários do grupo
        Route::post('{group}/users', [GroupController::class, 'addUser']);
        Route::delete('{group}/users/{user}', [GroupController::class, 'removeUser']);

        // Relatórios e métricas do grupo
        Route::get('{group}/dashboard', [GroupController::class, 'dashboard']);
        Route::get('{group}/metrics-per-tenant', [GroupController::class, 'metricsPerTenant']);
        Route::get('{group}/funnel', [GroupController::class, 'funnelReport']);
        Route::get('{group}/ranking', [GroupController::class, 'salesRanking']);
    });
});


