<?php

namespace App\Http\Controllers;

use App\Models\AdGuardrail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdsGuardrailController extends Controller
{
    /**
     * Lista guardrails do tenant
     */
    public function index(Request $request): JsonResponse
    {
        $query = AdGuardrail::where('tenant_id', auth()->user()->tenant_id);
        
        // Filtro por tipo
        if ($request->has('rule_type')) {
            $query->where('rule_type', $request->rule_type);
        }
        
        // Filtro por escopo
        if ($request->has('scope')) {
            $query->where('scope', $request->scope);
        }
        
        // Filtro por status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        
        $guardrails = $query->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));
        
        return response()->json($guardrails);
    }
    
    /**
     * Cria novo guardrail
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'rule_type' => 'required|string|in:budget_limit,approval_required,time_restriction,objective_allowed,creative_rules,audience_rules,daily_spend_limit,cpa_threshold',
            'scope' => 'required|string|in:campaign,adset,ad,account,all',
            'conditions' => 'required|array',
            'action' => 'required|array',
            'action.type' => 'required|string|in:block,warn,require_approval,modify,notify',
            'action.message' => 'required|string|max:500',
            'priority' => 'nullable|integer|min:0|max:200',
        ]);
        
        $guardrail = AdGuardrail::create([
            'tenant_id' => auth()->user()->tenant_id,
            'name' => $request->name,
            'description' => $request->description,
            'rule_type' => $request->rule_type,
            'scope' => $request->scope,
            'conditions' => $request->conditions,
            'action' => $request->action,
            'priority' => $request->input('priority', 50),
            'is_active' => $request->input('is_active', true),
            'is_system' => false,
        ]);
        
        return response()->json([
            'message' => 'Guardrail criado com sucesso',
            'data' => $guardrail,
        ], 201);
    }
    
    /**
     * Exibe detalhes de um guardrail
     */
    public function show(AdGuardrail $guardrail): JsonResponse
    {
        $this->authorize('view', $guardrail);
        
        return response()->json($guardrail);
    }
    
    /**
     * Atualiza guardrail
     */
    public function update(Request $request, AdGuardrail $guardrail): JsonResponse
    {
        $this->authorize('update', $guardrail);
        
        // Não permite editar guardrails do sistema
        if ($guardrail->is_system) {
            return response()->json([
                'message' => 'Guardrails do sistema não podem ser editados',
            ], 403);
        }
        
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string|max:1000',
            'conditions' => 'sometimes|array',
            'action' => 'sometimes|array',
            'action.type' => 'sometimes|string|in:block,warn,require_approval,modify,notify',
            'action.message' => 'sometimes|string|max:500',
            'priority' => 'sometimes|integer|min:0|max:200',
            'is_active' => 'sometimes|boolean',
        ]);
        
        $guardrail->update($request->only([
            'name', 'description', 'conditions', 'action', 'priority', 'is_active'
        ]));
        
        return response()->json([
            'message' => 'Guardrail atualizado com sucesso',
            'data' => $guardrail->fresh(),
        ]);
    }
    
    /**
     * Remove guardrail
     */
    public function destroy(AdGuardrail $guardrail): JsonResponse
    {
        $this->authorize('delete', $guardrail);
        
        // Não permite excluir guardrails do sistema
        if ($guardrail->is_system) {
            return response()->json([
                'message' => 'Guardrails do sistema não podem ser excluídos',
            ], 403);
        }
        
        $guardrail->delete();
        
        return response()->json([
            'message' => 'Guardrail excluído com sucesso',
        ]);
    }
    
    /**
     * Ativa/desativa guardrail
     */
    public function toggle(AdGuardrail $guardrail): JsonResponse
    {
        $this->authorize('update', $guardrail);
        
        $guardrail->update(['is_active' => !$guardrail->is_active]);
        
        return response()->json([
            'message' => $guardrail->is_active ? 'Guardrail ativado' : 'Guardrail desativado',
            'data' => $guardrail->fresh(),
        ]);
    }
    
    /**
     * Lista tipos de regras disponíveis
     */
    public function ruleTypes(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['value' => 'budget_limit', 'label' => 'Limite de Orçamento', 'description' => 'Define limites de orçamento para campanhas'],
                ['value' => 'approval_required', 'label' => 'Aprovação Obrigatória', 'description' => 'Requer aprovação antes de executar'],
                ['value' => 'time_restriction', 'label' => 'Restrição de Horário', 'description' => 'Limita ações a determinados horários'],
                ['value' => 'objective_allowed', 'label' => 'Objetivos Permitidos', 'description' => 'Define objetivos permitidos'],
                ['value' => 'creative_rules', 'label' => 'Regras de Criativos', 'description' => 'Valida criativos antes de usar'],
                ['value' => 'audience_rules', 'label' => 'Regras de Audiência', 'description' => 'Valida segmentação de público'],
                ['value' => 'daily_spend_limit', 'label' => 'Limite de Gasto Diário', 'description' => 'Limite total de gasto por dia'],
                ['value' => 'cpa_threshold', 'label' => 'Limite de CPA', 'description' => 'Alerta quando CPA excede limite'],
            ],
        ]);
    }
    
    /**
     * Lista escopos disponíveis
     */
    public function scopes(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['value' => 'campaign', 'label' => 'Campanha'],
                ['value' => 'adset', 'label' => 'Conjunto de Anúncios'],
                ['value' => 'ad', 'label' => 'Anúncio'],
                ['value' => 'account', 'label' => 'Conta'],
                ['value' => 'all', 'label' => 'Todos'],
            ],
        ]);
    }
    
    /**
     * Lista tipos de ações disponíveis
     */
    public function actionTypes(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['value' => 'block', 'label' => 'Bloquear', 'description' => 'Impede a ação completamente'],
                ['value' => 'warn', 'label' => 'Avisar', 'description' => 'Exibe aviso mas permite continuar'],
                ['value' => 'require_approval', 'label' => 'Requer Aprovação', 'description' => 'Aguarda aprovação de um gestor'],
                ['value' => 'modify', 'label' => 'Modificar', 'description' => 'Ajusta os valores automaticamente'],
                ['value' => 'notify', 'label' => 'Notificar', 'description' => 'Apenas notifica sem bloquear'],
            ],
        ]);
    }
    
    /**
     * Cria regras padrão para o tenant
     */
    public function createDefaults(): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        
        // Verifica se já existem regras
        $existingCount = AdGuardrail::where('tenant_id', $tenantId)->count();
        
        if ($existingCount > 0) {
            return response()->json([
                'message' => 'Já existem guardrails configurados',
            ], 400);
        }
        
        AdGuardrail::createDefaultRules($tenantId);
        
        return response()->json([
            'message' => 'Guardrails padrão criados com sucesso',
        ]);
    }
    
    /**
     * Testa um guardrail contra dados simulados
     */
    public function test(Request $request, AdGuardrail $guardrail): JsonResponse
    {
        $this->authorize('view', $guardrail);
        
        $request->validate([
            'test_data' => 'required|array',
        ]);
        
        $testData = $request->test_data;
        
        // Adiciona contexto de horário
        $testData['hour'] = $testData['hour'] ?? now()->hour;
        $testData['weekday'] = $testData['weekday'] ?? now()->weekday();
        
        $triggered = $guardrail->checkConditions($testData);
        
        return response()->json([
            'triggered' => $triggered,
            'action_type' => $triggered ? $guardrail->getActionType() : null,
            'message' => $triggered ? $guardrail->getActionMessage() : 'Guardrail não acionado',
            'test_data' => $testData,
            'conditions' => $guardrail->conditions,
        ]);
    }
}
