<?php

namespace App\Http\Controllers;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PipelineController extends Controller
{
    /**
     * Lista pipelines.
     */
    public function index(): JsonResponse
    {
        $pipelines = Pipeline::with('stages')->orderBy('name')->get();

        return response()->json($pipelines);
    }

    /**
     * Cria um novo pipeline.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_default' => 'nullable|boolean',
        ]);

        $pipeline = Pipeline::create($validated);

        if ($validated['is_default'] ?? false) {
            $pipeline->setAsDefault();
        }

        $pipeline->load('stages');

        return response()->json([
            'message' => 'Pipeline criado com sucesso.',
            'pipeline' => $pipeline,
        ], 201);
    }

    /**
     * Exibe um pipeline específico.
     */
    public function show(Pipeline $pipeline): JsonResponse
    {
        $pipeline->load('stages');

        return response()->json($pipeline);
    }

    /**
     * Atualiza um pipeline.
     */
    public function update(Request $request, Pipeline $pipeline): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_default' => 'nullable|boolean',
        ]);

        $pipeline->update($validated);

        if ($validated['is_default'] ?? false) {
            $pipeline->setAsDefault();
        }

        $pipeline->load('stages');

        return response()->json([
            'message' => 'Pipeline atualizado com sucesso.',
            'pipeline' => $pipeline,
        ]);
    }

    /**
     * Remove um pipeline.
     */
    public function destroy(Pipeline $pipeline): JsonResponse
    {
        $pipeline->delete();

        return response()->json([
            'message' => 'Pipeline removido com sucesso.',
        ]);
    }

    /**
     * Lista os estágios de um pipeline.
     */
    public function stages(Pipeline $pipeline): JsonResponse
    {
        return response()->json($pipeline->stages);
    }

    /**
     * Cria um novo estágio no pipeline.
     */
    public function storeStage(Request $request, Pipeline $pipeline): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:20',
            'gtm_event_key' => 'nullable|string|max:100',
        ]);

        // Se não informou a ordem, coloca no final
        if (!isset($validated['order'])) {
            $maxOrder = $pipeline->stages()->max('order') ?? -1;
            $validated['order'] = $maxOrder + 1;
        }

        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['pipeline_id'] = $pipeline->id;

        $stage = PipelineStage::create($validated);

        return response()->json([
            'message' => 'Estágio criado com sucesso.',
            'stage' => $stage,
        ], 201);
    }

    /**
     * Atualiza um estágio do pipeline.
     */
    public function updateStage(Request $request, Pipeline $pipeline, PipelineStage $stage): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255',
            'order' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:20',
            'gtm_event_key' => 'nullable|string|max:100',
        ]);

        $stage->update($validated);

        return response()->json([
            'message' => 'Estágio atualizado com sucesso.',
            'stage' => $stage,
        ]);
    }

    /**
     * Remove um estágio do pipeline.
     */
    public function destroyStage(Pipeline $pipeline, PipelineStage $stage): JsonResponse
    {
        $stage->delete();

        return response()->json([
            'message' => 'Estágio removido com sucesso.',
        ]);
    }
}


