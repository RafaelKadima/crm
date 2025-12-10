<?php

namespace App\Http\Controllers;

use App\Models\AdAutomationLog;
use App\Models\AdAutomationRule;
use App\Services\Ads\AdsAutomationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdAutomationController extends Controller
{
    protected AdsAutomationService $automationService;

    public function __construct(AdsAutomationService $automationService)
    {
        $this->automationService = $automationService;
    }

    /**
     * Lista regras de automação do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $query = AdAutomationRule::where('tenant_id', $tenantId)
            ->with('account:id,name,platform')
            ->withCount('logs');

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->has('scope')) {
            $query->where('scope', $request->input('scope'));
        }

        $rules = $query->orderByPriority()->get();

        return response()->json([
            'data' => $rules,
        ]);
    }

    /**
     * Exibe uma regra específica.
     */
    public function show(Request $request, AdAutomationRule $rule): JsonResponse
    {
        $this->authorize('view', $rule);

        $rule->load(['account', 'logs' => function ($query) {
            $query->orderBy('created_at', 'desc')->limit(10);
        }]);

        return response()->json([
            'data' => $rule,
        ]);
    }

    /**
     * Cria uma nova regra.
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'ad_account_id' => 'nullable|uuid|exists:ad_accounts,id',
            'scope' => ['required', Rule::in(['account', 'campaign', 'adset', 'ad'])],
            'scope_id' => 'nullable|uuid',
            
            // Condição
            'condition.metric' => ['required', Rule::in(array_keys(AdAutomationRule::METRICS))],
            'condition.operator' => ['required', Rule::in(AdAutomationRule::OPERATORS)],
            'condition.value' => 'required|numeric',
            'condition.duration_days' => 'required|integer|min:1|max:30',
            'condition.aggregation' => ['sometimes', Rule::in(['avg', 'sum', 'min', 'max', 'last'])],
            
            // Ação
            'action.type' => ['required', Rule::in([
                'pause_ad', 'resume_ad', 'increase_budget', 
                'decrease_budget', 'duplicate_adset', 'create_alert'
            ])],
            'action.params' => 'sometimes|array',
            'action.params.percent' => 'sometimes|integer|min:1|max:100',
            'action.params.message' => 'sometimes|string|max:500',
            
            // Configuração
            'frequency' => ['required', Rule::in(['hourly', 'daily', 'weekly'])],
            'cooldown_hours' => 'sometimes|integer|min:1|max:168',
            'max_executions_per_day' => 'nullable|integer|min:1',
            'requires_approval' => 'sometimes|boolean',
            'priority' => 'sometimes|integer|min:0|max:100',
        ]);

        $validated['tenant_id'] = $tenantId;
        $validated['is_active'] = true;

        // Estrutura os dados de condição e ação
        $validated['condition'] = [
            'metric' => $validated['condition']['metric'],
            'operator' => $validated['condition']['operator'],
            'value' => $validated['condition']['value'],
            'duration_days' => $validated['condition']['duration_days'],
            'aggregation' => $validated['condition']['aggregation'] ?? 'avg',
        ];

        $validated['action'] = [
            'type' => $validated['action']['type'],
            'params' => $validated['action']['params'] ?? [],
        ];

        $rule = AdAutomationRule::create($validated);

        return response()->json([
            'message' => 'Regra criada com sucesso',
            'data' => $rule,
        ], 201);
    }

    /**
     * Atualiza uma regra.
     */
    public function update(Request $request, AdAutomationRule $rule): JsonResponse
    {
        $this->authorize('update', $rule);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'ad_account_id' => 'nullable|uuid|exists:ad_accounts,id',
            'scope' => ['sometimes', Rule::in(['account', 'campaign', 'adset', 'ad'])],
            'scope_id' => 'nullable|uuid',
            
            'condition.metric' => ['sometimes', Rule::in(array_keys(AdAutomationRule::METRICS))],
            'condition.operator' => ['sometimes', Rule::in(AdAutomationRule::OPERATORS)],
            'condition.value' => 'sometimes|numeric',
            'condition.duration_days' => 'sometimes|integer|min:1|max:30',
            'condition.aggregation' => ['sometimes', Rule::in(['avg', 'sum', 'min', 'max', 'last'])],
            
            'action.type' => ['sometimes', Rule::in([
                'pause_ad', 'resume_ad', 'increase_budget', 
                'decrease_budget', 'duplicate_adset', 'create_alert'
            ])],
            'action.params' => 'sometimes|array',
            
            'frequency' => ['sometimes', Rule::in(['hourly', 'daily', 'weekly'])],
            'cooldown_hours' => 'sometimes|integer|min:1|max:168',
            'max_executions_per_day' => 'nullable|integer|min:1',
            'requires_approval' => 'sometimes|boolean',
            'priority' => 'sometimes|integer|min:0|max:100',
        ]);

        // Atualiza condição se fornecida
        if (isset($validated['condition'])) {
            $validated['condition'] = array_merge(
                $rule->condition ?? [],
                $validated['condition']
            );
        }

        // Atualiza ação se fornecida
        if (isset($validated['action'])) {
            $validated['action'] = array_merge(
                $rule->action ?? [],
                $validated['action']
            );
        }

        $rule->update($validated);

        return response()->json([
            'message' => 'Regra atualizada com sucesso',
            'data' => $rule->fresh(),
        ]);
    }

    /**
     * Remove uma regra.
     */
    public function destroy(Request $request, AdAutomationRule $rule): JsonResponse
    {
        $this->authorize('delete', $rule);

        $rule->delete();

        return response()->json([
            'message' => 'Regra removida com sucesso',
        ]);
    }

    /**
     * Ativa/desativa uma regra.
     */
    public function toggle(Request $request, AdAutomationRule $rule): JsonResponse
    {
        $this->authorize('update', $rule);

        $rule->update([
            'is_active' => !$rule->is_active,
        ]);

        return response()->json([
            'message' => $rule->is_active ? 'Regra ativada' : 'Regra desativada',
            'is_active' => $rule->is_active,
        ]);
    }

    /**
     * Lista logs de execução.
     */
    public function logs(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $query = AdAutomationLog::where('tenant_id', $tenantId)
            ->with('rule:id,name');

        // Filtros
        if ($request->has('rule_id')) {
            $query->where('ad_automation_rule_id', $request->input('rule_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('action_type')) {
            $query->where('action_type', $request->input('action_type'));
        }

        $logs = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 20));

        return response()->json($logs);
    }

    /**
     * Faz rollback de uma ação.
     */
    public function rollback(Request $request, AdAutomationLog $log): JsonResponse
    {
        // Verifica se pertence ao tenant
        if ($log->tenant_id !== $request->user()->tenant_id) {
            abort(403);
        }

        if (!$log->canRollback()) {
            return response()->json([
                'error' => 'Esta ação não pode ser revertida',
            ], 400);
        }

        $success = $this->automationService->rollback($log, $request->user()->id);

        if ($success) {
            return response()->json([
                'message' => 'Ação revertida com sucesso',
            ]);
        }

        return response()->json([
            'error' => 'Falha ao reverter ação',
        ], 500);
    }

    /**
     * Aprova uma ação pendente.
     */
    public function approve(Request $request, AdAutomationLog $log): JsonResponse
    {
        if ($log->tenant_id !== $request->user()->tenant_id) {
            abort(403);
        }

        if (!$log->isPendingApproval()) {
            return response()->json([
                'error' => 'Esta ação não está pendente de aprovação',
            ], 400);
        }

        $success = $this->automationService->approveAction($log, $request->user()->id);

        if ($success) {
            return response()->json([
                'message' => 'Ação aprovada e executada',
            ]);
        }

        return response()->json([
            'error' => 'Falha ao executar ação',
        ], 500);
    }

    /**
     * Rejeita uma ação pendente.
     */
    public function reject(Request $request, AdAutomationLog $log): JsonResponse
    {
        if ($log->tenant_id !== $request->user()->tenant_id) {
            abort(403);
        }

        if (!$log->isPendingApproval()) {
            return response()->json([
                'error' => 'Esta ação não está pendente de aprovação',
            ], 400);
        }

        $this->automationService->rejectAction($log);

        return response()->json([
            'message' => 'Ação rejeitada',
        ]);
    }

    /**
     * Lista métricas disponíveis para regras.
     */
    public function metrics(): JsonResponse
    {
        return response()->json([
            'data' => collect(AdAutomationRule::METRICS)->map(function ($name, $key) {
                return ['id' => $key, 'name' => $name];
            })->values(),
        ]);
    }

    /**
     * Lista ações disponíveis.
     */
    public function actions(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['id' => 'pause_ad', 'name' => 'Pausar Anúncio', 'icon' => 'pause', 'has_params' => false],
                ['id' => 'resume_ad', 'name' => 'Ativar Anúncio', 'icon' => 'play', 'has_params' => false],
                ['id' => 'increase_budget', 'name' => 'Aumentar Orçamento', 'icon' => 'trending-up', 'has_params' => true, 'params' => ['percent']],
                ['id' => 'decrease_budget', 'name' => 'Reduzir Orçamento', 'icon' => 'trending-down', 'has_params' => true, 'params' => ['percent']],
                ['id' => 'duplicate_adset', 'name' => 'Duplicar Conjunto', 'icon' => 'copy', 'has_params' => false],
                ['id' => 'create_alert', 'name' => 'Criar Alerta', 'icon' => 'bell', 'has_params' => true, 'params' => ['message']],
            ],
        ]);
    }
}

