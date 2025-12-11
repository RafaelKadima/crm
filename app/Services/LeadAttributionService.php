<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\AdCampaign;
use App\Models\AdAd;
use App\Models\AdConversion;
use App\Models\PipelineStage;
use Illuminate\Support\Facades\Log;

class LeadAttributionService
{
    /**
     * Extrai dados UTM do lead
     */
    public function parseUtmFromLead(Lead $lead): array
    {
        $utmData = [];
        
        // Verifica campos UTM diretos
        if ($lead->utm_source) {
            $utmData['utm_source'] = $lead->utm_source;
        }
        if ($lead->utm_medium) {
            $utmData['utm_medium'] = $lead->utm_medium;
        }
        if ($lead->utm_campaign) {
            $utmData['utm_campaign'] = $lead->utm_campaign;
        }
        if ($lead->utm_content) {
            $utmData['utm_content'] = $lead->utm_content;
        }
        if ($lead->utm_term) {
            $utmData['utm_term'] = $lead->utm_term;
        }
        
        // Verifica também no metadata
        $metadata = $lead->metadata ?? [];
        
        if (empty($utmData) && !empty($metadata)) {
            foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $param) {
                if (!empty($metadata[$param])) {
                    $utmData[$param] = $metadata[$param];
                }
            }
        }
        
