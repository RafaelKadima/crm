<?php

namespace App\Observers;

use App\Models\Lead;
use App\Models\TenantUsageStats;
use App\Services\UsageTrackingService;
use Illuminate\Support\Facades\Log;

class LeadObserver
{
    public function __construct(
        protected UsageTrackingService $usageService
    ) {}

    /**
     * Handle the Lead "created" event.
     */
    public function created(Lead $lead): void
    {
        // Incrementa contador de leads criados
        TenantUsageStats::incrementLeads($lead->tenant_id);
        
        Log::debug('Lead created - usage tracked', [
            'lead_id' => $lead->id,
            'tenant_id' => $lead->tenant_id,
        ]);
    }

    /**
     * Handle the Lead "updated" event.
     */
    public function updated(Lead $lead): void
    {
        // Se mudou para "won", incrementa leads convertidos
        if ($lead->isDirty('status') && $lead->status === 'won') {
            TenantUsageStats::incrementConvertedLeads($lead->tenant_id);
        }
    }
}

