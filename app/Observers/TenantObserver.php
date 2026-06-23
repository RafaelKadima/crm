<?php

namespace App\Observers;

use App\Models\Tenant;
use App\Models\TenantQuota;
use App\Services\KpiService;
use Illuminate\Support\Facades\Log;

class TenantObserver
{
    /**
     * Handle the Tenant "created" event.
     * Cria quotas padrão baseado no plano.
     */
    public function created(Tenant $tenant): void
    {
        TenantQuota::createForTenant($tenant);

        Log::info('Tenant created - quota initialized', [
            'tenant_id' => $tenant->id,
            'plan' => $tenant->plan->value,
        ]);

        // Todo tenant nasce com os KPIs padrão do sistema. Sem isto, a aba
        // "Indicadores (KPIs)" ficava vazia até alguém chamar manualmente
        // /kpis/initialize-defaults — que não tinha gatilho na interface.
        // Falha aqui não pode derrubar a criação do tenant (o backfill cobre).
        try {
            app(KpiService::class)->initializeDefaultKpis($tenant->id);

            Log::info('Tenant created - default KPIs seeded', [
                'tenant_id' => $tenant->id,
            ]);
        } catch (\Throwable $e) {
            Log::error('Tenant created - failed to seed default KPIs', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle the Tenant "updated" event.
     * Atualiza quotas se o plano mudou.
     */
    public function updated(Tenant $tenant): void
    {
        // Se o plano mudou, atualiza as quotas para os novos limites
        if ($tenant->isDirty('plan')) {
            TenantQuota::updateForPlan($tenant, $tenant->plan);
            
            Log::info('Tenant plan changed - quota updated', [
                'tenant_id' => $tenant->id,
                'old_plan' => $tenant->getOriginal('plan'),
                'new_plan' => $tenant->plan->value,
            ]);
        }
    }
}

