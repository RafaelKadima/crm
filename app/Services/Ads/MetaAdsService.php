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
            // Verifica se já existe para preservar o created_by
            $existingCampaign = AdCampaign::where('ad_account_id', $account->id)
                ->where('platform_campaign_id', $data['id'])
                ->first();

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
                    // Preserva created_by se já existir, senão marca como external
                    'created_by' => $existingCampaign?->created_by ?? AdCampaign::CREATED_BY_EXTERNAL,
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
     * Cria uma campanha no Meta Ads.
     */
    public function createCampaign(AdAccount $account, array $data): array
    {
        $payload = [
            'access_token' => $account->access_token,
            'name' => $data['name'],
            'objective' => $data['objective'],
            'status' => $data['status'] ?? 'PAUSED',
            'special_ad_categories' => json_encode($data['special_ad_categories'] ?? []),
        ];

        // CBO - Campaign Budget Optimization (orçamento na campanha)
        if (isset($data['daily_budget'])) {
            $payload['daily_budget'] = (int) ($data['daily_budget'] * 100); // Em centavos
            // Quando usa CBO, a estratégia de lance é LOWEST_COST por padrão
            $payload['bid_strategy'] = 'LOWEST_COST_WITHOUT_CAP';
        } elseif (isset($data['lifetime_budget'])) {
            $payload['lifetime_budget'] = (int) ($data['lifetime_budget'] * 100);
            $payload['bid_strategy'] = 'LOWEST_COST_WITHOUT_CAP';
        }

        $response = Http::post("{$this->baseUrl}/act_{$account->platform_account_id}/campaigns", $payload);

        if (!$response->successful()) {
            Log::error('Meta Ads createCampaign failed', [
                'account_id' => $account->id,
                'data' => $data,
                'response' => $response->json(),
            ]);
            throw new \Exception($response->json('error.message', 'Erro ao criar campanha no Meta'));
        }

        return $response->json();
    }

    /**
     * Cria um adset (conjunto de anúncios) no Meta Ads.
     */
    public function createAdset(AdCampaign $campaign, array $data): array
    {
        $account = $campaign->account;

        $payload = [
            'access_token' => $account->access_token,
            'campaign_id' => $campaign->platform_campaign_id,
            'name' => $data['name'],
            'optimization_goal' => $data['optimization_goal'] ?? 'LINK_CLICKS',
            'billing_event' => $data['billing_event'] ?? 'IMPRESSIONS',
            'status' => $data['status'] ?? 'PAUSED',
        ];

        // Budget no adset (apenas se NÃO estiver usando CBO na campanha)
        if (isset($data['daily_budget'])) {
            $payload['daily_budget'] = (int) $data['daily_budget'];
            // Se tem budget no adset, precisa de bid_strategy
            $payload['bid_strategy'] = $data['bid_strategy'] ?? 'LOWEST_COST_WITHOUT_CAP';
        }
        if (isset($data['lifetime_budget'])) {
            $payload['lifetime_budget'] = (int) $data['lifetime_budget'];
            $payload['bid_strategy'] = $data['bid_strategy'] ?? 'LOWEST_COST_WITHOUT_CAP';
        }

        // Bid amount (apenas para estratégias que exigem)
        if (isset($data['bid_amount'])) {
            $payload['bid_amount'] = (int) $data['bid_amount'];
        }

        // Targeting - precisa ser JSON encoded
        if (isset($data['targeting'])) {
            $payload['targeting'] = json_encode($data['targeting']);
        }

        $response = Http::post("{$this->baseUrl}/act_{$account->platform_account_id}/adsets", $payload);

        if (!$response->successful()) {
            Log::error('Meta Ads createAdset failed', [
                'campaign_id' => $campaign->id,
                'data' => $data,
                'response' => $response->json(),
            ]);
            throw new \Exception($response->json('error.message', 'Erro ao criar adset no Meta'));
        }

        return $response->json();
    }

    /**
     * Cria um anúncio no Meta Ads.
     */
    public function createAd(AdAdset $adset, array $data): array
    {
        $account = $adset->campaign->account;

        // Primeiro cria o creative
        $creativePayload = [
            'access_token' => $account->access_token,
            'name' => $data['creative']['headline'] ?? $data['name'],
            'object_story_spec' => [
                'page_id' => $data['page_id'] ?? $account->metadata['page_id'] ?? null,
                'link_data' => [
                    'message' => $data['creative']['primary_text'] ?? '',
                    'link' => $data['creative']['link_url'] ?? '',
                    'name' => $data['creative']['headline'] ?? '',
                    'description' => $data['creative']['description'] ?? '',
                    'call_to_action' => [
                        'type' => $data['creative']['call_to_action'] ?? 'LEARN_MORE',
                    ],
                ],
            ],
        ];

        // Adiciona imagem se fornecida
        if (!empty($data['creative']['image_hash'])) {
            $creativePayload['object_story_spec']['link_data']['image_hash'] = $data['creative']['image_hash'];
        } elseif (!empty($data['creative']['image_url'])) {
            $creativePayload['object_story_spec']['link_data']['picture'] = $data['creative']['image_url'];
        }

        $creativeResponse = Http::post("{$this->baseUrl}/act_{$account->platform_account_id}/adcreatives", $creativePayload);

        if (!$creativeResponse->successful()) {
            Log::error('Meta Ads createAdCreative failed', [
                'adset_id' => $adset->id,
                'data' => $creativePayload,
                'response' => $creativeResponse->json(),
            ]);
            throw new \Exception($creativeResponse->json('error.message', 'Erro ao criar creative no Meta'));
        }

        $creativeId = $creativeResponse->json('id');

        // Depois cria o ad
        $adPayload = [
            'access_token' => $account->access_token,
            'adset_id' => $adset->platform_adset_id,
            'name' => $data['name'],
            'creative' => ['creative_id' => $creativeId],
            'status' => $data['status'] ?? 'PAUSED',
        ];

        $response = Http::post("{$this->baseUrl}/act_{$account->platform_account_id}/ads", $adPayload);

        if (!$response->successful()) {
            Log::error('Meta Ads createAd failed', [
                'adset_id' => $adset->id,
                'data' => $adPayload,
                'response' => $response->json(),
            ]);
            throw new \Exception($response->json('error.message', 'Erro ao criar anúncio no Meta'));
        }

        return array_merge($response->json(), ['creative_id' => $creativeId]);
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

    /**
     * Busca insights da conta de anúncios diretamente da API do Meta.
     */
    public function fetchAccountInsights(AdAccount $account, string $datePreset = 'last_7d'): array
    {
        $response = Http::get("{$this->baseUrl}/act_{$account->platform_account_id}/insights", [
            'access_token' => $account->access_token,
            'date_preset' => $datePreset,
            'fields' => 'spend,impressions,clicks,reach,frequency,actions,action_values,ctr,cpc,cpm',
        ]);

        if (!$response->successful()) {
            throw new \Exception($response->json('error.message', 'Erro ao buscar insights da conta'));
        }

        $data = $response->json('data.0', []);

        // Extrai conversões e valor
        $conversions = 0;
        $conversionValue = 0;

        if (isset($data['actions'])) {
            foreach ($data['actions'] as $action) {
                if (in_array($action['action_type'], ['purchase', 'lead', 'complete_registration', 'omni_purchase'])) {
                    $conversions += (int) $action['value'];
                }
            }
        }

        if (isset($data['action_values'])) {
            foreach ($data['action_values'] as $actionValue) {
                if (in_array($actionValue['action_type'], ['purchase', 'omni_purchase'])) {
                    $conversionValue += (float) $actionValue['value'];
                }
            }
        }

        $spend = (float) ($data['spend'] ?? 0);

        // Conta campanhas ativas
        $campaignsResponse = Http::get("{$this->baseUrl}/act_{$account->platform_account_id}/campaigns", [
            'access_token' => $account->access_token,
            'fields' => 'id',
            'filtering' => json_encode([['field' => 'effective_status', 'operator' => 'IN', 'value' => ['ACTIVE']]]),
            'limit' => 500,
        ]);
        
        $campaignsActive = count($campaignsResponse->json('data', []));

        return [
            'spend' => $spend,
            'impressions' => (int) ($data['impressions'] ?? 0),
            'clicks' => (int) ($data['clicks'] ?? 0),
            'reach' => (int) ($data['reach'] ?? 0),
            'frequency' => (float) ($data['frequency'] ?? 0),
            'ctr' => (float) ($data['ctr'] ?? 0),
            'cpc' => (float) ($data['cpc'] ?? 0),
            'cpm' => (float) ($data['cpm'] ?? 0),
            'conversions' => $conversions,
            'conversion_value' => $conversionValue,
            'roas' => $spend > 0 ? round($conversionValue / $spend, 2) : 0,
            'cost_per_conversion' => $conversions > 0 ? round($spend / $conversions, 2) : 0,
            'campaigns_active' => $campaignsActive,
        ];
    }

    /**
     * Busca campanhas com insights diretamente da API do Meta.
     */
    public function fetchCampaignsWithInsights(AdAccount $account, string $datePreset = 'last_7d'): array
    {
        // Busca campanhas
        $campaignsResponse = Http::get("{$this->baseUrl}/act_{$account->platform_account_id}/campaigns", [
            'access_token' => $account->access_token,
            'fields' => 'id,name,status,objective,effective_status,daily_budget,lifetime_budget',
            'limit' => 100,
        ]);

        if (!$campaignsResponse->successful()) {
            throw new \Exception($campaignsResponse->json('error.message', 'Erro ao buscar campanhas'));
        }

        $campaigns = $campaignsResponse->json('data', []);
        $result = [];

        foreach ($campaigns as $campaign) {
            // Busca insights de cada campanha
            try {
                $insightsResponse = Http::get("{$this->baseUrl}/{$campaign['id']}/insights", [
                    'access_token' => $account->access_token,
                    'date_preset' => $datePreset,
                    'fields' => 'spend,impressions,clicks,reach,actions,action_values,ctr,cpc,cpm',
                ]);

                $insights = $insightsResponse->json('data.0', []);

                // Extrai conversões
                $conversions = 0;
                $conversionValue = 0;

                if (isset($insights['actions'])) {
                    foreach ($insights['actions'] as $action) {
                        if (in_array($action['action_type'], ['purchase', 'lead', 'complete_registration', 'omni_purchase'])) {
                            $conversions += (int) $action['value'];
                        }
                    }
                }

                if (isset($insights['action_values'])) {
                    foreach ($insights['action_values'] as $actionValue) {
                        if (in_array($actionValue['action_type'], ['purchase', 'omni_purchase'])) {
                            $conversionValue += (float) $actionValue['value'];
                        }
                    }
                }

                $spend = (float) ($insights['spend'] ?? 0);

                $result[] = [
                    'id' => $campaign['id'],
                    'name' => $campaign['name'],
                    'status' => $campaign['effective_status'] ?? $campaign['status'],
                    'objective' => $campaign['objective'] ?? null,
                    'daily_budget' => isset($campaign['daily_budget']) ? (float) $campaign['daily_budget'] / 100 : null,
                    'spend' => $spend,
                    'impressions' => (int) ($insights['impressions'] ?? 0),
                    'clicks' => (int) ($insights['clicks'] ?? 0),
                    'reach' => (int) ($insights['reach'] ?? 0),
                    'ctr' => (float) ($insights['ctr'] ?? 0),
                    'cpc' => (float) ($insights['cpc'] ?? 0),
                    'cpm' => (float) ($insights['cpm'] ?? 0),
                    'conversions' => $conversions,
                    'conversion_value' => $conversionValue,
                    'roas' => $spend > 0 ? round($conversionValue / $spend, 2) : 0,
                ];
            } catch (\Exception $e) {
                // Se falhar em uma campanha, continua para as outras
                $result[] = [
                    'id' => $campaign['id'],
                    'name' => $campaign['name'],
                    'status' => $campaign['effective_status'] ?? $campaign['status'],
                    'objective' => $campaign['objective'] ?? null,
                    'error' => 'Não foi possível buscar insights',
                ];
            }
        }

        return $result;
    }
}

