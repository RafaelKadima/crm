<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;

/**
 * Proxy Controller para o Content Creator do AI-Service
 *
 * Repassa chamadas do frontend para o microserviço Python (ai-service)
 * que roda em localhost:8001
 */
class AIContentProxyController extends Controller
{
    protected string $aiServiceUrl;

    public function __construct()
    {
        $this->aiServiceUrl = config('services.ai_service.url', 'http://localhost:8001');
    }

    /**
     * Retorna o tenant_id como string UUID
     */
    protected function getTenantId(): string
    {
        $user = auth()->user();
        return (string) $user->tenant_id;
    }

    /**
     * Retorna o user_id como string UUID
     */
    protected function getUserId(): string
    {
        return (string) auth()->id();
    }

    /**
     * Faz proxy de requisições POST para o ai-service
     */
    protected function proxyPost(Request $request, string $endpoint): JsonResponse
    {
        try {
            $response = Http::timeout(120)
                ->withHeaders([
                    'X-Tenant-ID' => $this->getTenantId(),
                    'X-User-ID' => $this->getUserId(),
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->aiServiceUrl}/content{$endpoint}", $request->all());

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao conectar com o serviço de IA',
                'message' => $e->getMessage()
            ], 503);
        }
    }

    /**
     * Faz proxy de requisições GET para o ai-service
     */
    protected function proxyGet(Request $request, string $endpoint): JsonResponse
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'X-Tenant-ID' => $this->getTenantId(),
                    'X-User-ID' => $this->getUserId(),
                ])
                ->get("{$this->aiServiceUrl}/content{$endpoint}");

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao conectar com o serviço de IA',
                'message' => $e->getMessage()
            ], 503);
        }
    }

    /**
     * Faz proxy de requisições DELETE para o ai-service
     */
    protected function proxyDelete(Request $request, string $endpoint): JsonResponse
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'X-Tenant-ID' => $this->getTenantId(),
                    'X-User-ID' => $this->getUserId(),
                ])
                ->delete("{$this->aiServiceUrl}/content{$endpoint}");

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao conectar com o serviço de IA',
                'message' => $e->getMessage()
            ], 503);
        }
    }

    // ==================== CHAT ====================

    /**
     * Chat com o agente de criação de conteúdo
     * POST /api/ai/content/chat
     */
    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:5000',
            'session_id' => 'nullable|string|uuid',
        ]);

        return $this->proxyPost($request, '/chat');
    }

    // ==================== SESSÕES ====================

    /**
     * Lista sessões de chat do usuário
     * GET /api/ai/content/sessions
     */
    public function listSessions(Request $request): JsonResponse
    {
        return $this->proxyGet($request, '/sessions');
    }

    /**
     * Retorna detalhes de uma sessão de chat
     * GET /api/ai/content/sessions/{sessionId}
     */
    public function getSession(Request $request, string $sessionId): JsonResponse
    {
        return $this->proxyGet($request, "/sessions/{$sessionId}");
    }

    // ==================== CRIADORES ====================

    /**
     * Lista todos os criadores do tenant
     * GET /api/ai/content/creators
     */
    public function listCreators(Request $request): JsonResponse
    {
        return $this->proxyGet($request, '/creators');
    }

    /**
     * Retorna detalhes de um criador
     * GET /api/ai/content/creators/{creatorId}
     */
    public function getCreator(Request $request, string $creatorId): JsonResponse
    {
        return $this->proxyGet($request, "/creators/{$creatorId}");
    }

    /**
     * Cria um novo criador
     * POST /api/ai/content/creators
     */
    public function createCreator(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'video_urls' => 'nullable|array',
            'video_urls.*' => 'url',
        ]);

        return $this->proxyPost($request, '/creators');
    }

    /**
     * Adiciona um vídeo a um criador existente
     * POST /api/ai/content/creators/{creatorId}/videos
     */
    public function addVideoToCreator(Request $request, string $creatorId): JsonResponse
    {
        $request->validate([
            'video_url' => 'required|url',
        ]);

        return $this->proxyPost($request, "/creators/{$creatorId}/videos");
    }

    /**
     * Deleta um criador
     * DELETE /api/ai/content/creators/{creatorId}
     */
    public function deleteCreator(Request $request, string $creatorId): JsonResponse
    {
        return $this->proxyDelete($request, "/creators/{$creatorId}");
    }

    // ==================== BUSCA DE VÍDEOS VIRAIS ====================

    /**
     * Busca vídeos virais sobre um tema
     * POST /api/ai/content/search-viral
     */
    public function searchViralVideos(Request $request): JsonResponse
    {
        $request->validate([
            'topic' => 'required|string|max:255',
            'platform' => 'nullable|string|in:youtube,tiktok,instagram,all',
            'period' => 'nullable|string|in:day,week,month,year',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        return $this->proxyPost($request, '/search-viral');
    }

    // ==================== TRANSCRIÇÃO ====================

    /**
     * Transcreve um vídeo
     * POST /api/ai/content/transcribe
     */
    public function transcribeVideo(Request $request): JsonResponse
    {
        $request->validate([
            'video_url' => 'required|url',
        ]);

        return $this->proxyPost($request, '/transcribe');
    }
}
