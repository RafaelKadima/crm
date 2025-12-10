<?php

namespace App\Http\Controllers;

use App\Models\AdInsight;
use App\Services\Ads\AdsAutomationService;
use App\Services\Ads\MetaAdsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdInsightController extends Controller
{
    protected MetaAdsService $metaAdsService;
    protected AdsAutomationService $automationService;

    public function __construct(
        MetaAdsService $metaAdsService,
        AdsAutomationService $automationService
    ) {
        $this->metaAdsService = $metaAdsService;
        $this->automationService = $automationService;
    }

    /**
     * Lista insights do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $query = AdInsight::where('tenant_id', $tenantId);

        // Filtros
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        } else {
            // Por padrão, mostra apenas pendentes não expirados
            $query->active();
        }

        if ($request->has('type')) {
            $query->where('type', $request->input('type'));
        }

        if ($request->has('severity')) {
            $query->where('severity', $request->input('severity'));
        }

        if ($request->has('entity_type')) {
            $query->where('entity_type', $request->input('entity_type'));
        }

        // Ordenação: críticos primeiro, depois por data
        $query->orderByRaw("
            CASE severity 
                WHEN 'critical' THEN 1 
                WHEN 'warning' THEN 2 
                WHEN 'success' THEN 3 
                ELSE 4 
            END
        ")->orderBy('created_at', 'desc');

        $insights = $query->paginate($request->input('per_page', 20));

        // Contadores
        $counts = [
            'total' => AdInsight::where('tenant_id', $tenantId)->active()->count(),
            'critical' => AdInsight::where('tenant_id', $tenantId)->active()->critical()->count(),
            'by_type' => AdInsight::where('tenant_id', $tenantId)
                ->active()
                ->selectRaw('type, COUNT(*) as count')
                ->groupBy('type')
                ->pluck('count', 'type'),
        ];

        return response()->json([
            'data' => $insights->items(),
            'meta' => [
                'current_page' => $insights->currentPage(),
                'last_page' => $insights->lastPage(),
                'per_page' => $insights->perPage(),
                'total' => $insights->total(),
            ],
            'counts' => $counts,
        ]);
    }

    /**
     * Exibe um insight específico.
     */
    public function show(Request $request, AdInsight $insight): JsonResponse
    {
        $this->authorize('view', $insight);

        return response()->json([
            'data' => $insight,
        ]);
    }

    /**
     * Aplica a ação sugerida de um insight.
     */
    public function apply(Request $request, AdInsight $insight): JsonResponse
    {
        $this->authorize('update', $insight);

        if (!$insight->isPending()) {
            return response()->json([
                'error' => 'Este insight já foi processado',
            ], 400);
        }

        if (!$insight->hasSuggestedAction()) {
            return response()->json([
                'error' => 'Este insight não possui ação sugerida',
            ], 400);
        }

        $action = $insight->suggested_action;
        $result = ['success' => false];

        try {
            switch ($action['type']) {
                case 'pause_ad':
                    $ad = \App\Models\AdAd::find($action['entity_id']);
                    if ($ad) {
                        $this->metaAdsService->pauseAd($ad);
                        $result = ['success' => true, 'message' => 'Anúncio pausado'];
                    }
                    break;

                case 'resume_ad':
                    $ad = \App\Models\AdAd::find($action['entity_id']);
                    if ($ad) {
                        $this->metaAdsService->resumeAd($ad);
                        $result = ['success' => true, 'message' => 'Anúncio ativado'];
                    }
                    break;

                case 'increase_budget':
                    $adset = \App\Models\AdAdset::find($action['entity_id']);
                    if ($adset) {
                        $percent = $action['params']['percent'] ?? 20;
                        $newBudget = $adset->getCurrentBudget() * (1 + ($percent / 100));
                        $this->metaAdsService->updateBudget($adset, $newBudget);
                        $result = ['success' => true, 'message' => "Orçamento aumentado em {$percent}%"];
                    }
                    break;

                case 'decrease_budget':
                    $adset = \App\Models\AdAdset::find($action['entity_id']);
                    if ($adset) {
                        $percent = $action['params']['percent'] ?? 10;
                        $newBudget = $adset->getCurrentBudget() * (1 - ($percent / 100));
                        $this->metaAdsService->updateBudget($adset, $newBudget);
                        $result = ['success' => true, 'message' => "Orçamento reduzido em {$percent}%"];
                    }
                    break;

                default:
                    return response()->json([
                        'error' => 'Tipo de ação não suportado',
                    ], 400);
            }

            if ($result['success']) {
                $insight->markAsApplied(
                    $request->user()->id,
                    $request->input('notes')
                );
            }

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao executar ação: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Dispensa um insight.
     */
    public function dismiss(Request $request, AdInsight $insight): JsonResponse
    {
        $this->authorize('update', $insight);

        if (!$insight->isPending()) {
            return response()->json([
                'error' => 'Este insight já foi processado',
            ], 400);
        }

        $insight->dismiss(
            $request->user()->id,
            $request->input('notes')
        );

        return response()->json([
            'message' => 'Insight dispensado',
        ]);
    }

    /**
     * Lista tipos de insight disponíveis.
     */
    public function types(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['id' => AdInsight::TYPE_PERFORMANCE_DROP, 'name' => 'Queda de Performance', 'icon' => 'trending-down'],
                ['id' => AdInsight::TYPE_OPPORTUNITY, 'name' => 'Oportunidade', 'icon' => 'rocket'],
                ['id' => AdInsight::TYPE_BUDGET_ALERT, 'name' => 'Alerta de Orçamento', 'icon' => 'dollar-sign'],
                ['id' => AdInsight::TYPE_WINNER_AD, 'name' => 'Anúncio Vencedor', 'icon' => 'trophy'],
                ['id' => AdInsight::TYPE_SUGGESTION, 'name' => 'Sugestão', 'icon' => 'lightbulb'],
                ['id' => AdInsight::TYPE_ANOMALY, 'name' => 'Anomalia', 'icon' => 'alert-triangle'],
            ],
        ]);
    }

    /**
     * Lista severidades disponíveis.
     */
    public function severities(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['id' => AdInsight::SEVERITY_CRITICAL, 'name' => 'Crítico', 'color' => 'red'],
                ['id' => AdInsight::SEVERITY_WARNING, 'name' => 'Aviso', 'color' => 'yellow'],
                ['id' => AdInsight::SEVERITY_INFO, 'name' => 'Informação', 'color' => 'blue'],
                ['id' => AdInsight::SEVERITY_SUCCESS, 'name' => 'Sucesso', 'color' => 'green'],
            ],
        ]);
    }
}

