<?php

namespace App\Http\Controllers;

use App\Models\SupportSession;
use App\Models\SupportMessage;
use App\Models\SupportAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SupportAgentController extends Controller
{
    /**
     * Verifica se usuario e o super admin autorizado (admin@demo.com).
     */
    private function isAuthorizedSuperAdmin(): bool
    {
        $user = auth()->user();
        return $user && $user->is_super_admin && $user->email === 'admin@demo.com';
    }

    /**
     * Lista sessoes de suporte do super admin.
     */
    public function sessions(Request $request): JsonResponse
    {
        if (!$this->isAuthorizedSuperAdmin()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $sessions = SupportSession::forUser(auth()->id())
            ->with(['messages' => fn($q) => $q->latest()->limit(1)])
            ->withCount(['messages', 'actions'])
            ->orderByDesc('last_message_at')
            ->paginate(20);

        return response()->json($sessions);
    }

    /**
     * Cria uma nova sessao de suporte.
     */
    public function createSession(Request $request): JsonResponse
    {
        if (!$this->isAuthorizedSuperAdmin()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
        ]);

        $session = SupportSession::create([
            'user_id' => auth()->id(),
            'title' => $validated['title'] ?? 'Nova sessao de suporte',
            'status' => 'active',
        ]);

        return response()->json([
            'message' => 'Sessao criada com sucesso',
            'session' => $session,
        ], 201);
    }

    /**
     * Exibe uma sessao com mensagens.
     */
    public function showSession(SupportSession $session): JsonResponse
    {
        if (!$this->isAuthorizedSuperAdmin()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        if ($session->user_id !== auth()->id()) {
            return response()->json(['error' => 'Sessao nao encontrada'], 404);
        }

        $session->load([
            'messages' => fn($q) => $q->orderBy('created_at', 'asc'),
            'actions' => fn($q) => $q->orderBy('created_at', 'desc'),
        ]);

        return response()->json([
            'session' => $session,
        ]);
    }

    /**
     * Envia mensagem e processa com o agente de IA.
     */
    public function chat(Request $request, SupportSession $session): JsonResponse
    {
        if (!$this->isAuthorizedSuperAdmin()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        if ($session->user_id !== auth()->id()) {
            return response()->json(['error' => 'Sessao nao encontrada'], 404);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:10000',
        ]);

        // Salva mensagem do usuario
        $userMessage = $session->addMessage('user', $validated['message']);

        try {
            // Chama o AI Service
            $response = $this->callAIService($session, $validated['message']);

            // Salva resposta do assistente
            $assistantMessage = $session->addMessage(
                'assistant',
                $response['response'] ?? 'Desculpe, nao consegui processar sua solicitacao.',
                $response['tool_calls_made'] ?? null
            );

            // Registra acoes executadas
            if (!empty($response['tool_calls_made'])) {
                foreach ($response['tool_calls_made'] as $toolCall) {
                    SupportAction::create([
                        'session_id' => $session->id,
                        'tool_name' => $toolCall['tool'],
                        'arguments' => $toolCall['arguments'] ?? [],
                        'result' => $toolCall['result'] ?? null,
                        'status' => $toolCall['success'] ? 'executed' : 'failed',
                        'requires_approval' => SupportAction::isDangerousTool($toolCall['tool']),
                        'dangerous' => SupportAction::isDangerousTool($toolCall['tool']),
                        'execution_time_ms' => $toolCall['execution_time_ms'] ?? null,
                        'executed_at' => now(),
                    ]);
                }
            }

            // Verifica se ha acoes pendentes de aprovacao
            $pendingApprovals = $response['pending_approvals'] ?? [];

            return response()->json([
                'message' => $assistantMessage,
                'tool_calls' => $response['tool_calls_made'] ?? [],
                'pending_approvals' => $pendingApprovals,
                'iterations' => $response['iterations'] ?? 1,
            ]);

        } catch (\Exception $e) {
            Log::error('Erro ao processar mensagem do agente de suporte', [
                'session_id' => $session->id,
                'error' => $e->getMessage(),
            ]);

            // Salva mensagem de erro
            $errorMessage = $session->addMessage(
                'assistant',
                'Desculpe, ocorreu um erro ao processar sua solicitacao. Por favor, tente novamente.'
            );

            return response()->json([
                'message' => $errorMessage,
                'error' => config('app.debug') ? $e->getMessage() : 'Erro interno',
            ], 500);
        }
    }

    /**
     * Aprova uma acao pendente.
     */
    public function approveAction(Request $request, SupportAction $action): JsonResponse
    {
        if (!$this->isAuthorizedSuperAdmin()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        if ($action->session->user_id !== auth()->id()) {
            return response()->json(['error' => 'Acao nao encontrada'], 404);
        }

        if (!$action->isPending()) {
            return response()->json(['error' => 'Acao ja foi processada'], 400);
        }

        $action->approve();

        // Executa a acao aprovada
        try {
            $result = $this->executeApprovedAction($action);

            return response()->json([
                'message' => 'Acao aprovada e executada com sucesso',
                'action' => $action->fresh(),
                'result' => $result,
            ]);

        } catch (\Exception $e) {
            $action->markAsFailed($e->getMessage());

            return response()->json([
                'error' => 'Erro ao executar acao: ' . $e->getMessage(),
                'action' => $action->fresh(),
            ], 500);
        }
    }

    /**
     * Rejeita uma acao pendente.
     */
    public function rejectAction(Request $request, SupportAction $action): JsonResponse
    {
        if (!$this->isAuthorizedSuperAdmin()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        if ($action->session->user_id !== auth()->id()) {
            return response()->json(['error' => 'Acao nao encontrada'], 404);
        }

        if (!$action->isPending()) {
            return response()->json(['error' => 'Acao ja foi processada'], 400);
        }

        $action->reject();

        return response()->json([
            'message' => 'Acao rejeitada',
            'action' => $action->fresh(),
        ]);
    }

    /**
     * Encerra uma sessao.
     */
    public function completeSession(Request $request, SupportSession $session): JsonResponse
    {
        if (!$this->isAuthorizedSuperAdmin()) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        if ($session->user_id !== auth()->id()) {
            return response()->json(['error' => 'Sessao nao encontrada'], 404);
        }

        $validated = $request->validate([
            'summary' => 'nullable|string|max:1000',
        ]);

        $session->complete($validated['summary'] ?? null);

        return response()->json([
            'message' => 'Sessao encerrada com sucesso',
            'session' => $session->fresh(),
        ]);
    }

    /**
     * Chama o AI Service para processar a mensagem.
     */
    private function callAIService(SupportSession $session, string $message): array
    {
        $aiServiceUrl = config('services.ai_service.url', 'http://localhost:8001');
        $aiServiceKey = config('services.ai_service.key', '');

        // Busca historico da conversa
        $history = $session->messages()
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn($msg) => [
                'role' => $msg->role,
                'content' => $msg->content,
                'tool_calls' => $msg->tool_calls,
            ])
            ->toArray();

        $response = Http::timeout(120)
            ->withHeaders([
                'X-Internal-Key' => $aiServiceKey,
                'Content-Type' => 'application/json',
            ])
            ->post("{$aiServiceUrl}/mcp/run", [
                'agent_type' => 'support',
                'tenant_id' => 'super_admin',
                'message' => $message,
                'conversation_history' => $history,
            ]);

        if (!$response->successful()) {
            throw new \Exception('Erro ao chamar AI Service: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Executa uma acao aprovada.
     */
    private function executeApprovedAction(SupportAction $action): array
    {
        $aiServiceUrl = config('services.ai_service.url', 'http://localhost:8001');
        $aiServiceKey = config('services.ai_service.key', '');

        $startTime = microtime(true);

        $response = Http::timeout(120)
            ->withHeaders([
                'X-Internal-Key' => $aiServiceKey,
                'Content-Type' => 'application/json',
            ])
            ->post("{$aiServiceUrl}/mcp/tool", [
                'tool_name' => $action->tool_name,
                'arguments' => $action->arguments,
                'tenant_id' => 'super_admin',
                'agent_type' => 'support',
            ]);

        $executionTime = (int)((microtime(true) - $startTime) * 1000);

        if (!$response->successful()) {
            throw new \Exception('Erro ao executar tool: ' . $response->body());
        }

        $result = $response->json();

        $action->markAsExecuted($result['result'] ?? [], $executionTime);

        return $result;
    }
}
