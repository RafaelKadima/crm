<?php

namespace App\Http\Controllers;

use App\Models\AdAccount;
use App\Models\AdAdset;
use App\Models\AdAd;
use App\Models\AdCampaign;
use App\Services\Ads\MetaAdsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdAgentController extends Controller
{
    protected MetaAdsService $metaAdsService;

    public function __construct(MetaAdsService $metaAdsService)
    {
        $this->metaAdsService = $metaAdsService;
    }

    /**
     * Cria uma campanha completa via Agente de IA.
     * 
     * Recebe a estrutura completa (campanha + adsets + ads) e cria
     * tudo na plataforma (Meta ou Google).
     */
    public function createCampaign(Request $request)
    {
        $validated = $request->validate([
            'tenant_id' => 'required|string',
            'ad_account_id' => 'required|string|exists:ad_accounts,id',
            'platform' => 'string|in:meta,google',
            'campaign' => 'required|array',
            'campaign.name' => 'required|string',
            'campaign.objective' => 'required|string',
            'campaign.status' => 'string',
            'campaign.daily_budget' => 'required|numeric|min:1',
            'campaign.bid_strategy' => 'string',
            'adsets' => 'array',
            'ads' => 'array',
        ]);

        $account = AdAccount::findOrFail($validated['ad_account_id']);

        // Verifica se a conta pertence ao tenant
        if ($account->tenant_id !== $validated['tenant_id']) {
            return response()->json(['error' => 'Conta não pertence ao tenant'], 403);
        }

        DB::beginTransaction();

        try {
            $platform = $validated['platform'] ?? 'meta';
            
            if ($platform === 'meta') {
                $result = $this->createMetaCampaign($account, $validated);
            } else {
                $result = $this->createGoogleCampaign($account, $validated);
            }

            DB::commit();

            Log::info('Campaign created via Agent', [
                'tenant_id' => $validated['tenant_id'],
                'campaign_id' => $result['campaign']->id ?? null,
                'platform' => $platform,
            ]);

            return response()->json([
                'success' => true,
                'campaign' => $result['campaign'],
                'adsets' => $result['adsets'] ?? [],
                'ads' => $result['ads'] ?? [],
                'platform_response' => $result['platform_response'] ?? null,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Failed to create campaign via Agent', [
                'error' => $e->getMessage(),
                'tenant_id' => $validated['tenant_id'],
            ]);

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cria campanha no Meta Ads.
     */
    protected function createMetaCampaign(AdAccount $account, array $data): array
    {
        $campaignData = $data['campaign'];
        
        // 1. Cria a campanha no Meta
        $metaCampaign = $this->metaAdsService->createCampaign($account, [
            'name' => $campaignData['name'],
            'objective' => $this->mapObjectiveToMeta($campaignData['objective']),
            'status' => $campaignData['status'] ?? 'PAUSED',
            'special_ad_categories' => [],
        ]);

        // Salva no banco local
        $campaign = AdCampaign::create([
            'tenant_id' => $data['tenant_id'],
            'ad_account_id' => $account->id,
            'platform_campaign_id' => $metaCampaign['id'] ?? null,
            'name' => $campaignData['name'],
            'objective' => $campaignData['objective'],
            'status' => $campaignData['status'] ?? 'PAUSED',
            'daily_budget' => $campaignData['daily_budget'],
            'budget_type' => 'daily',
            'metadata' => [
                'created_by' => 'agent',
                'bid_strategy' => $campaignData['bid_strategy'] ?? null,
                'platform_response' => $metaCampaign,
            ],
        ]);

        $createdAdsets = [];
        $createdAds = [];

        // 2. Cria os adsets
        foreach ($data['adsets'] ?? [] as $adsetData) {
            $metaAdset = $this->metaAdsService->createAdset($campaign, [
                'name' => $adsetData['name'],
                'optimization_goal' => $adsetData['optimization_goal'] ?? 'LINK_CLICKS',
                'billing_event' => $adsetData['billing_event'] ?? 'IMPRESSIONS',
                'bid_amount' => ($campaignData['daily_budget'] * 100) / 10, // Estimativa
                'daily_budget' => $campaignData['daily_budget'] * 100, // Em centavos
                'targeting' => $this->formatMetaTargeting($adsetData['targeting'] ?? []),
                'status' => 'PAUSED',
            ]);

            $adset = AdAdset::create([
                'tenant_id' => $data['tenant_id'],
                'ad_campaign_id' => $campaign->id,
                'platform_adset_id' => $metaAdset['id'] ?? null,
                'name' => $adsetData['name'],
                'status' => 'PAUSED',
                'daily_budget' => $campaignData['daily_budget'],
                'optimization_goal' => $adsetData['optimization_goal'] ?? 'LINK_CLICKS',
                'targeting' => $adsetData['targeting'] ?? [],
                'metadata' => [
                    'created_by' => 'agent',
                    'platform_response' => $metaAdset,
                ],
            ]);

            $createdAdsets[] = $adset;

            // 3. Cria os ads para cada adset
            foreach ($data['ads'] ?? [] as $adData) {
                $creative = $adData['creative'] ?? [];
                
                $metaAd = $this->metaAdsService->createAd($adset, [
                    'name' => $adData['name'],
                    'creative' => [
                        'title' => $creative['headline'] ?? '',
                        'body' => $creative['primary_text'] ?? '',
                        'description' => $creative['description'] ?? '',
                        'call_to_action_type' => $this->mapCtaToMeta($creative['call_to_action'] ?? 'LEARN_MORE'),
                        'link_url' => $creative['link_url'] ?? '',
                        'image_url' => $creative['image_url'] ?? null,
                    ],
                    'status' => 'PAUSED',
                ]);

                $ad = AdAd::create([
                    'tenant_id' => $data['tenant_id'],
                    'ad_adset_id' => $adset->id,
                    'platform_ad_id' => $metaAd['id'] ?? null,
                    'name' => $adData['name'],
                    'status' => 'PAUSED',
                    'headline' => $creative['headline'] ?? null,
                    'description' => $creative['primary_text'] ?? null,
                    'call_to_action' => $creative['call_to_action'] ?? null,
                    'destination_url' => $creative['link_url'] ?? null,
                    'metadata' => [
                        'created_by' => 'agent',
                        'creative' => $creative,
                        'platform_response' => $metaAd,
                    ],
                ]);

                $createdAds[] = $ad;
            }
        }

        return [
            'campaign' => $campaign,
            'adsets' => $createdAdsets,
            'ads' => $createdAds,
            'platform_response' => $metaCampaign,
        ];
    }

    /**
     * Cria campanha no Google Ads.
     */
    protected function createGoogleCampaign(AdAccount $account, array $data): array
    {
        // TODO: Implementar integração com Google Ads API
        // Por enquanto, apenas salva localmente
        
        $campaignData = $data['campaign'];

        $campaign = AdCampaign::create([
            'tenant_id' => $data['tenant_id'],
            'ad_account_id' => $account->id,
            'name' => $campaignData['name'],
            'objective' => $campaignData['campaign_type'] ?? 'CONVERSIONS',
            'status' => 'PAUSED',
            'daily_budget' => $campaignData['budget'] ?? $campaignData['daily_budget'],
            'budget_type' => 'daily',
            'metadata' => [
                'created_by' => 'agent',
                'platform' => 'google',
                'pending_api_creation' => true,
            ],
        ]);

        Log::info('Google campaign saved locally (pending API creation)', [
            'campaign_id' => $campaign->id,
        ]);

        return [
            'campaign' => $campaign,
            'adsets' => [],
            'ads' => [],
            'platform_response' => ['status' => 'pending_api_integration'],
        ];
    }

    /**
     * Mapeia objetivo para formato do Meta.
     */
    protected function mapObjectiveToMeta(string $objective): string
    {
        return match(strtoupper($objective)) {
            'CONVERSIONS', 'OUTCOME_SALES' => 'OUTCOME_SALES',
            'TRAFFIC', 'OUTCOME_TRAFFIC' => 'OUTCOME_TRAFFIC',
            'AWARENESS', 'OUTCOME_AWARENESS' => 'OUTCOME_AWARENESS',
            'LEADS', 'LEAD_GENERATION', 'OUTCOME_LEADS' => 'OUTCOME_LEADS',
            'ENGAGEMENT', 'OUTCOME_ENGAGEMENT' => 'OUTCOME_ENGAGEMENT',
            default => 'OUTCOME_TRAFFIC',
        };
    }

    /**
     * Mapeia CTA para formato do Meta.
     */
    protected function mapCtaToMeta(string $cta): string
    {
        return match(strtoupper($cta)) {
            'LEARN_MORE', 'SAIBA_MAIS' => 'LEARN_MORE',
            'SHOP_NOW', 'COMPRE_AGORA' => 'SHOP_NOW',
            'SIGN_UP', 'CADASTRE_SE' => 'SIGN_UP',
            'CONTACT_US', 'ENTRE_EM_CONTATO' => 'CONTACT_US',
            'DOWNLOAD' => 'DOWNLOAD',
            'GET_OFFER', 'OBTER_OFERTA' => 'GET_OFFER',
            'BOOK_NOW', 'RESERVE_AGORA' => 'BOOK_NOW',
            'SUBSCRIBE' => 'SUBSCRIBE',
            default => 'LEARN_MORE',
        };
    }

    /**
     * Formata targeting para o Meta.
     */
    protected function formatMetaTargeting(array $targeting): array
    {
        $formatted = [];

        if (isset($targeting['age_min'])) {
            $formatted['age_min'] = $targeting['age_min'];
        }

        if (isset($targeting['age_max'])) {
            $formatted['age_max'] = $targeting['age_max'];
        }

        if (!empty($targeting['genders'])) {
            $formatted['genders'] = array_map(function ($g) {
                return $g === 'male' ? 1 : 2;
            }, $targeting['genders']);
        }

        if (!empty($targeting['geo_locations'])) {
            $countries = [];
            $regions = [];
            
            foreach ($targeting['geo_locations'] as $loc) {
                if ($loc['type'] === 'country') {
                    $countries[] = $loc['value'];
                } elseif ($loc['type'] === 'region') {
                    $regions[] = ['key' => $loc['value']];
                }
            }

            $formatted['geo_locations'] = [
                'countries' => $countries ?: ['BR'],
                'regions' => $regions,
            ];
        } else {
            $formatted['geo_locations'] = ['countries' => ['BR']];
        }

        if (!empty($targeting['interests'])) {
            $formatted['interests'] = $targeting['interests'];
        }

        if (!empty($targeting['behaviors'])) {
            $formatted['behaviors'] = $targeting['behaviors'];
        }

        return $formatted;
    }

    /**
     * Retorna relatório completo de uma campanha.
     */
    public function getCampaignFullReport(Request $request, string $campaignId)
    {
        $campaign = AdCampaign::with(['adsets.ads', 'account', 'metricsHistory'])
            ->findOrFail($campaignId);

        // Verifica permissão
        if ($campaign->tenant_id !== $request->header('X-Tenant-ID')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Calcula métricas totais
        $totals = $campaign->metricsHistory()
            ->selectRaw('
                SUM(spend) as total_spend,
                SUM(impressions) as total_impressions,
                SUM(clicks) as total_clicks,
                SUM(conversions) as total_conversions,
                AVG(ctr) as avg_ctr,
                AVG(cpc) as avg_cpc,
                AVG(roas) as avg_roas
            ')
            ->first();

        // Métricas por anúncio
        $adMetrics = [];
        foreach ($campaign->adsets as $adset) {
            foreach ($adset->ads as $ad) {
                $adMetrics[] = [
                    'ad_id' => $ad->id,
                    'ad_name' => $ad->name,
                    'adset_name' => $adset->name,
                    'status' => $ad->status,
                    'spend' => $ad->spend,
                    'impressions' => $ad->impressions,
                    'clicks' => $ad->clicks,
                    'conversions' => $ad->conversions,
                    'ctr' => $ad->ctr,
                    'cpc' => $ad->cpc,
                    'roas' => $ad->roas,
                    'performance_score' => $ad->performance_score,
                    'performance_label' => $ad->performance_label,
                ];
            }
        }

        return response()->json([
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'objective' => $campaign->objective,
                'status' => $campaign->status,
                'daily_budget' => $campaign->daily_budget,
                'created_at' => $campaign->created_at,
            ],
            'account' => [
                'id' => $campaign->account->id,
                'name' => $campaign->account->name,
                'platform' => $campaign->account->platform,
            ],
            'totals' => $totals,
            'ads' => $adMetrics,
            'adsets_count' => $campaign->adsets->count(),
            'ads_count' => $campaign->adsets->sum(fn($a) => $a->ads->count()),
        ]);
    }

    /**
     * Retorna anúncios de uma campanha.
     */
    public function getCampaignAds(Request $request, string $campaignId)
    {
        $campaign = AdCampaign::with(['adsets.ads'])
            ->findOrFail($campaignId);

        if ($campaign->tenant_id !== $request->header('X-Tenant-ID')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $ads = [];
        foreach ($campaign->adsets as $adset) {
            foreach ($adset->ads as $ad) {
                $ads[] = [
                    'id' => $ad->id,
                    'name' => $ad->name,
                    'status' => $ad->status,
                    'headline' => $ad->headline,
                    'description' => $ad->description,
                    'call_to_action' => $ad->call_to_action,
                    'spend' => $ad->spend,
                    'impressions' => $ad->impressions,
                    'clicks' => $ad->clicks,
                    'conversions' => $ad->conversions,
                    'ctr' => $ad->ctr,
                    'cpc' => $ad->cpc,
                    'roas' => $ad->roas,
                    'performance_score' => $ad->performance_score,
                    'performance_label' => $ad->performance_label,
                    'adset' => [
                        'id' => $adset->id,
                        'name' => $adset->name,
                    ],
                ];
            }
        }

        return response()->json([
            'data' => $ads,
            'count' => count($ads),
        ]);
    }
}

