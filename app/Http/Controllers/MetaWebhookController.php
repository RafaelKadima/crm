<?php

namespace App\Http\Controllers;

use App\Enums\ChannelTypeEnum;
use App\Enums\MetaIntegrationStatusEnum;
use App\Models\Channel;
use App\Models\MetaIntegration;
use App\Services\InstagramService;
use App\Services\WhatsAppService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Controller unificado para webhooks do Meta (WhatsApp + Instagram)
 * 
 * Este controller pode ser usado como endpoint único para receber
 * webhooks de ambas as plataformas, detectando automaticamente a origem.
 */
class MetaWebhookController extends Controller
{
    protected WhatsAppService $whatsAppService;
    protected InstagramService $instagramService;

    public function __construct(
        WhatsAppService $whatsAppService,
        InstagramService $instagramService
    ) {
        $this->whatsAppService = $whatsAppService;
        $this->instagramService = $instagramService;
    }

    /**
     * Verificação do webhook (GET)
     * Ambos WhatsApp e Instagram usam o mesmo formato de verificação
     */
    public function verify(Request $request): Response
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        // Aceita qualquer token válido (WhatsApp ou Instagram)
        $validTokens = array_filter([
            config('services.whatsapp.verify_token'),
            config('services.instagram.verify_token'),
            config('services.meta.verify_token'),
        ]);

        if ($mode === 'subscribe' && in_array($token, $validTokens)) {
            Log::info('Meta webhook verified successfully', ['token' => $token]);
            return response($challenge, 200);
        }

        Log::warning('Meta webhook verification failed', [
            'mode' => $mode,
            'token' => $token,
        ]);

