<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Services\WhatsAppService;
use App\Services\InstagramService;
use App\Enums\ChannelTypeEnum;
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
        $validTokens = [
            config('services.whatsapp.verify_token', 'crm_whatsapp_verify_token'),
            config('services.instagram.verify_token', 'crm_instagram_verify_token'),
            config('services.meta.verify_token', 'crm_meta_verify_token'), // Token unificado
        ];

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
     * Handle WhatsApp webhook
     */
    protected function handleWhatsApp(array $payload): JsonResponse
    {
        $phoneNumberId = $payload['entry'][0]['changes'][0]['value']['metadata']['phone_number_id'] ?? null;

        if (!$phoneNumberId) {
            Log::warning('WhatsApp webhook: missing phone_number_id');
            return response()->json(['status' => 'ignored']);
        }

        $channel = Channel::where('type', ChannelTypeEnum::WHATSAPP)
            ->whereJsonContains('config->phone_number_id', $phoneNumberId)
            ->first();

        if (!$channel) {
            Log::warning('WhatsApp webhook: channel not found', ['phone_number_id' => $phoneNumberId]);
            return response()->json(['status' => 'channel_not_found']);
        }

        $this->whatsAppService->processIncomingWebhook($payload, $channel);

        return response()->json(['status' => 'success', 'platform' => 'whatsapp']);
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

