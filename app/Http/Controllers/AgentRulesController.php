<?php

namespace App\Http\Controllers;

use App\Models\AgentEscalationRule;
use App\Models\AgentStageRule;
use App\Models\SdrAgent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentRulesController extends Controller
{
    // ==================== STAGE RULES ====================

    /**
     * Lista regras de estágio do agente
     */
    public function listStageRules(SdrAgent $sdrAgent): JsonResponse
    {
        $rules = AgentStageRule::forAgent($sdrAgent->id)
            ->with(['stage', 'autoMoveToStage'])
            ->orderByPriority()
            ->get();

        return response()->json(['data' => $rules]);
    }

    /**
     * Cria uma regra de estágio
     */
    public function storeStageRule(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'pipeline_stage_id' => 'required|uuid|exists:pipeline_stages,id',
            'trigger_condition' => 'nullable|string|max:500',
            'action_template' => 'nullable|string',
            'auto_move_to' => 'nullable|uuid|exists:pipeline_stages,id',
            'notify_human' => 'boolean',
            'notification_channel' => 'nullable|string|max:50',
            'priority' => 'integer|min:0|max:100',
        ]);

        $rule = AgentStageRule::create([
            'tenant_id' => $request->user()->tenant_id,
            'sdr_agent_id' => $sdrAgent->id,
            ...$validated,
        ]);

        return response()->json([
            'message' => 'Regra criada com sucesso',
            'data' => $rule->load(['stage', 'autoMoveToStage']),
        ], 201);
    }

    /**
     * Atualiza uma regra de estágio
     */
    public function updateStageRule(Request $request, SdrAgent $sdrAgent, AgentStageRule $agentStageRule): JsonResponse
    {
        // Verifica se a regra pertence ao agente
        if ($agentStageRule->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'Regra não encontrada'], 404);
        }

        $validated = $request->validate([
            'pipeline_stage_id' => 'uuid|exists:pipeline_stages,id',
            'trigger_condition' => 'nullable|string|max:500',
            'action_template' => 'nullable|string',
            'auto_move_to' => 'nullable|uuid|exists:pipeline_stages,id',
            'notify_human' => 'boolean',
            'notification_channel' => 'nullable|string|max:50',
            'priority' => 'integer|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        $agentStageRule->update($validated);

        return response()->json([
            'message' => 'Regra atualizada com sucesso',
            'data' => $agentStageRule->fresh()->load(['stage', 'autoMoveToStage']),
        ]);
    }

    /**
     * Remove uma regra de estágio
     */
    public function deleteStageRule(SdrAgent $sdrAgent, AgentStageRule $agentStageRule): JsonResponse
    {
        if ($agentStageRule->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'Regra não encontrada'], 404);
        }

        $agentStageRule->delete();

        return response()->json(['message' => 'Regra removida com sucesso']);
    }

    // ==================== ESCALATION RULES ====================

    /**
     * Lista regras de escalação do agente
     */
    public function listEscalationRules(SdrAgent $sdrAgent): JsonResponse
    {
        $rules = AgentEscalationRule::forAgent($sdrAgent->id)
            ->with('assignToUser')
            ->orderByPriority()
            ->get()
            ->map(function ($rule) {
                return [
                    ...$rule->toArray(),
                    'description' => $rule->getDescription(),
                ];
            });

        return response()->json([
            'data' => $rules,
            'condition_types' => [
                AgentEscalationRule::CONDITION_KEYWORD => 'Palavras-chave',
                AgentEscalationRule::CONDITION_SENTIMENT => 'Sentimento',
                AgentEscalationRule::CONDITION_TIME_IN_STAGE => 'Tempo no estágio',
                AgentEscalationRule::CONDITION_EXPLICIT_REQUEST => 'Pedido explícito',
                AgentEscalationRule::CONDITION_MESSAGE_COUNT => 'Número de mensagens',
                AgentEscalationRule::CONDITION_NO_RESPONSE => 'Sem resposta',
            ],
            'actions' => [
                AgentEscalationRule::ACTION_PAUSE_AGENT => 'Pausar agente',
                AgentEscalationRule::ACTION_NOTIFY_OWNER => 'Notificar responsável',
                AgentEscalationRule::ACTION_TRANSFER_TICKET => 'Transferir ticket',
                AgentEscalationRule::ACTION_CREATE_TASK => 'Criar tarefa',
            ],
        ]);
    }

    /**
     * Cria uma regra de escalação
     */
    public function storeEscalationRule(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'condition_type' => 'required|string|max:50',
            'condition_value' => 'required|string|max:500',
            'action' => 'required|string|max:50',
            'notification_template' => 'nullable|string',
            'assign_to_user_id' => 'nullable|uuid|exists:users,id',
            'priority' => 'integer|min:0|max:100',
        ]);

        $rule = AgentEscalationRule::create([
            'tenant_id' => $request->user()->tenant_id,
            'sdr_agent_id' => $sdrAgent->id,
            ...$validated,
        ]);

        return response()->json([
            'message' => 'Regra de escalação criada com sucesso',
            'data' => [
                ...$rule->toArray(),
                'description' => $rule->getDescription(),
            ],
        ], 201);
    }

    /**
     * Atualiza uma regra de escalação
     */
    public function updateEscalationRule(Request $request, SdrAgent $sdrAgent, AgentEscalationRule $agentEscalationRule): JsonResponse
    {
        if ($agentEscalationRule->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'Regra não encontrada'], 404);
        }

        $validated = $request->validate([
            'condition_type' => 'string|max:50',
            'condition_value' => 'string|max:500',
            'action' => 'string|max:50',
            'notification_template' => 'nullable|string',
            'assign_to_user_id' => 'nullable|uuid|exists:users,id',
            'priority' => 'integer|min:0|max:100',
            'is_active' => 'boolean',
        ]);

        $agentEscalationRule->update($validated);

        return response()->json([
            'message' => 'Regra de escalação atualizada com sucesso',
            'data' => [
                ...$agentEscalationRule->fresh()->toArray(),
                'description' => $agentEscalationRule->getDescription(),
            ],
        ]);
    }

    /**
     * Remove uma regra de escalação
     */
    public function deleteEscalationRule(SdrAgent $sdrAgent, AgentEscalationRule $agentEscalationRule): JsonResponse
    {
        if ($agentEscalationRule->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'Regra não encontrada'], 404);
        }

        $agentEscalationRule->delete();

        return response()->json(['message' => 'Regra de escalação removida com sucesso']);
    }
}




