<?php

namespace App\Http\Controllers;

use App\Enums\WhatsAppTemplateCategoryEnum;
use App\Enums\WhatsAppTemplateStatusEnum;
use App\Http\Requests\WhatsAppTemplate\StoreWhatsAppTemplateRequest;
use App\Models\Channel;
use App\Models\WhatsAppTemplate;
use App\Services\WhatsAppTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Controller para gerenciamento de templates do WhatsApp Business API.
 * 
 * Permite criar, listar, deletar e consultar status de templates
 * diretamente no sistema, sem precisar acessar o Meta Business.
 */
class WhatsAppTemplateController extends Controller
{
    public function __construct(
        protected WhatsAppTemplateService $templateService
    ) {}

    /**
     * Lista templates com filtros e paginação.
     * 
     * GET /api/whatsapp/templates
     * 
     * Query params:
     * - channel_id: UUID do canal (opcional)
     * - category: MARKETING | AUTHENTICATION | UTILITY (opcional)
     * - status: PENDING | APPROVED | REJECTED | etc (opcional)
     * - search: Busca por nome ou body (opcional)
     * - per_page: Quantidade por página (default 20)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            $templates = $this->templateService->list(
                tenantId: $tenantId,
                channelId: $request->get('channel_id'),
                category: $request->get('category'),
                status: $request->get('status'),
                search: $request->get('search'),
                perPage: $request->get('per_page', 20)
            );

            return response()->json([
                'success' => true,
                'data' => $templates->items(),
                'meta' => [
                    'current_page' => $templates->currentPage(),
                    'last_page' => $templates->lastPage(),
                    'per_page' => $templates->perPage(),
                    'total' => $templates->total(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error listing WhatsApp templates', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar templates.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exibe um template específico.
     * 
     * GET /api/whatsapp/templates/{template}
     */
    public function show(WhatsAppTemplate $template): JsonResponse
    {
        $template->load('channel:id,name');

        return response()->json([
            'success' => true,
            'data' => $template,
        ]);
    }