        // Verifica se veio de um formulário com UTM no referrer
        if (!empty($metadata['referrer'])) {
            $parsedUrl = parse_url($metadata['referrer']);
            if (!empty($parsedUrl['query'])) {
                parse_str($parsedUrl['query'], $queryParams);
                foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $param) {
                    if (empty($utmData[$param]) && !empty($queryParams[$param])) {
                        $utmData[$param] = $queryParams[$param];
                    }
                }
            }
        }
        
        return $utmData;
    }
    
    /**
     * Atribui lead a uma campanha de ads
     */
    public function attributeToAdCampaign(Lead $lead): ?AdCampaign
    {
        // Primeiro verifica se já está atribuído
        if ($lead->ad_campaign_id) {
            return AdCampaign::find($lead->ad_campaign_id);
        }
        
        // Tenta encontrar pela UTM
        $utmData = $this->parseUtmFromLead($lead);
        
        if (empty($utmData['utm_campaign'])) {
            return null;
        }
        
        // Busca campanha pelo nome da UTM ou ID
        $campaign = AdCampaign::where('tenant_id', $lead->tenant_id)
            ->where(function ($query) use ($utmData) {
                $query->where('name', 'like', '%' . $utmData['utm_campaign'] . '%')
                    ->orWhere('platform_campaign_id', $utmData['utm_campaign']);
            })
            ->first();
        
        if ($campaign) {
            // Atualiza lead com a campanha encontrada
            $lead->update([
                'ad_campaign_id' => $campaign->id,
                'utm_source' => $utmData['utm_source'] ?? null,
                'utm_medium' => $utmData['utm_medium'] ?? null,
                'utm_campaign' => $utmData['utm_campaign'] ?? null,
                'utm_content' => $utmData['utm_content'] ?? null,
                'utm_term' => $utmData['utm_term'] ?? null,
            ]);
            
            Log::info('Lead attributed to campaign', [
                'lead_id' => $lead->id,
                'campaign_id' => $campaign->id,
                'utm_campaign' => $utmData['utm_campaign'],
            ]);
        }
        
        return $campaign;
    }
    
    /**
     * Tenta atribuir lead a um anúncio específico
     */
    public function attributeToAd(Lead $lead): ?AdAd
    {
        $utmData = $this->parseUtmFromLead($lead);
        
        // utm_content geralmente contém o ID do ad
        if (empty($utmData['utm_content'])) {
            return null;
        }
        
        $ad = AdAd::where('tenant_id', $lead->tenant_id)
            ->where(function ($query) use ($utmData) {
                $query->where('platform_ad_id', $utmData['utm_content'])
                    ->orWhere('name', 'like', '%' . $utmData['utm_content'] . '%');
            })
            ->first();
        
        if ($ad) {
            $lead->update(['ad_ad_id' => $ad->id]);
            
            Log::info('Lead attributed to ad', [
                'lead_id' => $lead->id,
                'ad_id' => $ad->id,
                'utm_content' => $utmData['utm_content'],
            ]);
        }
        
        return $ad;
    }
    
    /**
     * Registra uma conversão atribuída à campanha
     */
    public function recordConversion(
        Lead $lead,
        string $eventType,
        ?PipelineStage $fromStage = null,
        ?PipelineStage $toStage = null
    ): ?AdConversion {
        // Primeiro tenta atribuir se ainda não foi
        $campaign = $this->attributeToAdCampaign($lead);
        
        if (!$campaign) {
            Log::debug('No campaign attribution for lead', ['lead_id' => $lead->id]);
            return null;
        }
        
        // Tenta atribuir ao ad também
        $ad = $this->attributeToAd($lead);
        
        // Calcula dias para converter
        $daysToConvert = null;
        if ($lead->created_at) {
            $daysToConvert = now()->diffInDays($lead->created_at);
        }
        
        // Cria o registro de conversão
        $conversion = AdConversion::create([
            'tenant_id' => $lead->tenant_id,
            'ad_campaign_id' => $campaign->id,
            'ad_adset_id' => $ad?->adset?->id,
            'ad_ad_id' => $ad?->id,
            'lead_id' => $lead->id,
            'contact_id' => $lead->contact_id,
            'event_type' => $eventType,
            'gtm_event_key' => $toStage?->gtm_event_key,
            'value' => $lead->value,
            'currency' => 'BRL',
            'utm_data' => $this->parseUtmFromLead($lead),
            'attribution_model' => 'last_click',
            'attribution_weight' => 1.0,
            'stage_from' => $fromStage?->name,
            'stage_to' => $toStage?->name,
            'days_to_convert' => $daysToConvert,
            'metadata' => [
                'lead_name' => $lead->name,
                'pipeline_id' => $lead->pipeline_id,
                'converted_by' => auth()->id(),
            ],
            'converted_at' => now(),
        ]);
        
        Log::info('Conversion recorded', [
            'conversion_id' => $conversion->id,
            'lead_id' => $lead->id,
            'campaign_id' => $campaign->id,
            'event_type' => $eventType,
            'value' => $lead->value,
        ]);
        
        return $conversion;
    }
    
    /**
     * Mapeia eventos GTM para tipos de conversão
     */
    public function mapGtmEventToConversionType(string $gtmEventKey): string
    {
        $mapping = [
            'purchase' => AdConversion::EVENT_PURCHASE,
            'lead' => AdConversion::EVENT_LEAD,
            'schedule' => AdConversion::EVENT_SCHEDULE,
            'qualified_lead' => AdConversion::EVENT_QUALIFIED,
            'contact' => AdConversion::EVENT_CONTACT,
            'view_content' => AdConversion::EVENT_VIEW_CONTENT,
            'add_to_cart' => AdConversion::EVENT_ADD_TO_CART,
            'initiate_checkout' => AdConversion::EVENT_INITIATE_CHECKOUT,
        ];
        
        // Normaliza o evento
        $normalizedKey = strtolower(str_replace([' ', '-'], '_', $gtmEventKey));
        
        return $mapping[$normalizedKey] ?? $normalizedKey;
    }
    
    /**
     * Calcula ROAS real baseado em conversões do CRM
     */
    public function calculateRealRoas(AdCampaign $campaign, int $days = 30): float
    {
        $conversions = AdConversion::where('ad_campaign_id', $campaign->id)
            ->where('converted_at', '>=', now()->subDays($days))
            ->sum('value');
        
        $spend = ($campaign->daily_budget ?? 0) * $days;
        
        if ($spend <= 0) {
            return 0;
        }
        
        return round($conversions / $spend, 2);
    }
    
    /**
     * Obtém estatísticas de atribuição para um tenant
     */
    public function getAttributionStats(string $tenantId, int $days = 30): array
    {
        $conversions = AdConversion::where('tenant_id', $tenantId)
            ->where('converted_at', '>=', now()->subDays($days))
            ->get();
        
        $totalConversions = $conversions->count();
        $totalValue = $conversions->sum('value');
        
        // Agrupa por campanha
        $byCampaign = $conversions->groupBy('ad_campaign_id')->map(function ($group) {
            return [
                'conversions' => $group->count(),
                'value' => $group->sum('value'),
                'avg_days_to_convert' => $group->avg('days_to_convert'),
            ];
        });
        
        // Agrupa por tipo de evento
        $byEventType = $conversions->groupBy('event_type')->map(function ($group) {
            return [
                'count' => $group->count(),
                'value' => $group->sum('value'),
            ];
        });
        
        return [
            'period_days' => $days,
            'total_conversions' => $totalConversions,
            'total_value' => $totalValue,
            'avg_value' => $totalConversions > 0 ? round($totalValue / $totalConversions, 2) : 0,
            'by_campaign' => $byCampaign,
            'by_event_type' => $byEventType,
        ];
    }
}
