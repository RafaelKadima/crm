<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\AdCampaign;
use App\Models\AgentActionLog;

class AdsInternalController extends Controller
{
    public function optimizeCampaign(Request $request, $id): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        if (!$tenantId)
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);

        $campaign = AdCampaign::where('tenant_id', $tenantId)->find($id);

        if (!$campaign) {
            // Se não encontrar, retorna 404
            return response()->json(['error' => 'Campaign not found'], 404);
        }

        $optimizationType = $request->input('optimization_type');
        $params = $request->input('parameters', []);

        // Logica mockada de otimização
        // Em produção, isso chamaria a API do Facebook/Google ou ajustaria parametros locais

        AgentActionLog::create([
            'tenant_id' => $tenantId,
            'agent_type' => 'ads',
            'action_type' => 'optimize_campaign',
            'target_id' => $id,
            'input_data' => array_merge(['type' => $optimizationType], $params),
            'status' => 'completed',
            'success' => true
        ]);

        return response()->json([
            'success' => true,
            'message' => "Campaign {$id} optimized with type {$optimizationType}",
            'campaign' => $campaign->name
        ]);
    }

    public function getCampaignReport(Request $request, $id): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID') ?? $request->header('X-Internal-Key'); // Allow internal key or tenant

        // Se for request interno via Internal Key, tenant_id vem no header X-Tenant-ID também
        $tenantId = $request->header('X-Tenant-ID');

        $campaign = AdCampaign::with(['adsets.ads.creative'])
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$campaign) {
            return response()->json(['error' => 'Campaign not found'], 404);
        }

        // Formata os dados para o Agente
        $report = [
            'id' => $campaign->id,
            'name' => $campaign->name,
            'objective' => $campaign->objective,
            'status' => $campaign->status,
            'metrics' => [
                'spend' => $campaign->spend,
                'impressions' => $campaign->impressions,
                'clicks' => $campaign->clicks,
                'ctr' => $campaign->ctr,
                'cpc' => $campaign->cpc,
                'roas' => $campaign->roas,
                'conversions' => $campaign->conversions,
            ],
            'ads' => []
        ];

        foreach ($campaign->adsets as $adset) {
            foreach ($adset->ads as $ad) {
                $creativeUrl = $ad->creative ? $ad->creative->getMediaUrl() : ($ad->preview_url ?? null);

                $report['ads'][] = [
                    'id' => $ad->id,
                    'name' => $ad->name,
                    'adset_name' => $adset->name,
                    'status' => $ad->status,
                    'performance_score' => $ad->performance_score,
                    'performance_label' => $ad->performance_label,
                    'metrics' => [
                        'ctr' => $ad->ctr,
                        'cpc' => $ad->cpc,
                        'roas' => $ad->roas,
                        'spend' => $ad->spend,
                        'conversions' => $ad->conversions,
                    ],
                    'creative' => [
                        'type' => $ad->creative ? $ad->creative->type : 'unknown',
                        'image_url' => $creativeUrl,
                        'headline' => $ad->headline,
                        'primary_text' => $ad->primary_text,
                    ]
                ];
            }
        }

        return response()->json($report);
    }
}
