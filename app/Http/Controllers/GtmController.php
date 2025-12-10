<?php

namespace App\Http\Controllers;

use App\Models\Pipeline;
use App\Models\PipelineStage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GtmController extends Controller
{
    /**
     * Retorna as configurações de GTM do tenant.
     */
    public function getSettings(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        return response()->json([
            'gtm_container_id' => $tenant->getSetting('gtm_container_id'),
            'gtm_enabled' => $tenant->getSetting('gtm_enabled', false),
            'gtm_webhook_url' => $tenant->getSetting('gtm_webhook_url'),
            'ga4_measurement_id' => $tenant->getSetting('ga4_measurement_id'),
        ]);
    }

    /**
     * Atualiza as configurações de GTM do tenant.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gtm_container_id' => 'nullable|string|max:50',
            'gtm_enabled' => 'boolean',
            'gtm_webhook_url' => 'nullable|url|max:500',
            'ga4_measurement_id' => 'nullable|string|max:50',
        ]);

        $tenant = $request->user()->tenant;

        foreach ($validated as $key => $value) {
            $tenant->setSetting($key, $value);
        }

        return response()->json([
            'message' => 'Configurações de GTM atualizadas com sucesso!',
            'settings' => [
                'gtm_container_id' => $tenant->getSetting('gtm_container_id'),
                'gtm_enabled' => $tenant->getSetting('gtm_enabled', false),
                'gtm_webhook_url' => $tenant->getSetting('gtm_webhook_url'),
                'ga4_measurement_id' => $tenant->getSetting('ga4_measurement_id'),
            ],
        ]);
    }

    /**
     * Retorna os eventos GTM configurados para os estágios de um pipeline.
     */
    public function getPipelineEvents(Pipeline $pipeline): JsonResponse
    {
        $stages = $pipeline->stages()->get(['id', 'name', 'slug', 'order', 'color', 'gtm_event_key']);

        return response()->json([
            'pipeline' => [
                'id' => $pipeline->id,
                'name' => $pipeline->name,
            ],
            'stages' => $stages,
        ]);
    }

    /**
     * Atualiza o evento GTM de um estágio.
     */
    public function updateStageEvent(Request $request, PipelineStage $stage): JsonResponse
    {
        $validated = $request->validate([
            'gtm_event_key' => 'nullable|string|max:100',
        ]);

        $stage->update($validated);

        return response()->json([
            'message' => 'Evento GTM atualizado com sucesso!',
            'stage' => $stage,
        ]);
    }

    /**
     * Atualiza eventos GTM de múltiplos estágios de uma vez.
     */
    public function updatePipelineEvents(Request $request, Pipeline $pipeline): JsonResponse
    {
        $validated = $request->validate([
            'stages' => 'required|array',
            'stages.*.id' => 'required|uuid|exists:pipeline_stages,id',
            'stages.*.gtm_event_key' => 'nullable|string|max:100',
        ]);

        foreach ($validated['stages'] as $stageData) {
            PipelineStage::where('id', $stageData['id'])
                ->where('pipeline_id', $pipeline->id)
                ->update(['gtm_event_key' => $stageData['gtm_event_key'] ?? null]);
        }

        return response()->json([
            'message' => 'Eventos GTM atualizados com sucesso!',
            'stages' => $pipeline->stages()->get(['id', 'name', 'slug', 'order', 'color', 'gtm_event_key']),
        ]);
    }

    /**
     * Retorna sugestões de nomes de eventos GTM padrão.
     */
    public function getEventSuggestions(): JsonResponse
    {
        return response()->json([
            'suggestions' => [
                // Eventos padrão do CRM
                'lead_created' => 'Novo lead criado',
                'lead_qualified' => 'Lead qualificado',
                'lead_contacted' => 'Primeiro contato realizado',
                'meeting_scheduled' => 'Reunião agendada',
                'proposal_sent' => 'Proposta enviada',
                'negotiation_started' => 'Negociação iniciada',
                'deal_won' => 'Negócio fechado (ganho)',
                'deal_lost' => 'Negócio perdido',
                'onboarding_started' => 'Onboarding iniciado',
                'onboarding_completed' => 'Onboarding concluído',
                'upsell_opportunity' => 'Oportunidade de upsell',
                'churn_risk' => 'Risco de churn identificado',
                
                // Eventos padrão do Facebook Pixel
                'Lead' => '[FB] Lead gerado',
                'Contact' => '[FB] Contato iniciado',
                'Schedule' => '[FB] Agendamento',
                'InitiateCheckout' => '[FB] Início de checkout',
                'Purchase' => '[FB] Compra realizada',
                'CompleteRegistration' => '[FB] Cadastro completo',
                
                // Eventos padrão do Google Ads
                'generate_lead' => '[GA] Geração de lead',
                'submit_lead_form' => '[GA] Formulário de lead',
                'book_appointment' => '[GA] Agendamento',
                'purchase' => '[GA] Compra',
            ],
        ]);
    }

    /**
     * Retorna os campos disponíveis para mapeamento.
     */
    public function getAvailableFields(): JsonResponse
    {
        return response()->json([
            'fields' => [
                // Dados do Lead
                ['key' => 'lead_id', 'label' => 'ID do Lead', 'group' => 'Lead'],
                ['key' => 'lead_source', 'label' => 'Origem do Lead', 'group' => 'Lead'],
                ['key' => 'value', 'label' => 'Valor', 'group' => 'Lead'],
                ['key' => 'currency', 'label' => 'Moeda', 'group' => 'Lead'],
                
                // Dados do Contato
                ['key' => 'contact_name', 'label' => 'Nome Completo', 'group' => 'Contato'],
                ['key' => 'contact_first_name', 'label' => 'Primeiro Nome', 'group' => 'Contato'],
                ['key' => 'contact_last_name', 'label' => 'Sobrenome', 'group' => 'Contato'],
                ['key' => 'contact_email', 'label' => 'Email', 'group' => 'Contato'],
                ['key' => 'contact_phone', 'label' => 'Telefone', 'group' => 'Contato'],
                ['key' => 'contact_city', 'label' => 'Cidade', 'group' => 'Contato'],
                ['key' => 'contact_state', 'label' => 'Estado', 'group' => 'Contato'],
                
                // Dados do Funil
                ['key' => 'stage_from', 'label' => 'Estágio Anterior', 'group' => 'Funil'],
                ['key' => 'stage_to', 'label' => 'Estágio Atual', 'group' => 'Funil'],
                ['key' => 'pipeline_name', 'label' => 'Nome do Pipeline', 'group' => 'Funil'],
                
                // UTM
                ['key' => 'utm_source', 'label' => 'UTM Source', 'group' => 'UTM'],
                ['key' => 'utm_medium', 'label' => 'UTM Medium', 'group' => 'UTM'],
                ['key' => 'utm_campaign', 'label' => 'UTM Campaign', 'group' => 'UTM'],
                ['key' => 'utm_term', 'label' => 'UTM Term', 'group' => 'UTM'],
                ['key' => 'utm_content', 'label' => 'UTM Content', 'group' => 'UTM'],
                
                // Facebook específico
                ['key' => 'content_type', 'label' => 'Content Type', 'group' => 'Facebook'],
                ['key' => 'content_name', 'label' => 'Content Name', 'group' => 'Facebook'],
                ['key' => 'content_category', 'label' => 'Content Category', 'group' => 'Facebook'],
            ],
            'facebook_params' => [
                'em' => 'Email (hashed)',
                'ph' => 'Telefone (hashed)',
                'fn' => 'Primeiro Nome',
                'ln' => 'Sobrenome',
                'ct' => 'Cidade',
                'st' => 'Estado',
                'zp' => 'CEP',
                'country' => 'País',
                'value' => 'Valor',
                'currency' => 'Moeda',
                'content_type' => 'Tipo de Conteúdo',
                'content_ids' => 'IDs de Conteúdo',
                'content_name' => 'Nome do Conteúdo',
            ],
        ]);
    }
}

