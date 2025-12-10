<?php

namespace App\Jobs\Ads;

use App\Models\AdAccount;
use App\Services\Ads\AdsInsightService;
use App\Services\Ads\MetaAdsService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncAdMetricsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 300; // 5 minutos

    protected ?string $accountId;
    protected ?string $dateString;

    /**
     * Create a new job instance.
     */
    public function __construct(?string $accountId = null, ?string $date = null)
    {
        $this->accountId = $accountId;
        $this->dateString = $date;
    }

    /**
     * Execute the job.
     */
    public function handle(MetaAdsService $metaAdsService, AdsInsightService $insightService): void
    {
        $date = $this->dateString 
            ? Carbon::parse($this->dateString) 
            : Carbon::yesterday();

        Log::info('Starting Ad Metrics Sync', [
            'account_id' => $this->accountId,
            'date' => $date->toDateString(),
        ]);

        // Se accountId especificado, sincroniza apenas essa conta
        if ($this->accountId) {
            $account = AdAccount::find($this->accountId);
            
            if ($account && $account->isActive() && $account->hasValidToken()) {
                $this->syncAccount($account, $date, $metaAdsService, $insightService);
            }
            
            return;
        }

        // Sincroniza todas as contas ativas
        $accounts = AdAccount::active()
            ->whereNotNull('access_token')
            ->get();

        Log::info('Syncing all active ad accounts', ['count' => $accounts->count()]);

        foreach ($accounts as $account) {
            try {
                $this->syncAccount($account, $date, $metaAdsService, $insightService);
            } catch (\Exception $e) {
                Log::error('Failed to sync ad account', [
                    'account_id' => $account->id,
                    'error' => $e->getMessage(),
                ]);
                
                $account->markAsError($e->getMessage());
            }
        }
    }

    /**
     * Sincroniza uma conta específica.
     */
    protected function syncAccount(
        AdAccount $account, 
        Carbon $date, 
        MetaAdsService $metaAdsService,
        AdsInsightService $insightService
    ): void {
        Log::info('Syncing ad account', [
            'account_id' => $account->id,
            'name' => $account->name,
            'platform' => $account->platform,
        ]);

        // 1. Sincroniza estrutura (campanhas, adsets, ads)
        $this->syncStructure($account, $metaAdsService);

        // 2. Sincroniza métricas
        $metricsCount = $metaAdsService->syncAccountMetrics($account, $date);

        Log::info('Metrics synced', [
            'account_id' => $account->id,
            'metrics_count' => $metricsCount,
        ]);

        // 3. Gera insights
        $tenant = $account->tenant;
        if ($tenant) {
            $insightsCount = $insightService->generateInsights($tenant);
            
            Log::info('Insights generated', [
                'tenant_id' => $tenant->id,
                'insights_count' => $insightsCount,
            ]);
        }
    }

    /**
     * Sincroniza estrutura da conta.
     */
    protected function syncStructure(AdAccount $account, MetaAdsService $metaAdsService): void
    {
        // Sincroniza campanhas
        $campaigns = $metaAdsService->syncCampaigns($account);

        foreach ($campaigns as $campaign) {
            // Sincroniza adsets
            $adsets = $metaAdsService->syncAdsets($campaign);

            foreach ($adsets as $adset) {
                // Sincroniza ads
                $metaAdsService->syncAds($adset);
            }
        }
    }
}

