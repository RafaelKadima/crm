<?php

namespace App\Listeners;

use App\Events\LeadStageChanged;
use Illuminate\Support\Facades\Log;

class TriggerGtmEvent
{
    /**
     * Handle the event.
     */
    public function handle(LeadStageChanged $event): void
    {
        $gtmEventKey = $event->newStage->gtm_event_key;

        if (!$gtmEventKey) {
            return;
        }

        $lead = $event->lead;
        $contact = $lead->contact;
        $tenant = $lead->tenant;

        // Prepara os dados do evento GTM com campos úteis para Facebook, Google Ads, etc.
        $gtmData = [
            // Identificação do evento
            'event' => $gtmEventKey,
            'event_category' => 'crm',
            'event_label' => $event->newStage->name,
            
            // Dados do Lead
            'lead_id' => $lead->id,
            'lead_source' => $lead->source ?? 'direct',
            'lead_status' => $lead->status ?? null,
            
            // Dados do Contato (para Facebook CAPI, Google Ads, etc.)
            'contact_name' => $contact->name ?? null,
            'contact_first_name' => $this->getFirstName($contact->name ?? ''),
            'contact_last_name' => $this->getLastName($contact->name ?? ''),
            'contact_email' => $contact->email ?? null,
            'contact_phone' => $contact->phone ?? null,
            'contact_city' => $contact->city ?? null,
            'contact_state' => $contact->state ?? null,
            'contact_country' => 'BR',
            
            // Dados de valor (para conversões)
            'value' => (float) ($lead->value ?? 0),
            'currency' => 'BRL',
            
            // Dados do funil
            'stage_from' => $event->oldStage->name,
            'stage_from_slug' => $event->oldStage->slug,
            'stage_to' => $event->newStage->name,
            'stage_to_slug' => $event->newStage->slug,
            'pipeline_name' => $lead->pipeline->name ?? null,
            'pipeline_id' => $lead->pipeline_id,
            
            // Dados para Facebook Pixel
            'content_type' => 'product',
            'content_name' => $lead->pipeline->name ?? 'Lead',
            'content_category' => $event->newStage->name,
            
            // Metadados
            'tenant_id' => $lead->tenant_id,
            'user_id' => $lead->user_id,
            'timestamp' => now()->toIso8601String(),
            'event_time' => now()->timestamp,
            
            // UTM (se disponível)
            'utm_source' => $lead->utm_source ?? null,
            'utm_medium' => $lead->utm_medium ?? null,
            'utm_campaign' => $lead->utm_campaign ?? null,
            'utm_term' => $lead->utm_term ?? null,
            'utm_content' => $lead->utm_content ?? null,
        ];

        // Remove valores nulos para limpar o payload
        $gtmData = array_filter($gtmData, fn($v) => $v !== null);

        Log::info('GTM Event Triggered', $gtmData);

        // Enviar via webhook (server-side tracking)
        $gtmWebhookUrl = $tenant->getSetting('gtm_webhook_url');

        if ($gtmWebhookUrl) {
            dispatch(function () use ($gtmWebhookUrl, $gtmData) {
                \Illuminate\Support\Facades\Http::timeout(10)->post($gtmWebhookUrl, $gtmData);
            })->afterResponse();
        }

        // Broadcast para o frontend (para dataLayer no navegador)
        // O frontend pode ouvir via WebSocket e fazer push no dataLayer
        broadcast(new \App\Events\GtmEventTriggered($gtmData, $tenant->id))->toOthers();
    }

    /**
     * Extrai primeiro nome.
     */
    private function getFirstName(string $fullName): string
    {
        $parts = explode(' ', trim($fullName));
        return $parts[0] ?? '';
    }

    /**
     * Extrai sobrenome.
     */
    private function getLastName(string $fullName): string
    {
        $parts = explode(' ', trim($fullName));
        array_shift($parts);
        return implode(' ', $parts);
    }
}


