<?php

namespace App\Jobs\Ads;

use App\Models\Tenant;
use App\Models\TenantFeature;
use App\Services\Ads\AdsAutomationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessAdsAutomationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    protected ?string $tenantId;

    /**
     * Create a new job instance.
     */
    public function __construct(?string $tenantId = null)
    {
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     */
    public function handle(AdsAutomationService $automationService): void
    {
        Log::info('Starting Ads Automation Processing', [
            'tenant_id' => $this->tenantId,
        ]);

        // Se tenantId especificado, processa apenas esse tenant
        if ($this->tenantId) {
            $tenant = Tenant::find($this->tenantId);
            
            if ($tenant && $this->hasAdsFeature($tenant->id)) {
                $this->processForTenant($tenant, $automationService);
            }
            
            return;
        }

        // Processa todos os tenants com a feature habilitada
        $tenantIds = TenantFeature::where('feature_key', 'ads_intelligence')
            ->where('is_enabled', true)
            ->pluck('tenant_id');

        $tenants = Tenant::whereIn('id', $tenantIds)
            ->where('is_active', true)
            ->get();

        Log::info('Processing automation for tenants', ['count' => $tenants->count()]);

        foreach ($tenants as $tenant) {
            try {
                $this->processForTenant($tenant, $automationService);
            } catch (\Exception $e) {
                Log::error('Failed to process automation for tenant', [
                    'tenant_id' => $tenant->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Processa automação para um tenant.
     */
    protected function processForTenant(Tenant $tenant, AdsAutomationService $automationService): void
    {
        Log::info('Processing automation', ['tenant_id' => $tenant->id, 'name' => $tenant->name]);

        $results = $automationService->evaluateRules($tenant);

        Log::info('Automation results', [
            'tenant_id' => $tenant->id,
            'evaluated' => $results['evaluated'],
            'executed' => $results['executed'],
            'pending_approval' => $results['pending_approval'],
            'failed' => $results['failed'],
        ]);
    }

    /**
     * Verifica se tenant tem a feature de ads.
     */
    protected function hasAdsFeature(string $tenantId): bool
    {
        return TenantFeature::tenantHasFeature($tenantId, 'ads_intelligence');
    }
}

