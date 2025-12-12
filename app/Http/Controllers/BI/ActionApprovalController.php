<?php

namespace App\Http\Controllers\BI;

use App\Http\Controllers\Controller;
use App\Models\BiSuggestedAction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ActionApprovalController extends Controller
{
    /**
     * Lista ações pendentes de aprovação.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;

        $query = BiSuggestedAction::where('tenant_id', $tenantId)
            ->with('analysis')
            ->orderByRaw("CASE 
                WHEN priority = 'critical' THEN 1
                WHEN priority = 'high' THEN 2
                WHEN priority = 'medium' THEN 3
                ELSE 4
            END")
            ->orderByDesc('created_at');

        // Filtros
        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            $query->pending()->notExpired();
        }

        if ($request->has('target_agent')) {
            $query->forAgent($request->target_agent);
        }

        if ($request->has('priority')) {
            $query->withPriority($request->priority);
        }

        $actions = $query->paginate($request->get('per_page', 20));

        // Adiciona contagem por prioridade
        $countByPriority = BiSuggestedAction::countPendingByPriority($tenantId);

        return response()->json([
            'actions' => $actions,
            'count_by_priority' => $countByPriority,
            'total_pending' => array_sum($countByPriority),
        ]);
    }

    /**
     * Detalhes de uma ação.
     */
    public function show(string $id): JsonResponse
    {
        $action = BiSuggestedAction::where('tenant_id', auth()->user()->tenant_id)
            ->with(['analysis', 'approvedByUser', 'rejectedByUser'])
            ->findOrFail($id);

        return response()->json($action);
    }

    /**
     * Aprova uma ação.
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $action = BiSuggestedAction::where('tenant_id', auth()->user()->tenant_id)
            ->pending()
            ->findOrFail($id);

        // Verifica se expirou
        if ($action->isExpired()) {
            return response()->json([
                'error' => 'Esta ação expirou e não pode mais ser aprovada.',
            ], 422);
        }

        // Aprova
        $action->approve(auth()->id());

        // Executa automaticamente se configurado
        $autoExecute = $request->get('auto_execute', true);
        if ($autoExecute) {
            $executionResult = $this->executeAction($action);
            
            return response()->json([
                'message' => 'Ação aprovada e executada',
                'action' => $action->fresh(),
                'execution_result' => $executionResult,
            ]);
        }

        return response()->json([
            'message' => 'Ação aprovada',
            'action' => $action->fresh(),
        ]);
    }

    /**
     * Rejeita uma ação.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $action = BiSuggestedAction::where('tenant_id', auth()->user()->tenant_id)
            ->pending()
            ->findOrFail($id);

        $action->reject(auth()->id(), $validated['reason']);

        return response()->json([
            'message' => 'Ação rejeitada',
            'action' => $action->fresh(),
        ]);
    }

    /**
     * Executa uma ação aprovada manualmente.
     */
    public function execute(string $id): JsonResponse
    {
        $action = BiSuggestedAction::where('tenant_id', auth()->user()->tenant_id)
            ->where('status', BiSuggestedAction::STATUS_APPROVED)
            ->findOrFail($id);

        $result = $this->executeAction($action);

        return response()->json([
            'message' => 'Ação executada',
            'action' => $action->fresh(),
            'result' => $result,
        ]);
    }

    /**
     * Edita payload da ação antes de aprovar.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'action_payload' => 'nullable|array',
            'expected_impact' => 'nullable|array',
            'priority' => 'nullable|string|in:low,medium,high,critical',
        ]);

        $action = BiSuggestedAction::where('tenant_id', auth()->user()->tenant_id)
            ->pending()
            ->findOrFail($id);

        $action->update($validated);

        return response()->json([
            'message' => 'Ação atualizada',
            'action' => $action->fresh(),
        ]);
    }

    /**
     * Estatísticas de ações.
     */
    public function stats(): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;

        $stats = [
            'pending' => BiSuggestedAction::where('tenant_id', $tenantId)
                ->pending()
                ->notExpired()
                ->count(),
            'approved_today' => BiSuggestedAction::where('tenant_id', $tenantId)
                ->where('status', BiSuggestedAction::STATUS_APPROVED)
                ->whereDate('approved_at', today())
                ->count(),
            'executed_today' => BiSuggestedAction::where('tenant_id', $tenantId)
                ->where('status', BiSuggestedAction::STATUS_EXECUTED)
                ->whereDate('executed_at', today())
                ->count(),
            'rejected_today' => BiSuggestedAction::where('tenant_id', $tenantId)
                ->where('status', BiSuggestedAction::STATUS_REJECTED)
                ->whereDate('rejected_at', today())
                ->count(),
            'by_agent' => BiSuggestedAction::where('tenant_id', $tenantId)
                ->pending()
                ->selectRaw('target_agent, COUNT(*) as count')
                ->groupBy('target_agent')
                ->pluck('count', 'target_agent'),
            'by_priority' => BiSuggestedAction::countPendingByPriority($tenantId),
        ];

        return response()->json($stats);
    }

    /**
     * Executa ação via MCP.
     */
    private function executeAction(BiSuggestedAction $action): array
    {
        try {
            $response = Http::timeout(60)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'execute_approved_action',
                'arguments' => [
                    'tenant_id' => $action->tenant_id,
                    'action_id' => $action->id,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $action->tenant_id,
            ]);

            if ($response->successful()) {
                $result = $response->json()['result'] ?? [];
                
                $action->markExecuted($result, auth()->id());
                
                return $result;
            }

            $error = ['error' => 'Falha na execução', 'response' => $response->json()];
            $action->markFailed($error);
            
            return $error;

        } catch (\Exception $e) {
            $error = ['error' => $e->getMessage()];
            $action->markFailed($error);
            
            \Log::error('Erro ao executar ação BI', [
                'action_id' => $action->id,
                'error' => $e->getMessage(),
            ]);

            return $error;
        }
    }
}

