<?php

namespace App\Services\Ads;

use App\Models\AdAccount;
use App\Models\AdAd;
use App\Models\AdAdset;
use App\Models\AdCampaign;
use App\Models\AdMetricsHistory;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaAdsService
{
    protected string $baseUrl = 'https://graph.facebook.com/v18.0';

    /**
     * Conecta uma conta Meta Ads.
     */
    public function connectAccount(string $tenantId, string $accessToken): array
    {
        try {
            // Busca informações das contas de anúncio do usuário
            $response = Http::get("{$this->baseUrl}/me/adaccounts", [
                'access_token' => $accessToken,
                'fields' => 'id,name,account_id,currency,timezone_name,account_status',
            ]);

            if (!$response->successful()) {
                throw new \Exception($response->json('error.message', 'Erro ao conectar conta Meta'));
            }

            $accounts = $response->json('data', []);
            $createdAccounts = [];

            foreach ($accounts as $accountData) {
                $account = AdAccount::updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'platform' => AdAccount::PLATFORM_META,
                        'platform_account_id' => $accountData['account_id'],
                    ],
                    [
                        'name' => $accountData['name'],
                        'platform_account_name' => $accountData['name'],
                        'access_token' => $accessToken,
                        'currency' => $accountData['currency'] ?? 'BRL',
                        'timezone' => $accountData['timezone_name'] ?? 'America/Sao_Paulo',
                        'status' => $accountData['account_status'] == 1 ? AdAccount::STATUS_ACTIVE : AdAccount::STATUS_PAUSED,
                        'metadata' => $accountData,
                        'last_sync_at' => now(),
                    ]
                );

                $createdAccounts[] = $account;
            }

            return [
                'success' => true,
                'accounts' => $createdAccounts,
                'count' => count($createdAccounts),
            ];

        } catch (\Exception $e) {
            Log::error('Meta Ads connect error', [
                'tenant_id' => $tenantId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Sincroniza campanhas de uma conta.
     */
    public function syncCampaigns(AdAccount $account): Collection
    {
        $response = Http::get("{$this->baseUrl}/act_{$account->platform_account_id}/campaigns", [
            'access_token' => $account->access_token,
            'fields' => 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time',
            'limit' => 500,
        ]);

        if (!$response->successful()) {
            $account->markAsError($response->json('error.message', 'Erro desconhecido'));
            throw new \Exception($response->json('error.message', 'Erro ao sincronizar campanhas'));
        }

        $campaigns = collect();
        $campaignsData = $response->json('data', []);

        foreach ($campaignsData as $data) {
            $campaign = AdCampaign::updateOrCreate(
                [
                    'ad_account_id' => $account->id,
                    'platform_campaign_id' => $data['id'],
                ],
                [
                    'tenant_id' => $account->tenant_id,
                    'name' => $data['name'],
                    'objective' => $data['objective'] ?? null,
                    'status' => $data['status'] ?? 'UNKNOWN',
                    'daily_budget' => isset($data['daily_budget']) ? $data['daily_budget'] / 100 : null,
                    'lifetime_budget' => isset($data['lifetime_budget']) ? $data['lifetime_budget'] / 100 : null,
                    'budget_type' => isset($data['daily_budget']) ? 'daily' : 'lifetime',
                    'start_date' => isset($data['start_time']) ? Carbon::parse($data['start_time'])->toDateString() : null,
                    'end_date' => isset($data['stop_time']) ? Carbon::parse($data['stop_time'])->toDateString() : null,
                    'metadata' => $data,
                    'last_sync_at' => now(),
                ]
            );

            $campaigns->push($campaign);
        }

        return $campaigns;
    }

    /**
     * Sincroniza adsets de uma campanha.
     */
    public function syncAdsets(AdCampaign $campaign): Collection
    {
        $account = $campaign->account;

        $response = Http::get("{$this->baseUrl}/{$campaign->platform_campaign_id}/adsets", [
            'access_token' => $account->access_token,
            'fields' => 'id,name,status,daily_budget,lifetime_budget,bid_strategy,bid_amount,start_time,end_time,targeting,optimization_goal',
            'limit' => 500,
        ]);

        if (!$response->successful()) {
            throw new \Exception($response->json('error.message', 'Erro ao sincronizar adsets'));
        }

        $adsets = collect();
        $adsetsData = $response->json('data', []);

        foreach ($adsetsData as $data) {
            $adset = AdAdset::updateOrCreate(
                [
                    'ad_campaign_id' => $campaign->id,
                    'platform_adset_id' => $data['id'],
                ],
                [
                    'tenant_id' => $campaign->tenant_id,
                    'name' => $data['name'],
                    'status' => $data['status'] ?? 'UNKNOWN',
                    'daily_budget' => isset($data['daily_budget']) ? $data['daily_budget'] / 100 : null,
                    'lifetime_budget' => isset($data['lifetime_budget']) ? $data['lifetime_budget'] / 100 : null,
                    'bid_strategy' => $data['bid_strategy'] ?? null,
                    'bid_amount' => isset($data['bid_amount']) ? $data['bid_amount'] / 100 : null,
                    'start_date' => isset($data['start_time']) ? Carbon::parse($data['start_time'])->toDateString() : null,
                    'end_date' => isset($data['end_time']) ? Carbon::parse($data['end_time'])->toDateString() : null,
                    'targeting' => $data['targeting'] ?? null,
                    'optimization_goal' => $data['optimization_goal'] ?? null,
                    'metadata' => $data,
                    'last_sync_at' => now(),
                ]
            );

            $adsets->push($adset);
        }

        return $adsets;
    }

    /**
     * Sincroniza ads de um adset.
     */
    public function syncAds(AdAdset $adset): Collection
    {
        $campaign = $adset->campaign;
        $account = $campaign->account;

        $response = Http::get("{$this->baseUrl}/{$adset->platform_adset_id}/ads", [
            'access_token' => $account->access_token,
            'fields' => 'id,name,status,creative{title,body,call_to_action_type,link_url,image_url,thumbnail_url},preview_shareable_link',
            'limit' => 500,
        ]);

        if (!$response->successful()) {
            throw new \Exception($response->json('error.message', 'Erro ao sincronizar ads'));
        }

        $ads = collect();
        $adsData = $response->json('data', []);

        foreach ($adsData as $data) {
            $creative = $data['creative'] ?? [];

            $ad = AdAd::updateOrCreate(
                [
                    'ad_adset_id' => $adset->id,
                    'platform_ad_id' => $data['id'],
                ],
                [
                    'tenant_id' => $adset->tenant_id,
                    'name' => $data['name'],
                    'status' => $data['status'] ?? 'UNKNOWN',
                    'headline' => $creative['title'] ?? null,
                    'description' => $creative['body'] ?? null,
                    'call_to_action' => $creative['call_to_action_type'] ?? null,
                    'destination_url' => $creative['link_url'] ?? null,
                    'preview_url' => $data['preview_shareable_link'] ?? null,
                    'metadata' => $data,
                    'last_sync_at' => now(),
                ]
            );

            $ads->push($ad);
        }

        return $ads;
    }

    /**
     * Busca métricas de uma entidade.
     */
    public function fetchMetrics(string $entityId, string $entityType, AdAccount $account, Carbon $date): array
    {
        $response = Http::get("{$this->baseUrl}/{$entityId}/insights", [
            'access_token' => $account->access_token,
            'time_range' => json_encode([
                'since' => $date->toDateString(),
                'until' => $date->toDateString(),
            ]),
            'fields' => 'spend,impressions,clicks,reach,frequency,actions,action_values,ctr,cpc,cpm,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions',
        ]);

        if (!$response->successful()) {
            throw new \Exception($response->json('error.message', 'Erro ao buscar métricas'));
        }

        $data = $response->json('data.0', []);

        // Extrai conversões e valor das actions
        $conversions = 0;
        $conversionValue = 0;

        if (isset($data['actions'])) {
            foreach ($data['actions'] as $action) {
                if (in_array($action['action_type'], ['purchase', 'lead', 'complete_registration'])) {
                    $conversions += (int) $action['value'];
                }
            }
        }

        if (isset($data['action_values'])) {
            foreach ($data['action_values'] as $actionValue) {
                if ($actionValue['action_type'] === 'purchase') {
                    $conversionValue += (float) $actionValue['value'];
                }
            }
        }

        // Video views
        $videoViews25 = $this->extractVideoViews($data, 'video_p25_watched_actions');
        $videoViews50 = $this->extractVideoViews($data, 'video_p50_watched_actions');
        $videoViews75 = $this->extractVideoViews($data, 'video_p75_watched_actions');
        $videoViews100 = $this->extractVideoViews($data, 'video_p100_watched_actions');

        $spend = (float) ($data['spend'] ?? 0);
        $impressions = (int) ($data['impressions'] ?? 0);
        $clicks = (int) ($data['clicks'] ?? 0);

        return [
            'spend' => $spend,
            'impressions' => $impressions,
            'clicks' => $clicks,
            'reach' => (int) ($data['reach'] ?? 0),
            'frequency' => (float) ($data['frequency'] ?? 0),
            'conversions' => $conversions,
            'conversion_value' => $conversionValue,
            'ctr' => (float) ($data['ctr'] ?? 0),
            'cpc' => (float) ($data['cpc'] ?? 0),
            'cpm' => (float) ($data['cpm'] ?? 0),
            'roas' => $spend > 0 ? $conversionValue / $spend : 0,
            'cost_per_conversion' => $conversions > 0 ? $spend / $conversions : 0,
            'video_views_25' => $videoViews25,
            'video_views_50' => $videoViews50,
            'video_views_75' => $videoViews75,
            'video_views_100' => $videoViews100,
        ];
    }

    /**
     * Pausa um anúncio.
     */
    public function pauseAd(AdAd $ad): bool
    {
        return $this->updateAdStatus($ad, 'PAUSED');
    }

    /**
     * Ativa um anúncio.
     */
    public function resumeAd(AdAd $ad): bool
    {
        return $this->updateAdStatus($ad, 'ACTIVE');
    }

    /**
     * Atualiza status de um anúncio.
     */
    protected function updateAdStatus(AdAd $ad, string $status): bool
    {
        $account = $ad->account;

        $response = Http::post("{$this->baseUrl}/{$ad->platform_ad_id}", [
            'access_token' => $account->access_token,
            'status' => $status,
        ]);

        if (!$response->successful()) {
            throw new \Exception($response->json('error.message', 'Erro ao atualizar status do anúncio'));
        }

        $ad->update(['status' => $status]);

        return true;
    }

    /**
     * Atualiza orçamento de um adset.
     */
    public function updateBudget(AdAdset $adset, float $newBudget, string $budgetType = 'daily'): bool
    {
        $account = $adset->campaign->account;
        $budgetField = $budgetType === 'daily' ? 'daily_budget' : 'lifetime_budget';

        $response = Http::post("{$this->baseUrl}/{$adset->platform_adset_id}", [
            'access_token' => $account->access_token,
            $budgetField => (int) ($newBudget * 100), // Meta usa centavos
        ]);

        if (!$response->successful()) {
            throw new \Exception($response->json('error.message', 'Erro ao atualizar orçamento'));
        }

        $adset->update([
            $budgetField === 'daily_budget' ? 'daily_budget' : 'lifetime_budget' => $newBudget,
        ]);

        return true;
    }

    /**
     * Duplica um adset.
     */
    public function duplicateAdset(AdAdset $adset): ?AdAdset
    {
        $account = $adset->campaign->account;

        $response = Http::post("{$this->baseUrl}/{$adset->platform_adset_id}/copies", [
            'access_token' => $account->access_token,
            'deep_copy' => true,
            'status_option' => 'PAUSED',
        ]);

        if (!$response->successful()) {
            throw new \Exception($response->json('error.message', 'Erro ao duplicar adset'));
        }

        $newAdsetId = $response->json('copied_adset_id');

        if (!$newAdsetId) {
            return null;
        }

        // Busca dados do novo adset
        $detailsResponse = Http::get("{$this->baseUrl}/{$newAdsetId}", [
            'access_token' => $account->access_token,
            'fields' => 'id,name,status,daily_budget,lifetime_budget,bid_strategy,bid_amount,targeting,optimization_goal',
        ]);

        if (!$detailsResponse->successful()) {
            return null;
        }

        $data = $detailsResponse->json();

        return AdAdset::create([
            'tenant_id' => $adset->tenant_id,
            'ad_campaign_id' => $adset->ad_campaign_id,
            'platform_adset_id' => $data['id'],
            'name' => $data['name'],
            'status' => $data['status'] ?? 'PAUSED',
            'daily_budget' => isset($data['daily_budget']) ? $data['daily_budget'] / 100 : null,
            'lifetime_budget' => isset($data['lifetime_budget']) ? $data['lifetime_budget'] / 100 : null,
            'bid_strategy' => $data['bid_strategy'] ?? null,
            'bid_amount' => isset($data['bid_amount']) ? $data['bid_amount'] / 100 : null,
            'targeting' => $data['targeting'] ?? null,
            'optimization_goal' => $data['optimization_goal'] ?? null,
            'metadata' => $data,
            'last_sync_at' => now(),
        ]);
    }

    /**
     * Testa conexão com uma conta.
     */
    public function testConnection(AdAccount $account): bool
    {
        $response = Http::get("{$this->baseUrl}/act_{$account->platform_account_id}", [
            'access_token' => $account->access_token,
            'fields' => 'id,name',
        ]);

        return $response->successful();
    }

    /**
     * Sincroniza todas as métricas de uma conta para um dia.
     */
    public function syncAccountMetrics(AdAccount $account, Carbon $date): int
    {
        $count = 0;

        // Campanhas
        foreach ($account->campaigns as $campaign) {
            try {
                $metrics = $this->fetchMetrics(
                    $campaign->platform_campaign_id,
                    'campaign',
                    $account,
                    $date
                );

                $this->saveMetrics($campaign->tenant_id, 'campaign', $campaign->id, $date, $metrics);
                $this->updateEntityMetrics($campaign, $metrics);
                $count++;
            } catch (\Exception $e) {
                Log::warning('Failed to sync campaign metrics', [
                    'campaign_id' => $campaign->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Adsets
            foreach ($campaign->adsets as $adset) {
                try {
                    $metrics = $this->fetchMetrics(
                        $adset->platform_adset_id,
                        'adset',
                        $account,
                        $date
                    );

                    $this->saveMetrics($adset->tenant_id, 'adset', $adset->id, $date, $metrics);
                    $this->updateEntityMetrics($adset, $metrics);
                    $count++;
                } catch (\Exception $e) {
                    Log::warning('Failed to sync adset metrics', [
                        'adset_id' => $adset->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                // Ads
                foreach ($adset->ads as $ad) {
                    try {
                        $metrics = $this->fetchMetrics(
                            $ad->platform_ad_id,
                            'ad',
                            $account,
                            $date
                        );

                        $this->saveMetrics($ad->tenant_id, 'ad', $ad->id, $date, $metrics);
                        $this->updateEntityMetrics($ad, $metrics);
                        $count++;
                    } catch (\Exception $e) {
                        Log::warning('Failed to sync ad metrics', [
                            'ad_id' => $ad->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
        }

        $account->markAsSynced();

        return $count;
    }

    /**
     * Salva métricas no histórico.
     */
    protected function saveMetrics(string $tenantId, string $entityType, string $entityId, Carbon $date, array $metrics): void
    {
        AdMetricsHistory::updateOrCreate(
            [
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'date' => $date->toDateString(),
            ],
            array_merge(['tenant_id' => $tenantId], $metrics)
        );
    }

    /**
     * Atualiza métricas snapshot da entidade.
     */
    protected function updateEntityMetrics($entity, array $metrics): void
    {
        $entity->update([
            'spend' => $metrics['spend'],
            'impressions' => $metrics['impressions'],
            'clicks' => $metrics['clicks'],
            'conversions' => $metrics['conversions'],
            'ctr' => $metrics['ctr'],
            'cpc' => $metrics['cpc'],
            'cpm' => $metrics['cpm'],
            'roas' => $metrics['roas'],
        ]);
    }

    /**
     * Extrai views de vídeo.
     */
    protected function extractVideoViews(array $data, string $key): int
    {
        if (!isset($data[$key])) {
            return 0;
        }

        foreach ($data[$key] as $view) {
            if ($view['action_type'] === 'video_view') {
                return (int) $view['value'];
            }
        }

        return 0;
    }
}