        return response('Forbidden', 403);
    }

    /**
     * Recebe webhooks (POST) - detecta automaticamente WhatsApp ou Instagram
     */
    public function receive(Request $request): JsonResponse
    {
        $payload = $request->all();

        Log::info('Meta webhook received', ['object' => $payload['object'] ?? 'unknown']);

        try {
            $object = $payload['object'] ?? null;

            return match ($object) {
                'whatsapp_business_account' => $this->handleWhatsApp($payload),
                'instagram' => $this->handleInstagram($payload),
                'page' => $this->handleFacebook($payload), // Future: Facebook Messenger
                default => $this->handleUnknown($payload),
            };

        } catch (\Exception $e) {
            Log::error('Meta webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Always return 200 to prevent retries
            return response()->json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * Handle WhatsApp webhook — rota explicita por `field` antes de parsear.
     *
     * Fields tratados:
     *   messages                        → mensagens de entrada (+ statuses aninhados)
     *   smb_message_echoes              → mensagens enviadas pelo app do celular (Coexistência)
     *   message_echoes                  → eco legado (Messenger / fallback coexistência)
     *   smb_app_state_sync              → sync de contatos/estado do app (Coexistência)
     *   history                         → backfill one-shot (Coexistência)
     *   statuses                        → entregues separadamente em alguns payloads
     *   message_template_status_update  → status de aprovação de templates
     *   phone_number_quality_update     → qualidade do número
     *
     * Primeiro tenta resolver via MetaIntegration (novo sistema OAuth).
     * Se não encontrar, faz fallback para Channel (sistema legado).
     */
    protected function handleWhatsApp(array $payload): JsonResponse
    {
        $change = $payload['entry'][0]['changes'][0] ?? [];
        $field = $change['field'] ?? 'messages';
        $phoneNumberId = $change['value']['metadata']['phone_number_id'] ?? null;

        Log::info('WhatsApp webhook: field dispatch', [
            'field' => $field,
            'phone_number_id' => $phoneNumberId,
        ]);

        if (!$phoneNumberId) {
            Log::warning('WhatsApp webhook: missing phone_number_id', ['field' => $field]);
            return response()->json(['status' => 'ignored']);
        }

        $metaIntegration = MetaIntegration::findActiveByPhoneNumberId($phoneNumberId);
        $channel = Channel::where('type', ChannelTypeEnum::WHATSAPP)
            ->whereJsonContains('config->phone_number_id', $phoneNumberId)
            ->first();

        if (!$metaIntegration && !$channel) {
            Log::warning('WhatsApp webhook: no MetaIntegration or Channel found', [
                'phone_number_id' => $phoneNumberId,
                'field' => $field,
            ]);
            return response()->json(['status' => 'channel_not_found']);
        }

        $isCoexistence = $metaIntegration?->is_coexistence ?? false;

        return match ($field) {
            // Mensagens de entrada normais (e statuses inline)
            'messages' => $this->dispatchMessagesField($payload, $metaIntegration, $channel, $isCoexistence),

            // Echo de coexistência — o celular enviou uma mensagem
            'smb_message_echoes', 'message_echoes' => $this->dispatchEchoField($payload, $metaIntegration, $channel, $field),

            // Backfill de histórico (coexistência) — usa service legado via Channel
            'history' => $this->dispatchHistoryField($payload, $channel),

            // Sync de contatos/estado do app (coexistência)
            'smb_app_state_sync' => $this->dispatchAppStateSync($payload, $metaIntegration, $channel),

            // Statuses entregues em payload separado
            'statuses' => $this->dispatchStatusField($payload, $channel, $metaIntegration),

            // Aprovação/rejeição de template
            'message_template_status_update' => $this->dispatchTemplateStatus($payload, $metaIntegration, $channel),

            // Qualidade do número — apenas log por enquanto
            'phone_number_quality_update' => tap(response()->json(['status' => 'logged', 'field' => $field]), fn() => Log::info('WhatsApp quality update', $change['value'] ?? [])),

            // Field desconhecido — log e 200 (Meta não retenta)
            default => tap(response()->json(['status' => 'unhandled_field', 'field' => $field]), fn() => Log::warning('WhatsApp webhook: unhandled field', ['field' => $field])),
        };
    }

    /**
     * Field `messages` — mensagens de entrada. Em tenants coexistentes,
     * aplica fallback da heurística antiga (from == display_phone_number)
     * caso SMB fields ainda não estejam subscritos no App Dashboard.
     */
    protected function dispatchMessagesField(array $payload, ?MetaIntegration $integration, ?Channel $channel, bool $isCoexistence): JsonResponse
    {
        // Fallback: em coexistência, a Meta pode entregar o echo no próprio
        // field `messages` (se smb_message_echoes não estiver subscrito).
        // Mantemos a heurística antiga como safety net até o Dashboard ser atualizado.
        if ($isCoexistence && $this->isCoexistenceEcho($payload)) {
            return $this->processCoexistenceEcho($payload, $integration);
        }

        if ($integration) {
            return $this->processWithMetaIntegration($payload, $integration);
        }

        $this->whatsAppService->processIncomingWebhook($payload, $channel);
        return response()->json(['status' => 'success', 'platform' => 'whatsapp', 'field' => 'messages']);
    }

    /**
     * Field `smb_message_echoes` ou `message_echoes` — echo do operador.
     * Com field explícito, não precisamos da heurística frágil.
     */
    protected function dispatchEchoField(array $payload, ?MetaIntegration $integration, ?Channel $channel, string $field): JsonResponse
    {
        Log::info('WhatsApp webhook: echo field dispatch', ['field' => $field]);

        $targetChannel = $channel ?? ($integration
            ? Channel::withoutGlobalScopes()
                ->where('tenant_id', $integration->tenant_id)
                ->where('type', ChannelTypeEnum::WHATSAPP)
                ->whereJsonContains('config->phone_number_id', $integration->phone_number_id)
                ->first()
            : null);

        if (!$targetChannel) {
            Log::warning('WhatsApp webhook: echo received but no Channel linked', ['field' => $field]);
            return response()->json(['status' => 'no_channel', 'field' => $field]);
        }

        $this->whatsAppService->processCoexistenceEcho($payload, $targetChannel);

        return response()->json([
            'status' => 'success',
            'platform' => 'whatsapp',
            'source' => $field,
        ]);
    }

    /**
     * Field `history` — backfill de mensagens antigas ao conectar coexistência.
     * Reusa o handler legado em WhatsAppController.
     */
    protected function dispatchHistoryField(array $payload, ?Channel $channel): JsonResponse
    {
        if (!$channel) {
            Log::warning('WhatsApp webhook: history received but no Channel linked');
            return response()->json(['status' => 'no_channel', 'field' => 'history']);
        }

        try {
            $this->whatsAppService->processHistorySync($payload, $channel);
        } catch (\Throwable $e) {
            Log::error('WhatsApp history sync failed', [
                'error' => $e->getMessage(),
                'channel_id' => $channel->id,
            ]);
        }

        return response()->json(['status' => 'success', 'field' => 'history']);
    }

    /**
     * Field `smb_app_state_sync` — sync de contatos vindos do app do celular.
     * Por enquanto apenas log estruturado; processamento completo virá em fase posterior.
     */
    protected function dispatchAppStateSync(array $payload, ?MetaIntegration $integration, ?Channel $channel): JsonResponse
    {
        $value = $payload['entry'][0]['changes'][0]['value'] ?? [];
        Log::info('WhatsApp app state sync received', [
            'tenant_id' => $integration?->tenant_id,
            'channel_id' => $channel?->id,
            'keys' => array_keys($value),
        ]);
        return response()->json(['status' => 'logged', 'field' => 'smb_app_state_sync']);
    }

    /**
     * Field `statuses` — entregue fora do `messages`. Roteia para o serviço.
     */
    protected function dispatchStatusField(array $payload, ?Channel $channel, ?MetaIntegration $integration): JsonResponse
    {
        $targetChannel = $channel ?? ($integration
            ? Channel::withoutGlobalScopes()
                ->where('tenant_id', $integration->tenant_id)
                ->where('type', ChannelTypeEnum::WHATSAPP)
                ->whereJsonContains('config->phone_number_id', $integration->phone_number_id)
                ->first()
            : null);

        if (!$targetChannel) {
            return response()->json(['status' => 'no_channel', 'field' => 'statuses']);
        }

        // processIncomingWebhook detecta `statuses` no value e roteia internamente
        $this->whatsAppService->processIncomingWebhook($payload, $targetChannel);
        return response()->json(['status' => 'success', 'field' => 'statuses']);
    }

    /**
     * Field `message_template_status_update` — apenas log por enquanto.
     * Processamento (atualizar `whatsapp_templates.status`) virá em fase posterior.
     */
    protected function dispatchTemplateStatus(array $payload, ?MetaIntegration $integration, ?Channel $channel): JsonResponse
    {
        $value = $payload['entry'][0]['changes'][0]['value'] ?? [];
        Log::info('WhatsApp template status update', [
            'tenant_id' => $integration?->tenant_id,
            'channel_id' => $channel?->id,
            'template_name' => $value['message_template_name'] ?? null,
            'event' => $value['event'] ?? null,
            'reason' => $value['reason'] ?? null,
        ]);
        return response()->json(['status' => 'logged', 'field' => 'message_template_status_update']);
    }

    /**
     * Verifica se a mensagem é um echo de coexistence.
     * Em modo coexistence, mensagens enviadas pelo WhatsApp Business App
     * são ecoadas via webhook. Detectamos comparando o remetente com o
     * display_phone_number do business (mensagem originada do próprio número).
     */
    protected function isCoexistenceEcho(array $payload): bool
    {
        $value = $payload['entry'][0]['changes'][0]['value'] ?? [];
        $messages = $value['messages'] ?? [];
        $metadata = $value['metadata'] ?? [];
        $displayPhoneNumber = $metadata['display_phone_number'] ?? null;

        if (!$displayPhoneNumber || empty($messages)) {
            return false;
        }

        // Normaliza o display_phone_number removendo caracteres não numéricos
        $normalizedBusiness = preg_replace('/\D/', '', $displayPhoneNumber);

        foreach ($messages as $message) {
            $from = preg_replace('/\D/', '', $message['from'] ?? '');
            if ($from === $normalizedBusiness) {
                return true;
            }
        }

        return false;
    }

    /**
     * Processa echo de coexistence: salva como mensagem outgoing no ticket.
     * Mensagens enviadas pelo operador via WhatsApp Business App são salvas
     * com direction = 'outgoing' para manter visibilidade completa da conversa.
     */
    protected function processCoexistenceEcho(array $payload, ?MetaIntegration $integration): JsonResponse
    {
        Log::info('WhatsApp webhook: processing coexistence echo (heuristic fallback)', [
            'integration_id' => $integration?->id,
            'tenant_id' => $integration?->tenant_id,
        ]);

        // Tenta via MetaIntegration; se não houver, cai no phone_number_id do payload
        $phoneNumberId = $payload['entry'][0]['changes'][0]['value']['metadata']['phone_number_id'] ?? null;

        $channel = $integration
            ? Channel::withoutGlobalScopes()
                ->where('tenant_id', $integration->tenant_id)
                ->where('type', ChannelTypeEnum::WHATSAPP)
                ->whereJsonContains('config->phone_number_id', $integration->phone_number_id)
                ->first()
            : Channel::where('type', ChannelTypeEnum::WHATSAPP)
                ->whereJsonContains('config->phone_number_id', $phoneNumberId)
                ->first();

        if ($channel) {
            $this->whatsAppService->processCoexistenceEcho($payload, $channel);
        } else {
            Log::warning('WhatsApp webhook: coexistence echo but no Channel found', [
                'integration_id' => $integration?->id,
                'phone_number_id' => $phoneNumberId,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'platform' => 'whatsapp',
            'source' => 'coexistence_echo',
        ]);
    }

    /**
     * Processa webhook usando MetaIntegration (novo sistema OAuth).
     *
     * Por enquanto, cria um Channel virtual para manter compatibilidade
     * com o WhatsAppService existente. No futuro, pode usar MetaMessageService diretamente.
     */
    protected function processWithMetaIntegration(array $payload, MetaIntegration $integration): JsonResponse
    {
        Log::info('WhatsApp webhook: processing with MetaIntegration', [
            'integration_id' => $integration->id,
            'tenant_id' => $integration->tenant_id,
            'phone_number_id' => $integration->phone_number_id,
        ]);

        // Tenta encontrar um Channel vinculado ao mesmo phone_number_id
        $channel = Channel::withoutGlobalScopes()
            ->where('tenant_id', $integration->tenant_id)
            ->where('type', ChannelTypeEnum::WHATSAPP)
            ->whereJsonContains('config->phone_number_id', $integration->phone_number_id)
            ->first();

        if ($channel) {
            // Atualiza o token do Channel com o token da MetaIntegration (mais recente)
            $config = $channel->config ?? [];
            $config['access_token'] = $integration->access_token;
            $channel->config = $config;
            // Não salva para não sobrescrever permanentemente, apenas usa em memória

            $this->whatsAppService->processIncomingWebhook($payload, $channel);

            return response()->json([
                'status' => 'success',
                'platform' => 'whatsapp',
                'source' => 'meta_integration',
            ]);
        }

        // Se não tem Channel, precisa criar um virtual ou usar MetaMessageService
        // Por enquanto, loga e retorna sucesso para não bloquear
        Log::warning('WhatsApp webhook: MetaIntegration found but no Channel', [
            'integration_id' => $integration->id,
            'tenant_id' => $integration->tenant_id,
        ]);

        // TODO: No futuro, processar diretamente sem Channel
        return response()->json([
            'status' => 'success',
            'platform' => 'whatsapp',
            'source' => 'meta_integration',
            'note' => 'no_channel_linked',
        ]);
    }

    /**
     * Handle Instagram webhook
     */
    protected function handleInstagram(array $payload): JsonResponse
    {
        $pageId = $payload['entry'][0]['id'] ?? null;

        if (!$pageId) {
            Log::warning('Instagram webhook: missing page_id');
            return response()->json(['status' => 'ignored']);
        }

        $channel = Channel::where('type', ChannelTypeEnum::INSTAGRAM)
            ->whereJsonContains('config->page_id', $pageId)
            ->first();

        if (!$channel) {
            Log::warning('Instagram webhook: channel not found', ['page_id' => $pageId]);
            return response()->json(['status' => 'channel_not_found']);
        }

        $this->instagramService->processIncomingWebhook($payload, $channel);

        return response()->json(['status' => 'success', 'platform' => 'instagram']);
    }

    /**
     * Handle Facebook Messenger webhook (future)
     */
    protected function handleFacebook(array $payload): JsonResponse
    {
        Log::info('Facebook Messenger webhook received (not implemented)', [
            'entry_count' => count($payload['entry'] ?? [])
        ]);

        // TODO: Implement Facebook Messenger support
        return response()->json(['status' => 'not_implemented', 'platform' => 'facebook']);
    }

    /**
     * Handle unknown webhook type
     */
    protected function handleUnknown(array $payload): JsonResponse
    {
        Log::warning('Unknown webhook type received', [
            'object' => $payload['object'] ?? 'null',
            'payload' => $payload,
        ]);

        return response()->json(['status' => 'unknown_type']);
    }
}

