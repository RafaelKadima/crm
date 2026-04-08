<?php

namespace App\Http\Controllers;

use App\Models\Broadcast;
use App\Services\BroadcastService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class BroadcastController extends Controller
{
    public function __construct(
        protected BroadcastService $broadcastService
    ) {}

    /**
     * Lista broadcasts do tenant.
     *
     * GET /api/broadcasts
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Broadcast::where('tenant_id', $request->user()->tenant_id)
                ->with(['template:id,name,category,status', 'channel:id,name,type', 'creator:id,name'])
                ->orderBy('created_at', 'desc');

            if ($status = $request->get('status')) {
                $query->where('status', $status);
            }

            if ($search = $request->get('search')) {
                $query->where('name', 'like', "%{$search}%");
            }

            $perPage = min((int) $request->get('per_page', 20), 100);
            $broadcasts = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $broadcasts,
            ]);
        } catch (\Exception $e) {
            Log::error('[Broadcast] Erro ao listar', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erro ao listar broadcasts.'], 500);
        }
    }

    /**
     * Cria broadcast com recipients.
     *
     * POST /api/broadcasts
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'channel_id' => 'required|uuid|exists:channels,id',
            'whatsapp_template_id' => 'required|uuid|exists:whatsapp_templates,id',
            'filters' => 'nullable|array',
            'filters.pipeline_id' => 'nullable|uuid',
            'filters.stage_id' => 'nullable|uuid',
            'filters.owner_id' => 'nullable|uuid',
            'filters.channel_id' => 'nullable|uuid',
            'contact_ids' => 'nullable|array',
            'contact_ids.*' => 'uuid',
            'template_variables' => 'nullable|array',
            'template_variables.*.index' => 'required|integer|min:0',
            'template_variables.*.field' => 'required|string',
        ]);

        try {
            $broadcast = $this->broadcastService->createBroadcast($validated, $request->user());

            return response()->json([
                'success' => true,
                'data' => $broadcast->load(['template:id,name', 'channel:id,name']),
                'message' => "Broadcast criado com {$broadcast->total_recipients} destinatários.",
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            Log::error('[Broadcast] Erro ao criar', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erro ao criar broadcast.'], 500);
        }
    }

    /**
     * Detalhe de um broadcast.
     *
     * GET /api/broadcasts/{broadcast}
     */
    public function show(Request $request, Broadcast $broadcast): JsonResponse
    {
        $this->authorizeAccess($request, $broadcast);

        $broadcast->load([
            'template:id,name,category,body_text,language,status',
            'channel:id,name,type',
            'creator:id,name',
        ]);

        return response()->json([
            'success' => true,
            'data' => $broadcast,
        ]);
    }

    /**
     * Inicia envio do broadcast.
     *
     * POST /api/broadcasts/{broadcast}/start
     */
    public function start(Request $request, Broadcast $broadcast): JsonResponse
    {
        $this->authorizeAccess($request, $broadcast);

        try {
            $this->broadcastService->startBroadcast($broadcast);

            return response()->json([
                'success' => true,
                'message' => 'Broadcast iniciado.',
                'data' => $broadcast->fresh(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Pausa envio.
     *
     * POST /api/broadcasts/{broadcast}/pause
     */
    public function pause(Request $request, Broadcast $broadcast): JsonResponse
    {
        $this->authorizeAccess($request, $broadcast);

        try {
            $this->broadcastService->pauseBroadcast($broadcast);

            return response()->json([
                'success' => true,
                'message' => 'Broadcast pausado.',
                'data' => $broadcast->fresh(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Cancela broadcast.
     *
     * POST /api/broadcasts/{broadcast}/cancel
     */
    public function cancel(Request $request, Broadcast $broadcast): JsonResponse
    {
        $this->authorizeAccess($request, $broadcast);

        try {
            $this->broadcastService->cancelBroadcast($broadcast);

            return response()->json([
                'success' => true,
                'message' => 'Broadcast cancelado.',
                'data' => $broadcast->fresh(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * Preview de filtros: retorna contagem e sample.
     *
     * POST /api/broadcasts/preview
     */
    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'filters' => 'nullable|array',
            'filters.pipeline_id' => 'nullable|uuid',
            'filters.stage_id' => 'nullable|uuid',
            'filters.owner_id' => 'nullable|uuid',
            'filters.channel_id' => 'nullable|uuid',
            'filters.status' => 'nullable|string',
        ]);

        try {
            $result = $this->broadcastService->previewRecipients(
                $validated['filters'] ?? [],
                $request->user()
            );

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('[Broadcast] Erro no preview', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erro ao buscar destinatários.'], 500);
        }
    }

    /**
     * Soft delete (só DRAFT ou COMPLETED).
     *
     * DELETE /api/broadcasts/{broadcast}
     */
    public function destroy(Request $request, Broadcast $broadcast): JsonResponse
    {
        $this->authorizeAccess($request, $broadcast);

        if (in_array($broadcast->status->value, ['SENDING', 'PAUSED'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cancele o broadcast antes de excluir.',
            ], 422);
        }

        $broadcast->delete();

        return response()->json([
            'success' => true,
            'message' => 'Broadcast excluído.',
        ]);
    }

    /**
     * Verifica se o broadcast pertence ao tenant do usuário.
     */
    private function authorizeAccess(Request $request, Broadcast $broadcast): void
    {
        if ($broadcast->tenant_id !== $request->user()->tenant_id) {
            abort(403, 'Acesso negado.');
        }
    }
}
