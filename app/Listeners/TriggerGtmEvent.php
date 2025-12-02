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

        // Prepara os dados do evento GTM
        $gtmData = [
            'event' => $gtmEventKey,
            'lead_id' => $event->lead->id,
            'contact_name' => $event->lead->contact->name,
            'contact_phone' => $event->lead->contact->phone,
            'contact_email' => $event->lead->contact->email,
            'stage_from' => $event->oldStage->name,
            'stage_to' => $event->newStage->name,
            'pipeline' => $event->lead->pipeline->name,
            'value' => $event->lead->value,
            'tenant_id' => $event->lead->tenant_id,
            'timestamp' => now()->toIso8601String(),
        ];

        // Aqui você pode:
        // 1. Enviar para uma fila que processa webhooks
        // 2. Enviar diretamente para Google Analytics via Measurement Protocol
        // 3. Salvar em uma tabela de eventos para processamento posterior

        Log::info('GTM Event Triggered', $gtmData);

        // Exemplo de envio via webhook (configurável por tenant)
        $tenant = $event->lead->tenant;
        $gtmWebhookUrl = $tenant->getSetting('gtm_webhook_url');

        if ($gtmWebhookUrl) {
            dispatch(function () use ($gtmWebhookUrl, $gtmData) {
                \Illuminate\Support\Facades\Http::post($gtmWebhookUrl, $gtmData);
            })->afterResponse();
        }
    }
}


