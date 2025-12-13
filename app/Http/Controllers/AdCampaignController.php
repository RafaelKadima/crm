<?php

namespace App\Http\Controllers;

use App\Models\AdAccount;
use App\Models\AdAd;
use App\Models\AdAdset;
use App\Models\AdCampaign;
use App\Models\AdMetricsHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdCampaignController extends Controller
{
    /**
     * Lista campanhas do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $query = AdCampaign::where('tenant_id', $tenantId)
            ->with('account:id,name,platform')
            ->withCount(['adsets', 'adsets as ads_count' => function ($query) {
                $query->withCount('ads');
            }]);

        // Filtros
        if ($request->has('account_id')) {
            $query->where('ad_account_id', $request->input('account_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->input('search') . '%');
        }

        // Ordenação
        $sortBy = $request->input('sort_by', 'spend');
        $sortDir = $request->input('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        $campaigns = $query->paginate($request->input('per_page', 20));

        return response()->json($campaigns);
    }

    /**
     * Exibe uma campanha específica.
     */
    public function show(Request $request, AdCampaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        $campaign->load(['account', 'adsets.ads']);

        return response()->json([
            'data' => $campaign,
        ]);
    }

    /**
     * Retorna métricas históricas de uma campanha.
     */
    public function metrics(Request $request, AdCampaign $campaign): JsonResponse
    {
        $this->authorize('view', $campaign);

        $days = $request->input('days', 30);

        $metrics = AdMetricsHistory::where('entity_type', 'campaign')
            ->where('entity_id', $campaign->id)
            ->where('date', '>=', now()->subDays($days))
            ->orderBy('date')
            ->get();

        // Totais do período
        $totals = [
            'spend' => $metrics->sum('spend'),
            'impressions' => $metrics->sum('impressions'),
            'clicks' => $metrics->sum('clicks'),
            'conversions' => $metrics->sum('conversions'),
            'conversion_value' => $metrics->sum('conversion_value'),
        ];

        // Médias
        $totals['ctr'] = $totals['impressions'] > 0 
            ? ($totals['clicks'] / $totals['impressions']) * 100 
            : 0;
        $totals['cpc'] = $totals['clicks'] > 0 
            ? $totals['spend'] / $totals['clicks'] 
            : 0;
        $totals['cpm'] = $totals['impressions'] > 0 
            ? ($totals['spend'] / $totals['impressions']) * 1000 
            : 0;
        $totals['roas'] = $totals['spend'] > 0 
            ? $totals['conversion_value'] / $totals['spend'] 
            : 0;

        return response()->json([
            'data' => $metrics,
            'totals' => $totals,
            'period' => [
                'days' => $days,
                'start' => now()->subDays($days)->toDateString(),
                'end' => now()->toDateString(),
            ],
        ]);
    }

    /**
     * Dashboard geral de ads.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $days = $request->input('days', 30);

        // Métricas gerais
        $metrics = AdMetricsHistory::where('tenant_id', $tenantId)
            ->where('entity_type', 'campaign')
            ->where('date', '>=', now()->subDays($days))
            ->selectRaw('
                SUM(spend) as total_spend,
                SUM(impressions) as total_impressions,
                SUM(clicks) as total_clicks,
                SUM(conversions) as total_conversions,
                SUM(conversion_value) as total_conversion_value
            ')
            ->first();

        // Métricas por dia para gráfico
        $dailyMetrics = AdMetricsHistory::where('tenant_id', $tenantId)
            ->where('entity_type', 'campaign')
            ->where('date', '>=', now()->subDays($days))
            ->selectRaw('
                date,
                SUM(spend) as spend,
                SUM(impressions) as impressions,
                SUM(clicks) as clicks,
                SUM(conversions) as conversions
            ')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Contas conectadas
        $accountsCount = AdAccount::where('tenant_id', $tenantId)->count();
        $activeAccountsCount = AdAccount::where('tenant_id', $tenantId)
            ->active()
            ->count();

        // Campanhas ativas
        $activeCampaignsCount = AdCampaign::where('tenant_id', $tenantId)
            ->active()
            ->count();

        // Top campanhas por spend
        $topCampaigns = AdCampaign::where('tenant_id', $tenantId)
            ->where('spend', '>', 0)
            ->orderBy('spend', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'spend', 'conversions', 'roas']);

        // Calcular métricas
        $ctr = $metrics->total_impressions > 0 
            ? ($metrics->total_clicks / $metrics->total_impressions) * 100 
            : 0;
        $cpc = $metrics->total_clicks > 0 
            ? $metrics->total_spend / $metrics->total_clicks 
            : 0;
        $roas = $metrics->total_spend > 0 
            ? $metrics->total_conversion_value / $metrics->total_spend 
            : 0;

        return response()->json([
            'totals' => [
                'spend' => $metrics->total_spend ?? 0,
                'impressions' => $metrics->total_impressions ?? 0,
                'clicks' => $metrics->total_clicks ?? 0,
                'conversions' => $metrics->total_conversions ?? 0,
                'conversion_value' => $metrics->total_conversion_value ?? 0,
                'ctr' => $ctr,
                'cpc' => $cpc,
                'roas' => $roas,
            ],
            'daily' => $dailyMetrics,
            'counts' => [
                'accounts' => $accountsCount,
                'active_accounts' => $activeAccountsCount,
                'active_campaigns' => $activeCampaignsCount,
            ],
            'top_campaigns' => $topCampaigns,
            'period' => [
                'days' => $days,
                'start' => now()->subDays($days)->toDateString(),
                'end' => now()->toDateString(),
            ],
        ]);
    }

    /**
     * Ranking de anúncios.
     */
    public function ranking(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $limit = $request->input('limit', 20);
        $sortBy = $request->input('sort_by', 'performance_score');

        $ads = AdAd::where('tenant_id', $tenantId)
            ->where('status', 'ACTIVE')
            ->whereNotNull('performance_score')
            ->with(['adset:id,name', 'adset.campaign:id,name'])
            ->orderBy($sortBy, 'desc')
            ->limit($limit)
            ->get([
                'id', 'name', 'ad_adset_id', 'status',
                'spend', 'impressions', 'clicks', 'conversions',
                'ctr', 'cpc', 'roas', 'performance_score', 'performance_label',
            ]);

        // Agrupa por label
        $winners = $ads->where('performance_label', AdAd::PERF_WINNER)->values();
        $average = $ads->where('performance_label', AdAd::PERF_AVERAGE)->values();
        $underperforming = $ads->where('performance_label', AdAd::PERF_UNDERPERFORMING)->values();

        return response()->json([
            'all' => $ads,
            'by_performance' => [
                'winners' => $winners,
                'average' => $average,
                'underperforming' => $underperforming,
            ],
            'counts' => [
                'winners' => $winners->count(),
                'average' => $average->count(),
                'underperforming' => $underperforming->count(),
            ],
        ]);
    }

    /**
     * Lista campanhas para uso interno (AI Service).
     * Não requer autenticação de usuário, usa X-Tenant-ID.
     */
    public function internalIndex(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        
        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $query = AdCampaign::where('tenant_id', $tenantId)
            ->with('account:id,name,platform');

        // Filtros
        if ($request->has('ad_account_id')) {
            $query->where('ad_account_id', $request->input('ad_account_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $campaigns = $query->orderBy('created_at', 'desc')
            ->get(['id', 'name', 'status', 'objective', 'spend', 'impressions', 'clicks', 'conversions', 'ctr', 'cpc', 'roas', 'ad_account_id', 'created_at']);

        return response()->json([
            'success' => true,
            'campaigns' => $campaigns,
            'total' => $campaigns->count(),
        ]);
    }
}
