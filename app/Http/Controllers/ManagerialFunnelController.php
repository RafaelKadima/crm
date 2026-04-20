<?php

namespace App\Http\Controllers;

use App\Enums\FunnelCategoryEnum;
use App\Services\ManagerialFunnel\Filters;
use App\Services\ManagerialFunnel\FunnelAggregator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerialFunnelController extends Controller
{
    private function aggregator(): FunnelAggregator
    {
        return new FunnelAggregator(auth()->user()->tenant_id);
    }

    /**
     * Funil Gerencial Unificado — o relatório principal.
     *
     * Retorna Topo (3 camadas) + Meio (por categoria universal com leads passados)
     * + Fim (won/lost/disqualified) + taxas de conversão + comparação com período anterior.
     */
    public function funnel(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'pipeline_id' => 'nullable|uuid|exists:pipelines,id',
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'owner_id' => 'nullable|uuid|exists:users,id',
            'queue_id' => 'nullable|uuid|exists:queues,id',
            'compare_to_previous' => 'nullable|boolean',
        ]);

        $filters = Filters::fromRequest($request);
        $aggregator = $this->aggregator();

        $top = $aggregator->topOfFunnel($filters);
        $byCategory = $aggregator->byCategory($filters);
        $appointments = $aggregator->appointments($filters);
        $bottom = $aggregator->bottomOfFunnel($filters);
        $conversion = $aggregator->conversionRates($byCategory);

        $previousPeriod = null;
        if ($request->boolean('compare_to_previous', true) && $filters->dateFrom && $filters->dateTo) {
            $prevFilters = FunnelAggregator::previousPeriodFilters($filters);
            $previousPeriod = [
                'top_of_funnel' => $aggregator->topOfFunnel($prevFilters),
                'by_category' => $aggregator->byCategory($prevFilters),
                'bottom_of_funnel' => $aggregator->bottomOfFunnel($prevFilters),
                'appointments' => $aggregator->appointments($prevFilters),
                'date_from' => $prevFilters->dateFrom,
                'date_to' => $prevFilters->dateTo,
            ];
        }

        return response()->json([
            'filters' => $filters->toArray(),
            'top_of_funnel' => $top,
            'by_category' => $byCategory,
            'appointments' => $appointments,
            'bottom_of_funnel' => $bottom,
            'conversion_rates' => $conversion,
            'previous_period' => $previousPeriod,
        ]);
    }

    /**
     * Drill-down: lista de leads de uma célula específica.
     */
    public function drillDown(Request $request): JsonResponse
    {
        $request->validate([
            'category' => 'required|string|in:' . implode(',', array_column(FunnelCategoryEnum::cases(), 'value')),
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'pipeline_id' => 'nullable|uuid',
            'channel_id' => 'nullable|uuid',
            'owner_id' => 'nullable|uuid',
            'limit' => 'nullable|integer|min:1|max:200',
        ]);

        $filters = Filters::fromRequest($request);
        $category = FunnelCategoryEnum::from($request->string('category'));
        $limit = (int) $request->input('limit', 50);

        $leads = $this->aggregator()->drillDown($filters, $category, $limit);

        return response()->json([
            'category' => $category->value,
            'category_label' => $category->label(),
            'count' => $leads->count(),
            'leads' => $leads,
        ]);
    }

    public function losses(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'owner_id' => 'nullable|uuid',
            'channel_id' => 'nullable|uuid',
        ]);

        $filters = Filters::fromRequest($request);
        $aggregator = $this->aggregator();

        return response()->json([
            'by_reason' => $aggregator->lossesByReason($filters),
            'heatmap' => $aggregator->lossesHeatmap($filters),
            'filters' => $filters->toArray(),
        ]);
    }

    public function velocity(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'pipeline_id' => 'nullable|uuid',
            'owner_id' => 'nullable|uuid',
        ]);

        $filters = Filters::fromRequest($request);

        return response()->json([
            'velocity' => $this->aggregator()->velocity($filters),
            'filters' => $filters->toArray(),
        ]);
    }

    public function forecast(Request $request): JsonResponse
    {
        $request->validate([
            'pipeline_id' => 'nullable|uuid',
            'owner_id' => 'nullable|uuid',
            'channel_id' => 'nullable|uuid',
        ]);

        $filters = Filters::fromRequest($request);

        return response()->json([
            'forecast' => $this->aggregator()->forecast($filters),
            'filters' => $filters->toArray(),
        ]);
    }

    public function cohort(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'pipeline_id' => 'nullable|uuid',
        ]);

        $filters = Filters::fromRequest($request);

        return response()->json([
            'cohorts' => $this->aggregator()->cohortByChannel($filters),
            'filters' => $filters->toArray(),
        ]);
    }
}
