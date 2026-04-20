<?php

namespace App\Http\Controllers;

use App\Enums\FunnelCategoryEnum;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PipelineFunnelMappingController extends Controller
{
    /**
     * Retorna stages do pipeline com sua classificação gerencial atual e
     * as categorias disponíveis para escolha.
     */
    public function show(Pipeline $pipeline): JsonResponse
    {
        $this->authorizeTenant($pipeline);

        $stages = PipelineStage::where('pipeline_id', $pipeline->id)
            ->orderBy('order')
            ->get(['id', 'name', 'slug', 'order', 'color', 'stage_type', 'funnel_category', 'probability']);

        return response()->json([
            'pipeline' => [
                'id' => $pipeline->id,
                'name' => $pipeline->name,
            ],
            'stages' => $stages,
            'available_categories' => collect(FunnelCategoryEnum::cases())->map(fn ($c) => [
                'value' => $c->value,
                'label' => $c->label(),
                'order' => $c->order(),
                'is_final' => $c->isFinal(),
            ])->values(),
        ]);
    }

    /**
     * Persiste o mapeamento: espera um array stages = [{ id, funnel_category }, ...]
     */
    public function update(Request $request, Pipeline $pipeline): JsonResponse
    {
        $this->authorizeTenant($pipeline);

        $validated = $request->validate([
            'stages' => 'required|array|min:1',
            'stages.*.id' => 'required|uuid|exists:pipeline_stages,id',
            'stages.*.funnel_category' => [
                'required',
                'string',
                Rule::in(array_column(FunnelCategoryEnum::cases(), 'value')),
            ],
        ]);

        $stageIds = collect($validated['stages'])->pluck('id')->all();

        $validStages = PipelineStage::where('pipeline_id', $pipeline->id)
            ->whereIn('id', $stageIds)
            ->pluck('id')
            ->flip();

        foreach ($validated['stages'] as $payload) {
            if (!$validStages->has($payload['id'])) {
                continue;
            }
            PipelineStage::where('id', $payload['id'])
                ->update(['funnel_category' => $payload['funnel_category']]);
        }

        return $this->show($pipeline);
    }

    private function authorizeTenant(Pipeline $pipeline): void
    {
        abort_unless($pipeline->tenant_id === auth()->user()->tenant_id, 403);
    }
}
