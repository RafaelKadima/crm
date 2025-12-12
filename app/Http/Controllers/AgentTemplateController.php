<?php

namespace App\Http\Controllers;

use App\Models\AgentTemplate;
use App\Models\SdrAgent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgentTemplateController extends Controller
{
    /**
     * Lista todos os templates disponíveis
     */
    public function index(Request $request): JsonResponse
    {
        $query = AgentTemplate::active();

        if ($request->has('category')) {
            $query->byCategory($request->category);
        }

        $templates = $query->get()->map(function ($template) {
            return [
                'id' => $template->id,
                'name' => $template->name,
                'category' => $template->category,
                'category_name' => $template->getCategoryName(),
                'category_icon' => $template->getCategoryIcon(),
                'description' => $template->description,
                'icon' => $template->icon,
                'color' => $template->color,
                'recommended_stages' => $template->recommended_stages,
            ];
        });

        return response()->json([
            'data' => $templates,
            'categories' => AgentTemplate::getCategories(),
        ]);
    }

    /**
     * Retorna detalhes de um template
     */
    public function show(AgentTemplate $agentTemplate): JsonResponse
    {
        return response()->json([
            'data' => [
                'id' => $agentTemplate->id,
                'name' => $agentTemplate->name,
                'category' => $agentTemplate->category,
                'category_name' => $agentTemplate->getCategoryName(),
                'category_icon' => $agentTemplate->getCategoryIcon(),
                'description' => $agentTemplate->description,
                'system_prompt' => $agentTemplate->system_prompt,
                'personality' => $agentTemplate->personality,
                'objectives' => $agentTemplate->objectives,
                'restrictions' => $agentTemplate->restrictions,
                'pipeline_instructions' => $agentTemplate->pipeline_instructions,
                'recommended_stages' => $agentTemplate->recommended_stages,
                'example_rules' => $agentTemplate->example_rules,
                'settings' => $agentTemplate->settings,
                'icon' => $agentTemplate->icon,
                'color' => $agentTemplate->color,
            ],
        ]);
    }

    /**
     * Aplica template a um agente existente
     */
    public function apply(Request $request, AgentTemplate $agentTemplate): JsonResponse
    {
        $validated = $request->validate([
            'agent_id' => 'required|uuid|exists:sdr_agents,id',
            'overwrite' => 'boolean',
        ]);

        $agent = SdrAgent::findOrFail($validated['agent_id']);

        // Verifica se o agente pertence ao tenant do usuário
        if ($agent->tenant_id !== $request->user()->tenant_id) {
            return response()->json(['message' => 'Agente não encontrado'], 404);
        }

        $overwrite = $validated['overwrite'] ?? false;
        $agentTemplate->applyToAgent($agent, $overwrite);

        return response()->json([
            'message' => 'Template aplicado com sucesso',
            'data' => $agent->fresh(),
        ]);
    }

    /**
     * Cria um novo agente a partir do template
     */
    public function createFromTemplate(Request $request, AgentTemplate $agentTemplate): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'language' => 'nullable|string|max:10',
            'tone' => 'nullable|string|max:50',
        ]);

        $agent = $agentTemplate->createAgent(
            $request->user()->tenant_id,
            $validated
        );

        return response()->json([
            'message' => 'Agente criado com sucesso',
            'data' => $agent,
        ], 201);
    }
}





