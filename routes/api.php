<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\IaWebhookController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\LeadImportController;
use App\Http\Controllers\PipelineController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TenantController;
use App\Http\Controllers\SdrAgentController;
use App\Http\Controllers\WhatsAppController;
use App\Http\Controllers\InstagramController;
use App\Http\Controllers\MetaWebhookController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\LandingPageController;
use App\Http\Controllers\CustomerDataController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AgentTemplateController;
use App\Http\Controllers\AgentRulesController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\PermissionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rotas públicas de autenticação
Route::post('login', [AuthController::class, 'login']);
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

// Download de arquivos (assinado)
Route::get('files/{attachment}/download', [\App\Http\Controllers\FileUploadController::class, 'download'])
    ->name('files.download')
    ->middleware('auth:api');

// Rotas protegidas por autenticação
Route::middleware('auth:api')->group(function () {

    // Broadcasting auth para WebSockets
    Route::post('broadcasting/auth', function (\Illuminate\Http\Request $request) {
        return \Illuminate\Support\Facades\Broadcast::auth($request);
    });

    // Autenticação (atalhos para frontend)
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    // Autenticação (prefixo auth)
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
    });

    // Features do tenant (para o frontend saber o que mostrar)
    Route::get('my-features', [\App\Http\Controllers\TenantFeaturesController::class, 'myFeatures']);
    Route::get('check-feature/{feature}', [\App\Http\Controllers\TenantFeaturesController::class, 'checkFeature']);

    // Configurações do tenant
    Route::get('tenant/settings', [\App\Http\Controllers\TenantSettingsController::class, 'show']);
    Route::put('tenant/settings', [\App\Http\Controllers\TenantSettingsController::class, 'update']);

    // Branding do tenant
    Route::prefix('branding')->group(function () {
        Route::get('/', [\App\Http\Controllers\BrandingController::class, 'show']);
        Route::put('/', [\App\Http\Controllers\BrandingController::class, 'update']);
        Route::post('logo', [\App\Http\Controllers\BrandingController::class, 'uploadLogo']);
        Route::delete('logo', [\App\Http\Controllers\BrandingController::class, 'removeLogo']);
        Route::post('reset', [\App\Http\Controllers\BrandingController::class, 'reset']);
    });

    // Branding do tenant (identidade visual)
    Route::get('tenant/branding', [\App\Http\Controllers\BrandingController::class, 'show']);
    Route::put('tenant/branding', [\App\Http\Controllers\BrandingController::class, 'update']);
    Route::post('tenant/branding/upload', [\App\Http\Controllers\BrandingController::class, 'upload']);
    Route::delete('tenant/branding/image', [\App\Http\Controllers\BrandingController::class, 'deleteImage']);

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
            
            // Dados do cliente (fechamento)
            Route::get('{lead}/customer-data', [CustomerDataController::class, 'show']);
            Route::post('{lead}/customer-data', [CustomerDataController::class, 'store']);

            // Importação de Leads
            Route::prefix('imports')->group(function () {
                Route::get('/', [LeadImportController::class, 'index']);
                Route::post('/', [LeadImportController::class, 'store']);
                Route::get('template', [LeadImportController::class, 'template']);
                Route::get('{import}', [LeadImportController::class, 'show']);
            });
        });

        // Perfil do usuário logado
        Route::prefix('profile')->group(function () {
            Route::get('/', [UserController::class, 'profile']);
            Route::put('/', [UserController::class, 'updateProfile']);
            Route::post('change-password', [UserController::class, 'changePassword']);
        });

        // Usuários do tenant
        Route::prefix('users')->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::post('/', [UserController::class, 'store']);
            Route::get('{user}', [UserController::class, 'show']);
            Route::put('{user}', [UserController::class, 'update']);
            Route::delete('{user}', [UserController::class, 'destroy']);
            Route::post('{user}/toggle-active', [UserController::class, 'toggleActive']);
            
            // Permissões do usuário (apenas Admin)
            Route::get('{user}/permissions', [PermissionController::class, 'userPermissions']);
            Route::put('{user}/permissions', [PermissionController::class, 'updateUserPermissions']);
            Route::post('{user}/permissions/reset', [PermissionController::class, 'resetUserPermissions']);
        });

        // Permissões
        Route::prefix('permissions')->group(function () {
            Route::get('/', [PermissionController::class, 'index']);
            Route::get('roles', [PermissionController::class, 'rolePermissions']);
            Route::get('me', [PermissionController::class, 'myPermissions']);
        });

        // SDR Agents (IA) - Requer feature: sdr_ia
        Route::middleware('feature:sdr_ia')->prefix('sdr-agents')->group(function () {
            Route::get('/', [SdrAgentController::class, 'index']);
            Route::post('/', [SdrAgentController::class, 'store']);
            Route::get('{sdrAgent}', [SdrAgentController::class, 'show']);
            Route::put('{sdrAgent}', [SdrAgentController::class, 'update']);
            Route::delete('{sdrAgent}', [SdrAgentController::class, 'destroy']);
            Route::post('{sdrAgent}/toggle-active', [SdrAgentController::class, 'toggleActive']);
            
            // Documentos
            Route::get('{sdrAgent}/documents', [SdrAgentController::class, 'listDocuments']);
            Route::post('{sdrAgent}/documents', [SdrAgentController::class, 'uploadDocument']);
            Route::delete('{sdrAgent}/documents/{document}', [SdrAgentController::class, 'deleteDocument']);
            Route::post('{sdrAgent}/documents/{document}/reprocess', [SdrAgentController::class, 'reprocessDocument']);
            
            // FAQs
            Route::get('{sdrAgent}/faqs', [SdrAgentController::class, 'listFaqs']);
            Route::post('{sdrAgent}/faqs', [SdrAgentController::class, 'storeFaq']);
            Route::put('{sdrAgent}/faqs/{faq}', [SdrAgentController::class, 'updateFaq']);
            Route::delete('{sdrAgent}/faqs/{faq}', [SdrAgentController::class, 'deleteFaq']);
            
            // Knowledge Entries (Base de Conhecimento em Texto)
            Route::get('{sdrAgent}/knowledge', [SdrAgentController::class, 'listKnowledge']);
            Route::post('{sdrAgent}/knowledge', [SdrAgentController::class, 'storeKnowledge']);
            Route::put('{sdrAgent}/knowledge/{entry}', [SdrAgentController::class, 'updateKnowledge']);
            Route::delete('{sdrAgent}/knowledge/{entry}', [SdrAgentController::class, 'deleteKnowledge']);
            
            // Pipelines (Fluxo de vendas)
            Route::get('{sdrAgent}/pipelines', [SdrAgentController::class, 'listPipelines']);
            Route::post('{sdrAgent}/pipelines/sync', [SdrAgentController::class, 'syncPipelines']);
            Route::put('{sdrAgent}/stage-rules', [SdrAgentController::class, 'updateStageRules']);
            Route::put('{sdrAgent}/pipeline-instructions', [SdrAgentController::class, 'updatePipelineInstructions']);
            
            // Testes
            Route::post('{sdrAgent}/test-prompt', [SdrAgentController::class, 'testPrompt']);
            Route::get('{sdrAgent}/preview-payload', [SdrAgentController::class, 'previewWebhookPayload']);
            
            // Regras de Estágio
            Route::get('{sdrAgent}/rules/stages', [AgentRulesController::class, 'listStageRules']);
            Route::post('{sdrAgent}/rules/stages', [AgentRulesController::class, 'storeStageRule']);
            Route::put('{sdrAgent}/rules/stages/{agentStageRule}', [AgentRulesController::class, 'updateStageRule']);
            Route::delete('{sdrAgent}/rules/stages/{agentStageRule}', [AgentRulesController::class, 'deleteStageRule']);
            
            // Regras de Escalação
            Route::get('{sdrAgent}/rules/escalation', [AgentRulesController::class, 'listEscalationRules']);
            Route::post('{sdrAgent}/rules/escalation', [AgentRulesController::class, 'storeEscalationRule']);
            Route::put('{sdrAgent}/rules/escalation/{agentEscalationRule}', [AgentRulesController::class, 'updateEscalationRule']);
            Route::delete('{sdrAgent}/rules/escalation/{agentEscalationRule}', [AgentRulesController::class, 'deleteEscalationRule']);
        });
        
        // Templates de Agentes SDR - Requer feature: sdr_ia
        Route::middleware('feature:sdr_ia')->prefix('agent-templates')->group(function () {
            Route::get('/', [AgentTemplateController::class, 'index']);
            Route::get('{agentTemplate}', [AgentTemplateController::class, 'show']);
            Route::post('{agentTemplate}/apply', [AgentTemplateController::class, 'apply']);
            Route::post('{agentTemplate}/create-agent', [AgentTemplateController::class, 'createFromTemplate']);
        });

        // Utilitários
        Route::prefix('utils')->group(function () {
            Route::post('search-cep', [CustomerDataController::class, 'searchCep']);
            Route::post('validate-cpf', [CustomerDataController::class, 'validateCpf']);
            Route::post('validate-cnpj', [CustomerDataController::class, 'validateCnpj']);
        });

        // Contatos
        Route::prefix('contacts')->group(function () {
            Route::get('/', [ContactController::class, 'index']);
            Route::post('/', [ContactController::class, 'store']);
            Route::get('{contact}', [ContactController::class, 'show']);
            Route::put('{contact}', [ContactController::class, 'update']);
            Route::delete('{contact}', [ContactController::class, 'destroy']);
        });

        // Dashboard
        Route::get('dashboard/data', [DashboardController::class, 'load']);

        // Tickets
        Route::prefix('tickets')->group(function () {
            Route::get('/', [TicketController::class, 'index']);
            Route::post('/', [TicketController::class, 'store']);
            Route::get('{ticket}', [TicketController::class, 'show']);
            Route::put('{ticket}', [TicketController::class, 'update']);
            Route::delete('{ticket}', [TicketController::class, 'destroy']);
            Route::get('{ticket}/messages', [TicketController::class, 'messages']); // Paginado para lazy load
            Route::post('{ticket}/messages', [TicketController::class, 'sendMessage']);
            Route::put('{ticket}/messages/{message}', [TicketController::class, 'updateMessage']); // Editar mensagem
            Route::delete('{ticket}/messages/{message}', [TicketController::class, 'deleteMessage']); // Excluir mensagem
            // Transferência e encerramento
            Route::get('{ticket}/transfer-options', [TicketController::class, 'transferOptions']);
            Route::put('{ticket}/transfer', [TicketController::class, 'transfer']); // Transferir para usuário
            Route::put('{ticket}/transfer-queue', [TicketController::class, 'transferToQueue']); // Transferir para fila
            Route::put('{ticket}/close', [TicketController::class, 'close']); // Encerrar conversa
            Route::put('{ticket}/reopen', [TicketController::class, 'reopen']); // Reabrir conversa
            // Toggle IA para atendimento humano
            Route::put('{ticket}/toggle-ia', [TicketController::class, 'toggleIa']); // Toggle IA on/off
            Route::get('{ticket}/ia-status', [TicketController::class, 'iaStatus']); // Status da IA
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
            
            // Gerenciamento de permissões de usuários
            Route::get('{pipeline}/users', [PipelineController::class, 'users']);
            Route::post('{pipeline}/users', [PipelineController::class, 'addUser']);
            Route::put('{pipeline}/users/{userId}', [PipelineController::class, 'updateUserPermissions']);
            Route::delete('{pipeline}/users/{userId}', [PipelineController::class, 'removeUser']);
            Route::post('{pipeline}/users/sync', [PipelineController::class, 'syncUsers']);
        });

        // Canais
        Route::prefix('channels')->group(function () {
            Route::get('/', [ChannelController::class, 'index']);
            Route::post('/', [ChannelController::class, 'store']);
            Route::get('{channel}', [ChannelController::class, 'show']);
            Route::put('{channel}', [ChannelController::class, 'update']);
            Route::delete('{channel}', [ChannelController::class, 'destroy']);
            Route::post('{channel}/test-connection', [ChannelController::class, 'testConnection']);
            Route::put('{channel}/ia-mode', [ChannelController::class, 'updateIaMode']);
            Route::post('{channel}/toggle-active', [ChannelController::class, 'toggleActive']);
            
            // Menu de filas
            Route::put('{channel}/queue-menu', [ChannelController::class, 'updateQueueMenu']);
            Route::get('{channel}/queue-menu/preview', [ChannelController::class, 'previewQueueMenu']);
            
            // Filas/Setores do canal
            Route::get('{channel}/queues', [QueueController::class, 'byChannel']);
            Route::get('{channel}/queues/stats', [QueueController::class, 'stats']);
            Route::post('{channel}/queues/reorder', [QueueController::class, 'reorderMenu']);
        });

        // =====================
        // FILAS/SETORES (QUEUES)
        // =====================
        Route::prefix('queues')->group(function () {
            Route::get('/', [QueueController::class, 'index']);
            Route::post('/', [QueueController::class, 'store']);
            Route::get('{queue}', [QueueController::class, 'show']);
            Route::put('{queue}', [QueueController::class, 'update']);
            Route::delete('{queue}', [QueueController::class, 'destroy']);
            
            // Gerenciamento de usuários na fila
            Route::post('{queue}/users', [QueueController::class, 'addUsers']);
            Route::delete('{queue}/users', [QueueController::class, 'removeUsers']);
            Route::put('{queue}/users/sync', [QueueController::class, 'syncUsers']);
            Route::put('{queue}/users/{user}/status', [QueueController::class, 'updateUserStatus']);
            
            // Ações da fila
            Route::post('{queue}/toggle-auto-distribute', [QueueController::class, 'toggleAutoDistribute']);
            Route::post('{queue}/distribute-waiting', [QueueController::class, 'distributeWaitingLeads']);
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

        // Google Tag Manager
        Route::prefix('gtm')->group(function () {
            Route::get('settings', [\App\Http\Controllers\GtmController::class, 'getSettings']);
            Route::put('settings', [\App\Http\Controllers\GtmController::class, 'updateSettings']);
            Route::get('suggestions', [\App\Http\Controllers\GtmController::class, 'getEventSuggestions']);
            Route::get('fields', [\App\Http\Controllers\GtmController::class, 'getAvailableFields']);
            Route::get('pipeline/{pipeline}/events', [\App\Http\Controllers\GtmController::class, 'getPipelineEvents']);
            Route::put('pipeline/{pipeline}/events', [\App\Http\Controllers\GtmController::class, 'updatePipelineEvents']);
            Route::put('stage/{stage}/event', [\App\Http\Controllers\GtmController::class, 'updateStageEvent']);
        });

        // Categorias de Produtos - Requer feature: products
        Route::middleware('feature:products')->prefix('product-categories')->group(function () {
            Route::get('/', [ProductCategoryController::class, 'index']);
            Route::post('/', [ProductCategoryController::class, 'store']);
            Route::get('{category}', [ProductCategoryController::class, 'show']);
            Route::put('{category}', [ProductCategoryController::class, 'update']);
            Route::delete('{category}', [ProductCategoryController::class, 'destroy']);
            Route::post('reorder', [ProductCategoryController::class, 'reorder']);
        });

        // Produtos - Requer feature: products
        Route::middleware('feature:products')->prefix('products')->group(function () {
            Route::get('/', [ProductController::class, 'index']);
            Route::post('/', [ProductController::class, 'store']);
            Route::get('{product}', [ProductController::class, 'show']);
            Route::put('{product}', [ProductController::class, 'update']);
            Route::delete('{product}', [ProductController::class, 'destroy']);
            Route::post('{product}/duplicate', [ProductController::class, 'duplicate']);
            
            // Imagens
            Route::post('{product}/images', [ProductController::class, 'uploadImage']);
            Route::delete('{product}/images/{image}', [ProductController::class, 'deleteImage']);
            Route::put('{product}/images/{image}/primary', [ProductController::class, 'setPrimaryImage']);
            Route::post('{product}/images/reorder', [ProductController::class, 'reorderImages']);
        });

        // Landing Pages - Requer feature: landing_pages
        Route::middleware('feature:landing_pages')->prefix('landing-pages')->group(function () {
            Route::get('/', [LandingPageController::class, 'index']);
            Route::post('/', [LandingPageController::class, 'store']);
            Route::get('{landingPage}', [LandingPageController::class, 'show']);
            Route::put('{landingPage}', [LandingPageController::class, 'update']);
            Route::delete('{landingPage}', [LandingPageController::class, 'destroy']);
            Route::post('{landingPage}/publish', [LandingPageController::class, 'publish']);
            Route::post('{landingPage}/unpublish', [LandingPageController::class, 'unpublish']);
            Route::post('{landingPage}/duplicate', [LandingPageController::class, 'duplicate']);
            Route::get('{landingPage}/stats', [LandingPageController::class, 'stats']);
            Route::post('{landingPage}/upload-image', [LandingPageController::class, 'uploadImage']);
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

    // Grupos (Visão Multi-Loja) - Requer feature: groups
    Route::middleware('feature:groups')->prefix('groups')->group(function () {
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

    // WhatsApp (rotas protegidas)
    Route::prefix('whatsapp')->group(function () {
        Route::post('tickets/{ticket}/send', [WhatsAppController::class, 'sendMessage']);
        Route::post('tickets/{ticket}/media', [WhatsAppController::class, 'sendMedia']);
        Route::post('tickets/{ticket}/template', [WhatsAppController::class, 'sendTemplate']);
        Route::post('tickets/{ticket}/proxy-media', [WhatsAppController::class, 'proxyMedia']);
        Route::post('configure', [WhatsAppController::class, 'configureChannel']);
        Route::post('test-connection', [WhatsAppController::class, 'testConnection']);

        // =====================
        // TEMPLATES DO WHATSAPP
        // =====================
        Route::prefix('templates')->group(function () {
            // Listagem e CRUD básico
            Route::get('/', [\App\Http\Controllers\WhatsAppTemplateController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\WhatsAppTemplateController::class, 'store']);
            Route::get('categories', [\App\Http\Controllers\WhatsAppTemplateController::class, 'categories']);
            Route::get('statuses', [\App\Http\Controllers\WhatsAppTemplateController::class, 'statuses']);
            Route::get('check-name', [\App\Http\Controllers\WhatsAppTemplateController::class, 'checkName']);
            Route::post('preview', [\App\Http\Controllers\WhatsAppTemplateController::class, 'preview']);
            
            // Template específico
            Route::get('{template}', [\App\Http\Controllers\WhatsAppTemplateController::class, 'show']);
            Route::delete('{template}', [\App\Http\Controllers\WhatsAppTemplateController::class, 'destroy']);
            Route::get('{template}/status', [\App\Http\Controllers\WhatsAppTemplateController::class, 'checkStatus']);
            
            // Operações por canal
            Route::get('meta/{channel}', [\App\Http\Controllers\WhatsAppTemplateController::class, 'listFromMeta']);
            Route::post('sync/{channel}', [\App\Http\Controllers\WhatsAppTemplateController::class, 'sync']);
            Route::get('approved/{channel}', [\App\Http\Controllers\WhatsAppTemplateController::class, 'approved']);
            Route::get('stats/{channel}', [\App\Http\Controllers\WhatsAppTemplateController::class, 'stats']);
        });
    });

    // Instagram (rotas protegidas)
    Route::prefix('instagram')->group(function () {
        Route::post('tickets/{ticket}/send', [InstagramController::class, 'sendMessage']);
        Route::post('tickets/{ticket}/image', [InstagramController::class, 'sendImage']);
        Route::post('configure', [InstagramController::class, 'configureChannel']);
        Route::post('test-connection', [InstagramController::class, 'testConnection']);
        Route::get('conversations', [InstagramController::class, 'getConversations']);
    });

    // =====================
    // FILE UPLOADS (Chat Attachments)
    // =====================
    Route::prefix('files')->group(function () {
        // Presigned URL para upload direto ao S3/R2
        Route::post('presigned-url', [\App\Http\Controllers\FileUploadController::class, 'getPresignedUrl']);
        
        // Upload direto (fallback para storage local)
        Route::post('upload/{attachment}', [\App\Http\Controllers\FileUploadController::class, 'uploadDirect'])
            ->name('files.upload-direct');
        
        // Confirmar upload concluído
        Route::post('confirm', [\App\Http\Controllers\FileUploadController::class, 'confirmUpload']);
        
        // Listar anexos de um ticket
        Route::get('ticket/{ticket}', [\App\Http\Controllers\FileUploadController::class, 'listByTicket']);
        
        // Obter URL de download
        Route::get('{attachment}/download-url', [\App\Http\Controllers\FileUploadController::class, 'getDownloadUrl']);
        
        // Deletar anexo
        Route::delete('{attachment}', [\App\Http\Controllers\FileUploadController::class, 'destroy']);
    });
});

// =============================================================================
// ROTAS SUPER ADMIN (sem tenant scope)
// =============================================================================
Route::middleware(['auth:api', 'super_admin'])->prefix('admin')->group(function () {
    // Gestão de Tenants (Empresas)
    Route::prefix('tenants')->group(function () {
        Route::get('/', [TenantController::class, 'index']);
        Route::post('/', [TenantController::class, 'store']);
        Route::get('{tenant}', [TenantController::class, 'show']);
        Route::put('{tenant}', [TenantController::class, 'update']);
        Route::post('{tenant}/toggle-active', [TenantController::class, 'toggleActive']);
        Route::post('{tenant}/add-to-group', [TenantController::class, 'addToGroup']);
        Route::post('{tenant}/remove-from-group', [TenantController::class, 'removeFromGroup']);
        Route::get('{tenant}/groups', [TenantController::class, 'groups']);
        Route::post('{tenant}/users', [TenantController::class, 'createUser']);
    });

    // Gestão de Grupos
    Route::prefix('groups')->group(function () {
        Route::get('/', [GroupController::class, 'index']);
        Route::post('/', [GroupController::class, 'store']);
        Route::get('{group}', [GroupController::class, 'show']);
        Route::put('{group}', [GroupController::class, 'update']);
        Route::delete('{group}', [GroupController::class, 'destroy']);
    });
});

// =============================================================================
// AGENDAMENTOS (Appointments) - Requer feature: appointments
// =============================================================================
Route::middleware(['auth:api', 'tenant', 'feature:appointments'])->prefix('appointments')->group(function () {
    Route::get('/', [\App\Http\Controllers\AppointmentController::class, 'index']);
    Route::post('/', [\App\Http\Controllers\AppointmentController::class, 'store']);
    Route::get('available-slots', [\App\Http\Controllers\AppointmentController::class, 'availableSlots']);
    Route::get('available-days', [\App\Http\Controllers\AppointmentController::class, 'availableDays']);
    Route::get('{appointment}', [\App\Http\Controllers\AppointmentController::class, 'show']);
    Route::put('{appointment}', [\App\Http\Controllers\AppointmentController::class, 'update']);
    Route::post('{appointment}/confirm', [\App\Http\Controllers\AppointmentController::class, 'confirm']);
    Route::post('{appointment}/cancel', [\App\Http\Controllers\AppointmentController::class, 'cancel']);
    Route::post('{appointment}/complete', [\App\Http\Controllers\AppointmentController::class, 'complete']);
    Route::post('{appointment}/no-show', [\App\Http\Controllers\AppointmentController::class, 'noShow']);
    Route::post('{appointment}/reschedule', [\App\Http\Controllers\AppointmentController::class, 'reschedule']);
});

// Agenda dos usuários - Requer feature: appointments
Route::middleware(['auth:api', 'tenant', 'feature:appointments'])->prefix('schedules')->group(function () {
    Route::get('/', [\App\Http\Controllers\AppointmentController::class, 'listSchedules']);
    Route::post('/', [\App\Http\Controllers\AppointmentController::class, 'setSchedule']);
    Route::post('week', [\App\Http\Controllers\AppointmentController::class, 'setWeekSchedule']);
});

// =============================================================================
// APIs PARA AGENTE IA (chamadas pelo microserviço Python)
// =============================================================================
Route::middleware(['auth:api', 'tenant'])->prefix('agent-actions')->group(function () {
    Route::post('move-stage', [\App\Http\Controllers\AgentActionsController::class, 'moveStage']);
    Route::post('schedule-appointment', [\App\Http\Controllers\AgentActionsController::class, 'scheduleAppointment']);
    Route::post('get-available-slots', [\App\Http\Controllers\AgentActionsController::class, 'getAvailableSlots']);
    Route::post('qualify-lead', [\App\Http\Controllers\AgentActionsController::class, 'qualifyLead']);
    Route::post('schedule-follow-up', [\App\Http\Controllers\AgentActionsController::class, 'scheduleFollowUp']);
    Route::post('transfer-to-human', [\App\Http\Controllers\AgentActionsController::class, 'transferToHuman']);
    Route::post('list-stages', [\App\Http\Controllers\AgentActionsController::class, 'listStages']);
});

// =============================================================================
// APRENDIZADO DO AGENTE (Feedback, FAQs Automáticas, Padrões)
// =============================================================================
Route::middleware(['auth:api', 'tenant'])->prefix('agent-learning')->group(function () {
    // Feedback de mensagens (👍/👎)
    Route::post('feedback', [\App\Http\Controllers\AgentLearningController::class, 'submitFeedback']);
    
    // Perguntas detectadas (FAQs automáticas)
    Route::get('questions/{agentId}', [\App\Http\Controllers\AgentLearningController::class, 'listDetectedQuestions']);
    Route::post('questions/{questionId}/review', [\App\Http\Controllers\AgentLearningController::class, 'reviewDetectedQuestion']);
    
    // Memória de longo prazo do lead
    Route::get('lead-memory/{leadId}', [\App\Http\Controllers\AgentLearningController::class, 'getLeadMemory']);
    
    // Padrões de conversa
    Route::get('patterns/{agentId}', [\App\Http\Controllers\AgentLearningController::class, 'listPatterns']);
    
    // Estatísticas de aprendizado
    Route::get('stats/{agentId}', [\App\Http\Controllers\AgentLearningController::class, 'getLearningStats']);
});

// =============================================================================
// ADS INTELLIGENCE - Gestão de Campanhas (Meta/Google Ads)
// Requer feature: ads_intelligence
// =============================================================================
Route::middleware(['auth:api', 'tenant', 'feature:ads_intelligence'])->prefix('ads')->group(function () {
    // Plataformas disponíveis
    Route::get('platforms', [\App\Http\Controllers\AdAccountController::class, 'platforms']);
    
    // Contas de anúncio
    Route::prefix('accounts')->group(function () {
        Route::get('/', [\App\Http\Controllers\AdAccountController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\AdAccountController::class, 'store']);
        Route::get('{account}', [\App\Http\Controllers\AdAccountController::class, 'show']);
        Route::put('{account}', [\App\Http\Controllers\AdAccountController::class, 'update']);
        Route::delete('{account}', [\App\Http\Controllers\AdAccountController::class, 'destroy']);
        Route::post('{account}/sync', [\App\Http\Controllers\AdAccountController::class, 'sync']);
        Route::post('{account}/test', [\App\Http\Controllers\AdAccountController::class, 'test']);
    });
    
    // Dashboard e métricas gerais
    Route::get('dashboard', [\App\Http\Controllers\AdCampaignController::class, 'dashboard']);
    Route::get('ranking', [\App\Http\Controllers\AdCampaignController::class, 'ranking']);
    
    // Campanhas
    Route::prefix('campaigns')->group(function () {
        Route::get('/', [\App\Http\Controllers\AdCampaignController::class, 'index']);
        Route::get('{campaign}', [\App\Http\Controllers\AdCampaignController::class, 'show']);
        Route::get('{campaign}/metrics', [\App\Http\Controllers\AdCampaignController::class, 'metrics']);
    });
    
    // Insights da IA
    Route::prefix('insights')->group(function () {
        Route::get('/', [\App\Http\Controllers\AdInsightController::class, 'index']);
        Route::get('types', [\App\Http\Controllers\AdInsightController::class, 'types']);
        Route::get('severities', [\App\Http\Controllers\AdInsightController::class, 'severities']);
        Route::get('{insight}', [\App\Http\Controllers\AdInsightController::class, 'show']);
        Route::post('{insight}/apply', [\App\Http\Controllers\AdInsightController::class, 'apply']);
        Route::post('{insight}/dismiss', [\App\Http\Controllers\AdInsightController::class, 'dismiss']);
    });
    
    // Regras de automação
    Route::prefix('rules')->group(function () {
        Route::get('/', [\App\Http\Controllers\AdAutomationController::class, 'index']);
        Route::post('/', [\App\Http\Controllers\AdAutomationController::class, 'store']);
        Route::get('metrics', [\App\Http\Controllers\AdAutomationController::class, 'metrics']);
        Route::get('actions', [\App\Http\Controllers\AdAutomationController::class, 'actions']);
        Route::get('{rule}', [\App\Http\Controllers\AdAutomationController::class, 'show']);
        Route::put('{rule}', [\App\Http\Controllers\AdAutomationController::class, 'update']);
        Route::delete('{rule}', [\App\Http\Controllers\AdAutomationController::class, 'destroy']);
        Route::post('{rule}/toggle', [\App\Http\Controllers\AdAutomationController::class, 'toggle']);
    });
    
    // Logs de automação
    Route::prefix('automation')->group(function () {
        Route::get('logs', [\App\Http\Controllers\AdAutomationController::class, 'logs']);
        Route::post('logs/{log}/rollback', [\App\Http\Controllers\AdAutomationController::class, 'rollback']);
        Route::post('logs/{log}/approve', [\App\Http\Controllers\AdAutomationController::class, 'approve']);
        Route::post('logs/{log}/reject', [\App\Http\Controllers\AdAutomationController::class, 'reject']);
    });
    
    // Agente de IA para criação de campanhas
    Route::prefix('agent')->group(function () {
        Route::post('create-campaign', [\App\Http\Controllers\AdAgentController::class, 'createCampaign']);
        Route::get('campaigns/{campaign}/full-report', [\App\Http\Controllers\AdAgentController::class, 'getCampaignFullReport']);
        Route::get('campaigns/{campaign}/ads', [\App\Http\Controllers\AdAgentController::class, 'getCampaignAds']);
    });
});

// =============================================================================
// Rotas para integração com Worker Python (fila de mensagens)
// Autenticação via X-API-Key header
// =============================================================================
Route::prefix('agent')->group(function () {
    Route::post('context', [\App\Http\Controllers\AgentQueueController::class, 'getContext']);
    Route::post('response', [\App\Http\Controllers\AgentQueueController::class, 'handleResponse']);
});

// =============================================================================
// Rotas internas para microserviço de IA (Python)
// Autenticação via X-Internal-Key header
// =============================================================================
Route::middleware('internal.api')->prefix('internal')->group(function () {
    // Uso de IA
    Route::post('ai-usage', [\App\Http\Controllers\InternalAiUsageController::class, 'logUsage']);
    Route::post('ai-usage/check', [\App\Http\Controllers\InternalAiUsageController::class, 'checkAiAccess']);
    
    // Uso de leads
    Route::post('leads/check', [\App\Http\Controllers\InternalAiUsageController::class, 'checkLeadAccess']);
    Route::post('leads/register', [\App\Http\Controllers\InternalAiUsageController::class, 'registerLeadCreation']);
    
    // Resumo de uso
    Route::post('usage/summary', [\App\Http\Controllers\InternalAiUsageController::class, 'getUsageSummary']);
});

// Rotas públicas (sem autenticação)
// Produtos para landing page
Route::get('public/{tenantSlug}/products', [ProductController::class, 'publicList']);

// Landing Pages públicas
Route::prefix('lp')->group(function () {
    Route::get('{slug}', [LandingPageController::class, 'publicShow']);
    Route::post('{slug}/submit', [LandingPageController::class, 'publicSubmit']);
});

// Webhooks públicos (sem autenticação)
Route::prefix('webhooks')->group(function () {
    // WhatsApp webhook
    Route::get('whatsapp', [WhatsAppController::class, 'verifyWebhook']);
    Route::post('whatsapp', [WhatsAppController::class, 'receiveWebhook']);
    
    // Simulação de mensagem WhatsApp para testes locais
    Route::post('simulate-message', [WhatsAppController::class, 'simulateMessage']);

    // Instagram webhook
    Route::get('instagram', [InstagramController::class, 'verifyWebhook']);
    Route::post('instagram', [InstagramController::class, 'receiveWebhook']);

    // Meta unified webhook (WhatsApp + Instagram + Facebook)
    // Use este endpoint único se preferir configurar apenas um webhook no Meta
    Route::get('meta', [MetaWebhookController::class, 'verify']);
    Route::post('meta', [MetaWebhookController::class, 'receive']);
});

// Media proxy (serve files from S3)
Route::middleware('auth:api')->get('media/{path}', [\App\Http\Controllers\MediaController::class, 'serve'])
    ->where('path', '.*');

// Public media route with signed URL (no auth required, signature validates access)
Route::get('media-public/{path}', [\App\Http\Controllers\MediaController::class, 'servePublic'])
    ->where('path', '.*')
    ->name('media.public');

// Get signed URL for media (authenticated)
Route::middleware('auth:api')->post('media/signed-url', [\App\Http\Controllers\MediaController::class, 'getSignedUrl']);

// =====================
// SUPER ADMIN ROUTES
// =====================
Route::middleware(['auth:api', 'super_admin'])->prefix('super-admin')->group(function () {
    // Dashboard
    Route::get('dashboard', [\App\Http\Controllers\SuperAdminController::class, 'dashboard']);

    // Tenants (Empresas)
    Route::get('tenants', [\App\Http\Controllers\SuperAdminController::class, 'listTenants']);
    Route::post('tenants', [\App\Http\Controllers\SuperAdminController::class, 'createTenant']);
    Route::get('tenants/{tenant}', [\App\Http\Controllers\SuperAdminController::class, 'showTenant']);
    Route::put('tenants/{tenant}', [\App\Http\Controllers\SuperAdminController::class, 'updateTenant']);
    Route::put('tenants/{tenant}/features', [\App\Http\Controllers\SuperAdminController::class, 'updateTenantFeatures']);

    // Usuários
    Route::get('users', [\App\Http\Controllers\SuperAdminController::class, 'listUsers']);
    Route::post('users', [\App\Http\Controllers\SuperAdminController::class, 'createUser']);
    Route::put('users/{user}', [\App\Http\Controllers\SuperAdminController::class, 'updateUser']);
    Route::delete('users/{user}', [\App\Http\Controllers\SuperAdminController::class, 'deleteUser']);

    // Configurações
    Route::get('permissions', [\App\Http\Controllers\SuperAdminController::class, 'listPermissions']);
    Route::get('features', [\App\Http\Controllers\SuperAdminController::class, 'listFeatures']);
    Route::get('plans', [\App\Http\Controllers\SuperAdminController::class, 'listPlans']);

    // Logs
    Route::get('logs', [\App\Http\Controllers\SuperAdminController::class, 'listLogs']);

    // =====================
    // CUSTOS E USO (Super Admin Only)
    // =====================
    Route::prefix('costs')->group(function () {
        // Dashboard de custos
        Route::get('dashboard', [\App\Http\Controllers\SuperAdminCostController::class, 'dashboard']);
        
        // Listagem de tenants com uso
        Route::get('tenants', [\App\Http\Controllers\SuperAdminCostController::class, 'listTenantsUsage']);
        
        // Detalhes de custo por tenant
        Route::get('tenants/{tenant}', [\App\Http\Controllers\SuperAdminCostController::class, 'tenantCostDetails']);
        
        // Quotas do tenant
        Route::put('tenants/{tenant}/quota', [\App\Http\Controllers\SuperAdminCostController::class, 'updateTenantQuota']);
        Route::post('tenants/{tenant}/quota/reset', [\App\Http\Controllers\SuperAdminCostController::class, 'resetTenantQuota']);
        
        // Alertas
        Route::get('alerts', [\App\Http\Controllers\SuperAdminCostController::class, 'listAlerts']);
        Route::post('alerts/{alert}/acknowledge', [\App\Http\Controllers\SuperAdminCostController::class, 'acknowledgeAlert']);
        Route::post('alerts/{alert}/resolve', [\App\Http\Controllers\SuperAdminCostController::class, 'resolveAlert']);
        
        // Faturamento
        Route::get('billing', [\App\Http\Controllers\SuperAdminCostController::class, 'listBillingRecords']);
        Route::post('billing/{tenant}/generate', [\App\Http\Controllers\SuperAdminCostController::class, 'generateBilling']);
        Route::post('billing/{billing}/mark-paid', [\App\Http\Controllers\SuperAdminCostController::class, 'markBillingPaid']);
        
        // Exportação e preços
        Route::get('export', [\App\Http\Controllers\SuperAdminCostController::class, 'exportReport']);
        Route::get('pricing', [\App\Http\Controllers\SuperAdminCostController::class, 'getPlanPricing']);
    });
});


