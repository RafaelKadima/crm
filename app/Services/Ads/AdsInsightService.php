<?php

namespace App\Services\Ads;

use App\Models\AdAd;
use App\Models\AdAdset;
use App\Models\AdCampaign;
use App\Models\AdInsight;
use App\Models\AdMetricsHistory;
use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdsInsightService
{
    protected string $aiServiceUrl;

    public function __construct()
    {
        $this->aiServiceUrl = config('services.ai_service.url', 'http://localhost:8001');
    }

    /**
     * Gera insights para um tenant.
     */
    public function generateInsights(Tenant $tenant): int
    {
        $count = 0;

        // Analisa campanhas ativas
        $campaigns = AdCampaign::where('tenant_id', $tenant->id)
            ->where('status', 'ACTIVE')
            ->with(['adsets.ads'])
            ->get();

        foreach ($campaigns as $campaign) {
            $count += $this->analyzeCampaign($campaign);
        }

        return $count;
    }

    /**
     * Analisa uma campanha e gera insights.
     */
    protected function analyzeCampaign(AdCampaign $campaign): int
    {
        $count = 0;

        // Detecta queda de performance
        $count += $this->detectPerformanceDrop($campaign);

        // Analisa adsets
        foreach ($campaign->adsets as $adset) {
            $count += $this->analyzeAdset($adset);
        }

        return $count;
    }

    /**
     * Analisa um adset.
     */
    protected function analyzeAdset(AdAdset $adset): int
    {
        $count = 0;

        // Detecta oportunidades de escala
        $count += $this->detectScaleOpportunity($adset);

        // Analisa ads
        foreach ($adset->ads as $ad) {
            $count += $this->analyzeAd($ad);
        }

        return $count;
    }

    /**
     * Analisa um ad individual.
     */
    protected function analyzeAd(AdAd $ad): int
    {
        $count = 0;

        // Classifica performance
        $this->classifyAdPerformance($ad);

        // Detecta ad winner
        if ($ad->performance_label === AdAd::PERF_WINNER) {
            $count += $this->createWinnerInsight($ad);
        }

        // Detecta ad underperforming
        if ($ad->performance_label === AdAd::PERF_UNDERPERFORMING) {
            $count += $this->createUnderperformingInsight($ad);
        }

        return $count;
    }

    /**
     * Detecta queda de performance.
     */
    protected function detectPerformanceDrop(AdCampaign $campaign): int
    {
        $lastWeek = AdMetricsHistory::where('entity_type', 'campaign')
            ->where('entity_id', $campaign->id)
            ->where('date', '>=', now()->subDays(7))
            ->where('date', '<', now()->subDays(3))
            ->avg('ctr');

        $last3Days = AdMetricsHistory::where('entity_type', 'campaign')
            ->where('entity_id', $campaign->id)
            ->where('date', '>=', now()->subDays(3))
            ->avg('ctr');

        if ($lastWeek && $last3Days && $lastWeek > 0) {
            $dropPercent = (($lastWeek - $last3Days) / $lastWeek) * 100;

            if ($dropPercent >= 30) {
                // Verifica se já existe insight similar recente
                $existing = AdInsight::where('tenant_id', $campaign->tenant_id)
                    ->where('entity_type', 'campaign')
                    ->where('entity_id', $campaign->id)
                    ->where('type', AdInsight::TYPE_PERFORMANCE_DROP)
                    ->where('status', AdInsight::STATUS_PENDING)
                    ->where('created_at', '>=', now()->subDays(1))
                    ->exists();

                if (!$existing) {
                    AdInsight::create([
                        'tenant_id' => $campaign->tenant_id,
                        'entity_type' => 'campaign',
                        'entity_id' => $campaign->id,
                        'entity_name' => $campaign->name,
                        'type' => AdInsight::TYPE_PERFORMANCE_DROP,
                        'severity' => $dropPercent >= 50 ? AdInsight::SEVERITY_CRITICAL : AdInsight::SEVERITY_WARNING,
                        'title' => "Queda de CTR em {$campaign->name}",
                        'description' => "O CTR da campanha caiu {$dropPercent:.1f}% nos últimos 3 dias comparado à semana anterior.",
                        'recommendation' => 'Revise os criativos e público-alvo. Considere pausar anúncios com baixo desempenho.',
                        'data' => [
                            'previous_ctr' => $lastWeek,
                            'current_ctr' => $last3Days,
                            'drop_percent' => $dropPercent,
                        ],
                        'expires_at' => now()->addDays(7),
                    ]);

                    return 1;
                }
            }
        }

        return 0;
    }

    /**
     * Detecta oportunidade de escala.
     */
    protected function detectScaleOpportunity(AdAdset $adset): int
    {
        // CPC baixo + CTR alto = oportunidade de escala
        $avgCpc = AdMetricsHistory::where('entity_type', 'adset')
            ->where('entity_id', $adset->id)
            ->where('date', '>=', now()->subDays(7))
            ->avg('cpc');

        $avgCtr = AdMetricsHistory::where('entity_type', 'adset')
            ->where('entity_id', $adset->id)
            ->where('date', '>=', now()->subDays(7))
            ->avg('ctr');

        // Busca médias do tenant para comparação
        $tenantAvgCpc = AdMetricsHistory::where('tenant_id', $adset->tenant_id)
            ->where('entity_type', 'adset')
            ->where('date', '>=', now()->subDays(30))
            ->avg('cpc');

        $tenantAvgCtr = AdMetricsHistory::where('tenant_id', $adset->tenant_id)
            ->where('entity_type', 'adset')
            ->where('date', '>=', now()->subDays(30))
            ->avg('ctr');

        if ($avgCpc && $tenantAvgCpc && $avgCtr && $tenantAvgCtr) {
            // CPC 20% abaixo da média E CTR 20% acima da média
            if ($avgCpc < ($tenantAvgCpc * 0.8) && $avgCtr > ($tenantAvgCtr * 1.2)) {
                $existing = AdInsight::where('tenant_id', $adset->tenant_id)
                    ->where('entity_type', 'adset')
                    ->where('entity_id', $adset->id)
                    ->where('type', AdInsight::TYPE_OPPORTUNITY)
                    ->where('status', AdInsight::STATUS_PENDING)
                    ->where('created_at', '>=', now()->subDays(3))
                    ->exists();

                if (!$existing) {
                    AdInsight::create([
                        'tenant_id' => $adset->tenant_id,
                        'entity_type' => 'adset',
                        'entity_id' => $adset->id,
                        'entity_name' => $adset->name,
                        'type' => AdInsight::TYPE_OPPORTUNITY,
                        'severity' => AdInsight::SEVERITY_SUCCESS,
                        'title' => "Oportunidade de escala: {$adset->name}",
                        'description' => "Este conjunto de anúncios tem CPC abaixo da média e CTR acima da média. Potencial para aumentar orçamento.",
                        'recommendation' => 'Considere aumentar o orçamento em 20-30% para aproveitar o bom desempenho.',
                        'data' => [
                            'avg_cpc' => $avgCpc,
                            'tenant_avg_cpc' => $tenantAvgCpc,
                            'avg_ctr' => $avgCtr,
                            'tenant_avg_ctr' => $tenantAvgCtr,
                        ],
                        'suggested_action' => [
                            'type' => 'increase_budget',
                            'entity_type' => 'adset',
                            'entity_id' => $adset->id,
                            'params' => ['percent' => 20],
                        ],
                        'expires_at' => now()->addDays(5),
                    ]);

                    return 1;
                }
            }
        }

        return 0;
    }

    /**
     * Classifica performance de um ad.
     */
    protected function classifyAdPerformance(AdAd $ad): void
    {
        // Busca métricas médias do adset para comparação
        $adsetId = $ad->ad_adset_id;

        $adMetrics = AdMetricsHistory::where('entity_type', 'ad')
            ->where('entity_id', $ad->id)
            ->where('date', '>=', now()->subDays(7))
            ->selectRaw('AVG(ctr) as avg_ctr, AVG(cpc) as avg_cpc, SUM(conversions) as total_conversions, SUM(spend) as total_spend')
            ->first();

        $adsetMetrics = AdMetricsHistory::where('entity_type', 'adset')
            ->where('entity_id', $adsetId)
            ->where('date', '>=', now()->subDays(7))
            ->selectRaw('AVG(ctr) as avg_ctr, AVG(cpc) as avg_cpc')
            ->first();

        if (!$adMetrics || !$adsetMetrics || !$adsetMetrics->avg_ctr) {
            return;
        }

        $ctrRatio = $adMetrics->avg_ctr / $adsetMetrics->avg_ctr;
        $cpcRatio = $adsetMetrics->avg_cpc > 0 ? $adMetrics->avg_cpc / $adsetMetrics->avg_cpc : 1;

        // Score: CTR alto + CPC baixo = bom
        $score = ($ctrRatio * 50) + ((2 - $cpcRatio) * 50);
        $score = max(0, min(100, $score));

        $label = match(true) {
            $score >= 70 => AdAd::PERF_WINNER,
            $score >= 40 => AdAd::PERF_AVERAGE,
            default => AdAd::PERF_UNDERPERFORMING,
        };

        $ad->update([
            'performance_score' => $score,
            'performance_label' => $label,
        ]);
    }

    /**
     * Cria insight de ad winner.
     */
    protected function createWinnerInsight(AdAd $ad): int
    {
        $existing = AdInsight::where('tenant_id', $ad->tenant_id)
            ->where('entity_type', 'ad')
            ->where('entity_id', $ad->id)
            ->where('type', AdInsight::TYPE_WINNER_AD)
            ->where('status', AdInsight::STATUS_PENDING)
            ->where('created_at', '>=', now()->subDays(7))
            ->exists();

        if (!$existing) {
            AdInsight::create([
                'tenant_id' => $ad->tenant_id,
                'entity_type' => 'ad',
                'entity_id' => $ad->id,
                'entity_name' => $ad->name,
                'type' => AdInsight::TYPE_WINNER_AD,
                'severity' => AdInsight::SEVERITY_SUCCESS,
                'title' => "🏆 Anúncio vencedor: {$ad->name}",
                'description' => "Este anúncio está superando a média do conjunto com score de {$ad->performance_score}/100.",
                'recommendation' => 'Considere duplicar este anúncio em outros conjuntos ou aumentar orçamento.',
                'data' => [
                    'performance_score' => $ad->performance_score,
                    'ctr' => $ad->ctr,
                    'cpc' => $ad->cpc,
                ],
                'expires_at' => now()->addDays(7),
            ]);

            return 1;
        }

        return 0;
    }

    /**
     * Cria insight de ad underperforming.
     */
    protected function createUnderperformingInsight(AdAd $ad): int
    {
        // Só cria se o ad gastou significativamente
        if ($ad->spend < 10) {
            return 0;
        }

        $existing = AdInsight::where('tenant_id', $ad->tenant_id)
            ->where('entity_type', 'ad')
            ->where('entity_id', $ad->id)
            ->where('type', AdInsight::TYPE_SUGGESTION)
            ->where('status', AdInsight::STATUS_PENDING)
            ->where('created_at', '>=', now()->subDays(3))
            ->exists();

        if (!$existing) {
            AdInsight::create([
                'tenant_id' => $ad->tenant_id,
                'entity_type' => 'ad',
                'entity_id' => $ad->id,
                'entity_name' => $ad->name,
                'type' => AdInsight::TYPE_SUGGESTION,
                'severity' => AdInsight::SEVERITY_WARNING,
                'title' => "Recomendação: Pausar {$ad->name}",
                'description' => "Este anúncio está abaixo da média com score de {$ad->performance_score}/100 e já gastou R$ " . number_format($ad->spend, 2, ',', '.'),
                'recommendation' => 'Pausar este anúncio pode melhorar o ROAS geral do conjunto.',
                'data' => [
                    'performance_score' => $ad->performance_score,
                    'ctr' => $ad->ctr,
                    'cpc' => $ad->cpc,
                    'spend' => $ad->spend,
                ],
                'suggested_action' => [
                    'type' => 'pause_ad',
                    'entity_type' => 'ad',
                    'entity_id' => $ad->id,
                    'params' => [],
                ],
                'expires_at' => now()->addDays(3),
            ]);

            return 1;
        }

        return 0;
    }

    /**
     * Chama AI Service para análise avançada.
     */
    public function analyzeWithAI(string $tenantId, array $metricsData): array
    {
        try {
            $response = Http::timeout(30)->post("{$this->aiServiceUrl}/ads/analyze-performance", [
                'tenant_id' => $tenantId,
                'metrics' => $metricsData,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning('AI analysis failed', [
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return [];

        } catch (\Exception $e) {
            Log::error('AI analysis error', [
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }
}