    /**
     * Cria um novo template e submete ao Meta.
     * 
     * POST /api/whatsapp/templates
     */
    public function store(StoreWhatsAppTemplateRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $channel = Channel::findOrFail($validated['channel_id']);

            // Verifica se o nome já existe
            if (!$this->templateService->isNameAvailable(
                $validated['name'],
                $channel->id,
                $validated['language'] ?? 'pt_BR'
            )) {
                return response()->json([
                    'success' => false,
                    'message' => 'Já existe um template com este nome neste canal.',
                ], 422);
            }

            // Cria o template
            $template = $this->templateService->create($validated, $channel);

            return response()->json([
                'success' => true,
                'message' => 'Template criado e enviado para aprovação do Meta.',
                'data' => $template->load('channel:id,name'),
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creating WhatsApp template', [
                'error' => $e->getMessage(),
                'data' => $request->validated(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar template.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Deleta um template.
     * 
     * DELETE /api/whatsapp/templates/{template}
     */
    public function destroy(WhatsAppTemplate $template): JsonResponse
    {
        try {
            $this->templateService->delete($template);

            return response()->json([
                'success' => true,
                'message' => 'Template excluído com sucesso.',
            ]);

        } catch (\Exception $e) {
            Log::error('Error deleting WhatsApp template', [
                'template_id' => $template->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir template.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Consulta e atualiza o status de um template no Meta.
     * 
     * GET /api/whatsapp/templates/{template}/status
     */
    public function checkStatus(WhatsAppTemplate $template): JsonResponse
    {
        try {
            $updated = $this->templateService->checkStatus($template);

            return response()->json([
                'success' => true,
                'data' => [
                    'status' => $updated->status->value,
                    'status_description' => $updated->status->description(),
                    'rejection_reason' => $updated->rejection_reason,
                    'approved_at' => $updated->approved_at,
                    'can_send' => $updated->canSend(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Error checking template status', [
                'template_id' => $template->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao consultar status.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Lista templates diretamente do Meta (sem cache local).
     * 
     * GET /api/whatsapp/templates/meta/{channel}
     */
    public function listFromMeta(Channel $channel, Request $request): JsonResponse
    {
        try {
            $category = $request->get('category');
            $templates = $this->templateService->listFromMeta($channel, $category);

            return response()->json([
                'success' => true,
                'data' => $templates,
                'count' => count($templates),
            ]);

        } catch (\Exception $e) {
            Log::error('Error listing templates from Meta', [
                'channel_id' => $channel->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar templates do Meta.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sincroniza templates do Meta com o banco local.
     * 
     * POST /api/whatsapp/templates/sync/{channel}
     */
    public function sync(Channel $channel): JsonResponse
    {
        try {
            $result = $this->templateService->syncFromMeta($channel);

            return response()->json([
                'success' => true,
                'message' => 'Templates sincronizados com sucesso.',
                'data' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('Error syncing templates from Meta', [
                'channel_id' => $channel->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao sincronizar templates.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retorna templates aprovados de um canal (para uso em envios).
     * 
     * GET /api/whatsapp/templates/approved/{channel}
     */
    public function approved(Channel $channel): JsonResponse
    {
        $templates = $this->templateService->getApprovedTemplates($channel->id);

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Retorna estatísticas de templates de um canal.
     * 
     * GET /api/whatsapp/templates/stats/{channel}
     */
    public function stats(Channel $channel): JsonResponse
    {
        $stats = $this->templateService->getStats($channel->id);

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Retorna as categorias disponíveis.
     * 
     * GET /api/whatsapp/templates/categories
     */
    public function categories(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => WhatsAppTemplateCategoryEnum::toArray(),
        ]);
    }

    /**
     * Retorna os status possíveis.
     * 
     * GET /api/whatsapp/templates/statuses
     */
    public function statuses(): JsonResponse
    {
        $statuses = array_map(fn($case) => [
            'value' => $case->value,
            'label' => $case->value,
            'description' => $case->description(),
            'color' => $case->color(),
            'can_send' => $case->canSend(),
        ], WhatsAppTemplateStatusEnum::cases());

        return response()->json([
            'success' => true,
            'data' => $statuses,
        ]);
    }

    /**
     * Verifica se um nome de template está disponível.
     * 
     * GET /api/whatsapp/templates/check-name
     */
    public function checkName(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string',
            'channel_id' => 'required|uuid|exists:channels,id',
            'language' => 'sometimes|string',
            'exclude_id' => 'sometimes|uuid',
        ]);

        $available = $this->templateService->isNameAvailable(
            $request->get('name'),
            $request->get('channel_id'),
            $request->get('language', 'pt_BR'),
            $request->get('exclude_id')
        );

        return response()->json([
            'success' => true,
            'available' => $available,
        ]);
    }

    /**
     * Preview do payload que será enviado ao Meta.
     * 
     * POST /api/whatsapp/templates/preview
     */
    public function preview(StoreWhatsAppTemplateRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $channel = Channel::findOrFail($validated['channel_id']);

        // Cria um template temporário para gerar o payload
        $template = new WhatsAppTemplate([
            'name' => \Illuminate\Support\Str::snake(\Illuminate\Support\Str::lower(trim($validated['name']))),
            'category' => $validated['category'],
            'language' => $validated['language'] ?? 'pt_BR',
            'header_type' => $validated['header_type'] ?? null,
            'header_text' => $validated['header_text'] ?? null,
            'body_text' => $validated['body_text'],
            'footer_text' => $validated['footer_text'] ?? null,
            'buttons' => $validated['buttons'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'payload' => $template->toMetaPayload(),
                'variable_count' => $template->getVariableCount(),
                'variable_indices' => $template->getVariableIndices(),
            ],
        ]);
    }
}

