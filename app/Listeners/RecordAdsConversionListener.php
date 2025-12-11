<?php

namespace App\Listeners;

use App\Events\LeadStageChanged;
use App\Services\LeadAttributionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecordAdsConversionListener implements ShouldQueue
{
    use InteractsWithQueue;
    
    protected LeadAttributionService $attributionService;
    
    /**
     * The number of times the queued listener may be attempted.
     */
    public int $tries = 3;
    
    /**
     * Create the event listener.
     */
    public function __construct(LeadAttributionService $attributionService)
    {
        $this->attributionService = $attributionService;
    }

    /**
     * Handle the event.
     */
    public function handle(LeadStageChanged $event): void
    {
        $lead = $event->lead;
        $newStage = $event->newStage;
        $oldStage = $event->oldStage;
        
        // Verifica se o novo estágio tem um evento GTM configurado
        if (!$newStage || !$newStage->gtm_event_key) {
            Log::debug('RecordAdsConversion: Stage has no GTM event key', [
                'lead_id' => $lead->id,
                'stage_id' => $newStage?->id,
            ]);
            return;
        }
        
        Log::info('RecordAdsConversion: Processing stage change', [
            'lead_id' => $lead->id,
            'from_stage' => $oldStage?->name,
            'to_stage' => $newStage->name,
            'gtm_event_key' => $newStage->gtm_event_key,
        ]);
        
        // Mapeia evento GTM para tipo de conversão
        $eventType = $this->attributionService->mapGtmEventToConversionType(
            $newStage->gtm_event_key
        );
        
        // Registra a conversão
        $conversion = $this->attributionService->recordConversion(
            $lead,
            $eventType,
            $oldStage,
            $newStage
        );
        
        if ($conversion) {
            Log::info('RecordAdsConversion: Conversion recorded', [
                'conversion_id' => $conversion->id,
                'campaign_id' => $conversion->ad_campaign_id,
            ]);
            
            // Notifica o serviço de IA para aprendizado
            $this->notifyLearningService($conversion, $lead, $newStage);
        } else {
            Log::debug('RecordAdsConversion: No conversion recorded (no campaign attribution)', [
                'lead_id' => $lead->id,
            ]);
        }
    }
    
    /**
     * Notifica o serviço de IA sobre a conversão para aprendizado
     */
    protected function notifyLearningService($conversion, $lead, $stage): void
    {
        try {
            $aiServiceUrl = config('services.ai_agent.url');
            $aiServiceKey = config('services.ai_agent.api_key');
            
            if (!$aiServiceUrl) {
                Log::debug('RecordAdsConversion: AI Service URL not configured');
                return;
            }
            
            $payload = [
                'conversion_id' => $conversion->id,
                'campaign_id' => $conversion->ad_campaign_id,
                'adset_id' => $conversion->ad_adset_id,
                'ad_id' => $conversion->ad_ad_id,
                'event_type' => $conversion->event_type,
                'value' => (float) $conversion->value,
                'lead_id' => $lead->id,
                'stage_from' => $conversion->stage_from,
                'stage_to' => $conversion->stage_to,
                'days_to_convert' => $conversion->days_to_convert,
                'utm_data' => $conversion->utm_data,
                'tenant_id' => $conversion->tenant_id,
            ];
            
            $response = Http::timeout(30)
                ->withHeaders([
                    'X-Internal-Key' => $aiServiceKey,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$aiServiceUrl}/ads/learning/record-conversion", $payload);
            
            if ($response->successful()) {
                Log::info('RecordAdsConversion: Learning service notified', [
                    'conversion_id' => $conversion->id,
                    'patterns_detected' => $response->json('patterns_detected', 0),
                ]);
            } else {
                Log::warning('RecordAdsConversion: Learning service notification failed', [
                    'conversion_id' => $conversion->id,
                    'status' => $response->status(),
                    'error' => $response->body(),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('RecordAdsConversion: Error notifying learning service', [
                'conversion_id' => $conversion->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
    
    /**
     * Handle a job failure.
     */
    public function failed(LeadStageChanged $event, \Throwable $exception): void
    {
        Log::error('RecordAdsConversion: Listener failed', [
            'lead_id' => $event->lead->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
