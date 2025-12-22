<?php

namespace App\Http\Controllers;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\StageActivityTemplate;
use App\Services\StageActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StageActivityTemplateController extends Controller
{
    public function __construct(
        protected StageActivityService $stageActivityService
    ) {}

    /**
     * Lista templates de atividade de um estágio.
     */
    public function index(Pipeline $pipeline, PipelineStage $stage): JsonResponse
    {
        $templates = StageActivityTemplate::forStage($stage->id)
            ->with('creator')
            ->get();

        return response()->json($templates);
    }

    /**
     * Cria um novo template de atividade.
     */
    public function store(Request $request, Pipeline $pipeline, PipelineStage $stage): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'activity_type' => 'required|string|in:call,email,meeting,task,demo,follow_up',
            'is_required' => 'nullable|boolean',
            'order' => 'nullable|integer|min:0',
            'default_duration_minutes' => 'nullable|integer|min:1',
            'due_days' => 'nullable|integer|min:1',
            'points' => 'nullable|integer|min:0',
        ]);

        // Se não informou a ordem, coloca no final
        if (!isset($validated['order'])) {
            $maxOrder = StageActivityTemplate::where('stage_id', $stage->id)->max('order') ?? -1;
            $validated['order'] = $maxOrder + 1;
        }

        $validated['tenant_id'] = $user->tenant_id;
        $validated['pipeline_id'] = $pipeline->id;
        $validated['stage_id'] = $stage->id;
        $validated['created_by'] = $user->id;

        $template = StageActivityTemplate::create($validated);

        return response()->json([
            'message' => 'Template de atividade criado com sucesso.',
            'template' => $template->load('creator'),
        ], 201);
    }

    /**
     * Exibe um template específico.
     */
    public function show(Pipeline $pipeline, PipelineStage $stage, StageActivityTemplate $template): JsonResponse
    {
        return response()->json($template->load('creator'));
    }

    /**
     * Atualiza um template.
     */
    public function update(Request $request, Pipeline $pipeline, PipelineStage $stage, StageActivityTemplate $template): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'activity_type' => 'nullable|string|in:call,email,meeting,task,demo,follow_up',
            'is_required' => 'nullable|boolean',
            'order' => 'nullable|integer|min:0',
            'default_duration_minutes' => 'nullable|integer|min:1',
            'due_days' => 'nullable|integer|min:1',
            'points' => 'nullable|integer|min:0',
        ]);

        $template->update($validated);

        return response()->json([
            'message' => 'Template de atividade atualizado.',
            'template' => $template->load('creator'),
        ]);
    }

    /**
     * Remove um template.
     */
    public function destroy(Pipeline $pipeline, PipelineStage $stage, StageActivityTemplate $template): JsonResponse
    {
        $template->delete();

        return response()->json([
            'message' => 'Template de atividade removido.',
        ]);
    }

    /**
     * Reordena os templates.
     */
    public function reorder(Request $request, Pipeline $pipeline, PipelineStage $stage): JsonResponse
    {
        $validated = $request->validate([
            'template_ids' => 'required|array',
            'template_ids.*' => 'required|uuid|exists:stage_activity_templates,id',
        ]);

        $this->stageActivityService->reorderTemplates($stage, $validated['template_ids']);

        return response()->json([
            'message' => 'Templates reordenados.',
        ]);
    }
}
