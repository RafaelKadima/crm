<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\TicketMessageAttachment;
use App\Services\WhatsAppService;
use App\Services\InternalWhatsAppService;
use App\Services\WhatsAppProviderFactory;
use App\Enums\ChannelTypeEnum;
use App\Enums\SenderTypeEnum;
use App\Enums\MessageDirectionEnum;
use App\Enums\TicketStatusEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class WhatsAppController extends Controller
{
    protected WhatsAppService $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * Verificação do webhook (GET) - chamado pelo Meta para verificar o endpoint
     */
    public function verifyWebhook(Request $request): Response
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        // Token de verificação definido no .env
        $verifyToken = config('services.whatsapp.verify_token', 'crm_whatsapp_verify_token');

        $result = WhatsAppService::verifyWebhookToken($mode, $token, $challenge, $verifyToken);

        if ($result) {
            Log::info('WhatsApp webhook verified successfully');
            return response($result, 200);
        }

        Log::warning('WhatsApp webhook verification failed', [
            'mode' => $mode,
            'token' => $token,
        ]);

        return response('Forbidden', 403);
    }

    /**
     * Recebe mensagens do webhook (POST)
     */
    public function receiveWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();

        Log::info('WhatsApp webhook received', ['payload' => $payload]);

        try {
            // Extract phone number ID from webhook
            $phoneNumberId = $payload['entry'][0]['changes'][0]['value']['metadata']['phone_number_id'] ?? null;

            if (!$phoneNumberId) {
                Log::warning('WhatsApp webhook: missing phone_number_id');
                return response()->json(['status' => 'ignored']);
            }

            // Find channel by phone_number_id
            $channel = Channel::where('type', ChannelTypeEnum::WHATSAPP)
                ->whereJsonContains('config->phone_number_id', $phoneNumberId)
                ->first();

            if (!$channel) {
                Log::warning('WhatsApp webhook: channel not found', ['phone_number_id' => $phoneNumberId]);
                return response()->json(['status' => 'channel_not_found']);
            }

            // Process the webhook
            $this->whatsAppService->processIncomingWebhook($payload, $channel);

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('WhatsApp webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Always return 200 to prevent Meta from retrying
            return response()->json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * Envia mensagem via WhatsApp
     */
    public function sendMessage(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:4096',
        ]);

        $channel = $ticket->channel;

        if (!$channel || $channel->type !== ChannelTypeEnum::WHATSAPP) {
            return response()->json([
                'error' => 'Este ticket não está associado a um canal WhatsApp.',
            ], 400);
        }

        $contact = $ticket->contact;
        if (!$contact || !$contact->phone) {
            return response()->json([
                'error' => 'Contato não possui telefone cadastrado.',
            ], 400);
        }

        // Reabre o ticket se estiver fechado
        if ($ticket->status === TicketStatusEnum::CLOSED) {
            $ticket->update([
                'status' => TicketStatusEnum::OPEN,
                'closed_at' => null,
            ]);
        }

        try {
            $this->whatsAppService->loadFromChannel($channel);
            $result = $this->whatsAppService->sendTextMessage($contact->phone, $validated['message']);

            // Save message to database
            $ticketMessage = TicketMessage::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'sender_type' => SenderTypeEnum::USER,
                'sender_id' => auth()->id(),
                'direction' => MessageDirectionEnum::OUTBOUND,
                'message' => $validated['message'],
                'sent_at' => now(),
            ]);

            // Dispatch broadcast event for real-time updates
            event(new \App\Events\TicketMessageCreated($ticketMessage, $ticket));

            return response()->json([
                'success' => true,
                'message' => $ticketMessage,
                'whatsapp_response' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('WhatsApp send message failed', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Envia mídia (imagem, vídeo, áudio, documento) via WhatsApp
     */
    public function sendMedia(Request $request, Ticket $ticket): JsonResponse
    {
        Log::error('[SEND MEDIA DEBUG] sendMedia called', [
            'ticket_id' => $ticket->id,
            'request_data' => $request->all(),
        ]);

        $validated = $request->validate([
            'attachment_id' => 'required|uuid|exists:ticket_message_attachments,id',
            'caption' => 'nullable|string|max:1024',
        ]);

        $channel = $ticket->channel;

        if (!$channel || $channel->type !== ChannelTypeEnum::WHATSAPP) {
            return response()->json([
                'error' => 'Este ticket não está associado a um canal WhatsApp.',
            ], 400);
        }

        $contact = $ticket->contact;
        if (!$contact || !$contact->phone) {
            return response()->json([
                'error' => 'Contato não possui telefone cadastrado.',
            ], 400);
        }

        // Verify attachment belongs to tenant and ticket
        $attachment = TicketMessageAttachment::find($validated['attachment_id']);
        if (!$attachment || $attachment->tenant_id !== $ticket->tenant_id) {
            return response()->json([
                'error' => 'Anexo não encontrado.',
            ], 404);
        }

        if ($attachment->status !== 'confirmed') {
            return response()->json([
                'error' => 'Upload do arquivo não foi confirmado.',
            ], 400);
        }

        // Map file_type to WhatsApp media type
        $mediaTypeMap = [
            'image' => 'image',
            'video' => 'video',
            'audio' => 'audio',
            'document' => 'document',
        ];

        $mediaType = $mediaTypeMap[$attachment->file_type] ?? 'document';

        // Reopen ticket if closed
        if ($ticket->status === TicketStatusEnum::CLOSED) {
            $ticket->update([
                'status' => TicketStatusEnum::OPEN,
                'closed_at' => null,
            ]);
        }

        try {
            $this->whatsAppService->loadFromChannel($channel);

            Log::error('[SEND MEDIA DEBUG] Sending media via WhatsApp', [
                'attachment_id' => $attachment->id,
                'mime_type' => $attachment->mime_type,
                'file_path' => $attachment->file_path,
                'media_type' => $mediaType,
                'file_type' => $attachment->file_type,
            ]);

            // Check if this is an audio file
            $isAudioFile = $mediaType === 'audio' || str_contains($attachment->mime_type ?? '', 'webm');
            // Check if already converted to MP3 by frontend (iOS-safe method)
            $isMp3 = str_contains($attachment->mime_type ?? '', 'mpeg') || str_contains($attachment->mime_type ?? '', 'mp3');

            Log::error('[SEND MEDIA DEBUG] Media type check', [
                'mediaType' => $mediaType,
                'isAudioFile' => $isAudioFile,
                'isMp3' => $isMp3,
                'mime_type' => $attachment->mime_type,
            ]);

            if ($isAudioFile && $isMp3) {
                // MP3 from frontend - send via public URL (iOS-safe method)
                // This is the proven approach that works on all platforms including iOS
                Log::error('[SEND MEDIA DEBUG] Using MP3 via public URL (iOS-safe)', [
                    'file_path' => $attachment->file_path,
                    'mime_type' => $attachment->mime_type,
                ]);

                // Generate public URL for the MP3 file
                $disk = Storage::disk($attachment->storage_disk);
                if (config("filesystems.disks.{$attachment->storage_disk}.driver") === 's3') {
                    // Use longer TTL for WhatsApp to download
                    $mediaUrl = $disk->temporaryUrl($attachment->file_path, now()->addHours(24));
                } else {
                    $mediaUrl = $disk->url($attachment->file_path);
                }

                Log::error('[SEND MEDIA DEBUG] Sending MP3 via link', [
                    'mediaUrl' => $mediaUrl,
                ]);

                // Send via public URL (link method) - works on iOS, Android, Web
                $result = $this->whatsAppService->sendMediaMessage(
                    $contact->phone,
                    'audio',
                    $mediaUrl,
                    null // no caption for audio
                );

                Log::error('[SEND MEDIA DEBUG] sendMediaMessage result', [
                    'result' => $result,
                ]);
            } elseif ($isAudioFile) {
                // Non-MP3 audio (WebM, OGG, etc.) - convert to MP3 and send as voice note
                // Uses upload method with voice:true for PTT appearance on all platforms
                Log::error('[SEND MEDIA DEBUG] Using sendVoiceNoteMP3 (iOS-safe + PTT)', [
                    'file_path' => $attachment->file_path,
                    'mime_type' => $attachment->mime_type,
                ]);

                $voiceResult = $this->whatsAppService->sendVoiceNoteMP3(
                    $contact->phone,
                    $attachment->file_path,
                    $attachment->mime_type
                );

                $result = $voiceResult['result'];
                $mediaUrl = $voiceResult['media_url'];

                Log::error('[SEND MEDIA DEBUG] sendVoiceNoteMP3 result', [
                    'result' => $result,
                    'media_id' => $voiceResult['media_id'],
                    'converted_path' => $voiceResult['converted_path'],
                ]);

                // Update attachment with converted file info
                $attachment->update([
                    'file_path' => $voiceResult['converted_path'],
                    'file_name' => $voiceResult['file_name'],
                    'mime_type' => $voiceResult['mime_type'],
                ]);
            } else {
                // Get public URL for the attachment
                $mediaUrl = $attachment->url;
                
                if (!$mediaUrl) {
                    // Generate temporary URL if needed
                    $disk = Storage::disk($attachment->storage_disk);
                    if (config("filesystems.disks.{$attachment->storage_disk}.driver") === 's3') {
                        $mediaUrl = $disk->temporaryUrl($attachment->file_path, now()->addHour());
                    } else {
                        // For local storage, we need a public URL
                        return response()->json([
                            'error' => 'Não é possível enviar arquivos do storage local via WhatsApp. Configure um storage S3 compatível.',
                        ], 400);
                    }
                }

                $result = $this->whatsAppService->sendMediaMessage(
                    $contact->phone,
                    $mediaType,
                    $mediaUrl,
                    $validated['caption'] ?? null
                );
            }

            // Create message record
            $caption = $validated['caption'] ?? null;
            $messageContent = $caption 
                ? "[{$attachment->file_type}: {$attachment->file_name}] {$caption}"
                : "[{$attachment->file_type}: {$attachment->file_name}]";

            $ticketMessage = TicketMessage::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'sender_type' => SenderTypeEnum::USER,
                'sender_id' => auth()->id(),
                'direction' => MessageDirectionEnum::OUTBOUND,
                'message' => $messageContent,
                'sent_at' => now(),
                'metadata' => [
                    'attachment_id' => $attachment->id,
                    'media_type' => $mediaType,
                    'media_url' => $mediaUrl,
                    'file_name' => $attachment->file_name,
                    'file_size' => $attachment->file_size,
                    'mime_type' => $attachment->mime_type,
                ],
            ]);

            // Associate attachment with message and update URL
            $attachment->update([
                'ticket_message_id' => $ticketMessage->id,
                'url' => $mediaUrl, // Store the accessible URL
            ]);
            
            // Refresh attachment to get updated URL
            $attachment->refresh();

            // Dispatch broadcast event for real-time updates
            event(new \App\Events\TicketMessageCreated($ticketMessage, $ticket));

            return response()->json([
                'success' => true,
                'message' => $ticketMessage->load('attachments'),
                'attachment' => $attachment,
                'whatsapp_response' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('WhatsApp send media failed', [
                'ticket_id' => $ticket->id,
                'attachment_id' => $attachment->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Envia template via WhatsApp
     */
    public function sendTemplate(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'template_name' => 'required|string',
            'language_code' => 'nullable|string',
            'components' => 'nullable|array',
        ]);

        $channel = $ticket->channel;

        if (!$channel || $channel->type !== ChannelTypeEnum::WHATSAPP) {
            return response()->json([
                'error' => 'Este ticket não está associado a um canal WhatsApp.',
            ], 400);
        }

        $contact = $ticket->contact;
        if (!$contact || !$contact->phone) {
            return response()->json([
                'error' => 'Contato não possui telefone cadastrado.',
            ], 400);
        }

        try {
            $this->whatsAppService->loadFromChannel($channel);
            $result = $this->whatsAppService->sendTemplateMessage(
                $contact->phone,
                $validated['template_name'],
                $validated['language_code'] ?? 'pt_BR',
                $validated['components'] ?? []
            );

            // Save message to database
            $ticketMessage = TicketMessage::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'sender_type' => SenderTypeEnum::USER,
                'sender_id' => auth()->id(),
                'direction' => MessageDirectionEnum::OUTBOUND,
                'message' => "[Template: {$validated['template_name']}]",
                'sent_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => $ticketMessage,
                'whatsapp_response' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Proxy para baixar mídia do WhatsApp
     * A URL do Meta requer autenticação, então fazemos proxy pelo backend
     */
    public function proxyMedia(Request $request, Ticket $ticket): \Illuminate\Http\Response|\Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'media_url' => 'required|url',
        ]);

        $channel = $ticket->channel;

        if (!$channel || $channel->type !== ChannelTypeEnum::WHATSAPP) {
            return response()->json([
                'error' => 'Este ticket não está associado a um canal WhatsApp.',
            ], 400);
        }

        // Verify tenant
        if ($ticket->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['error' => 'Não autorizado.'], 403);
        }

        try {
            $this->whatsAppService->loadFromChannel($channel);
            $accessToken = $channel->config['access_token'] ?? null;

            if (!$accessToken) {
                return response()->json(['error' => 'Canal não configurado.'], 400);
            }

            Log::info('Proxy media request', [
                'ticket_id' => $ticket->id,
                'media_url' => substr($validated['media_url'], 0, 100) . '...',
            ]);

            // Download media from Meta
            $response = \Illuminate\Support\Facades\Http::withToken($accessToken)
                ->timeout(30)
                ->get($validated['media_url']);

            if (!$response->successful()) {
                Log::warning('Proxy media failed - Meta returned error', [
                    'ticket_id' => $ticket->id,
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 200),
                ]);
                return response()->json([
                    'error' => 'Mídia não disponível. Pode ter expirado.',
                ], $response->status());
            }

            $contentType = $response->header('Content-Type') ?? 'application/octet-stream';

            return response($response->body())
                ->header('Content-Type', $contentType)
                ->header('Cache-Control', 'public, max-age=86400'); // Cache for 24h

        } catch (\Exception $e) {
            Log::error('WhatsApp media proxy failed', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Configura canal WhatsApp
     */
    public function configureChannel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel_id' => 'required|uuid|exists:channels,id',
            'phone_number_id' => 'required|string',
            'access_token' => 'required|string',
            'business_account_id' => 'nullable|string',
            'webhook_verify_token' => 'nullable|string',
        ]);

        $channel = Channel::find($validated['channel_id']);

        if ($channel->type !== ChannelTypeEnum::WHATSAPP) {
            return response()->json([
                'error' => 'Este canal não é do tipo WhatsApp.',
            ], 400);
        }

        $channel->update([
            'config' => [
                'phone_number_id' => $validated['phone_number_id'],
                'access_token' => $validated['access_token'],
                'business_account_id' => $validated['business_account_id'] ?? null,
                'webhook_verify_token' => $validated['webhook_verify_token'] ?? 'crm_whatsapp_verify_token',
                'configured_at' => now()->toIso8601String(),
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Canal WhatsApp configurado com sucesso.',
            'channel' => $channel,
            'webhook_url' => url('/api/webhooks/whatsapp'),
        ]);
    }

    /**
     * Testa conexão com WhatsApp
     */
    public function testConnection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone_number_id' => 'required|string',
            'access_token' => 'required|string',
        ]);

        try {
            $response = \Illuminate\Support\Facades\Http::withToken($validated['access_token'])
                ->get("https://graph.facebook.com/v18.0/{$validated['phone_number_id']}");

            if ($response->successful()) {
                $data = $response->json();
                return response()->json([
                    'success' => true,
                    'message' => 'Conexão estabelecida com sucesso!',
                    'phone_number' => $data['display_phone_number'] ?? null,
                    'verified_name' => $data['verified_name'] ?? null,
                    'quality_rating' => $data['quality_rating'] ?? null,
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Erro desconhecido',
            ], 400);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // =========================================================================
    // INTERNAL WHATSAPP API (Whatsmeow) ENDPOINTS
    // =========================================================================

    /**
     * Get available WhatsApp providers.
     */
    public function getProviders(): JsonResponse
    {
        return response()->json([
            'providers' => WhatsAppProviderFactory::getAvailableProviders(),
        ]);
    }

    /**
     * Create a new internal WhatsApp session for a channel.
     */
    public function createInternalSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel_id' => 'required|uuid|exists:channels,id',
        ]);

        $channel = Channel::find($validated['channel_id']);

        if ($channel->type !== ChannelTypeEnum::WHATSAPP) {
            return response()->json([
                'error' => 'Este canal nao e do tipo WhatsApp.',
            ], 400);
        }

        if ($channel->provider_type !== 'internal') {
            return response()->json([
                'error' => 'Este canal nao esta configurado para usar o provider interno.',
            ], 400);
        }

        try {
            $internalService = app(InternalWhatsAppService::class);
            $result = $internalService->createSession($channel->id);

            // Save session ID to channel
            $channel->update(['internal_session_id' => $result['session_id']]);

            return response()->json([
                'success' => true,
                'session_id' => $result['session_id'],
                'message' => 'Sessao criada com sucesso. Conecte para obter o QR Code.',
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to create internal WhatsApp session', [
                'channel_id' => $channel->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Connect internal session and get QR code.
     */
    public function connectInternalSession(Channel $channel): JsonResponse
    {
        if ($channel->type !== ChannelTypeEnum::WHATSAPP || $channel->provider_type !== 'internal') {
            return response()->json([
                'error' => 'Canal nao configurado para WhatsApp interno.',
            ], 400);
        }

        // Create session if not exists
        if (!$channel->internal_session_id) {
            try {
                $internalService = app(InternalWhatsAppService::class);
                $result = $internalService->createSession($channel->id);
                $channel->update(['internal_session_id' => $result['session_id']]);
                $channel->refresh();
            } catch (\Exception $e) {
                return response()->json([
                    'error' => 'Falha ao criar sessao: ' . $e->getMessage(),
                ], 500);
            }
        }

        try {
            $internalService = app(InternalWhatsAppService::class);
            $internalService->loadFromChannel($channel);
            $result = $internalService->connectSession();

            return response()->json($result);

        } catch (\Exception $e) {
            Log::error('Failed to connect internal WhatsApp session', [
                'channel_id' => $channel->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get current QR code for internal session.
     */
    public function getInternalQRCode(Channel $channel): JsonResponse
    {
        if ($channel->type !== ChannelTypeEnum::WHATSAPP || $channel->provider_type !== 'internal') {
            return response()->json([
                'error' => 'Canal nao configurado para WhatsApp interno.',
            ], 400);
        }

        if (!$channel->internal_session_id) {
            return response()->json([
                'error' => 'Sessao nao existe. Conecte primeiro.',
            ], 400);
        }

        try {
            $internalService = app(InternalWhatsAppService::class);
            $internalService->loadFromChannel($channel);
            $result = $internalService->getQRCode();

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get internal session connection status.
     */
    public function getInternalStatus(Channel $channel): JsonResponse
    {
        if ($channel->type !== ChannelTypeEnum::WHATSAPP || $channel->provider_type !== 'internal') {
            return response()->json([
                'error' => 'Canal nao configurado para WhatsApp interno.',
            ], 400);
        }

        try {
            $internalService = app(InternalWhatsAppService::class);
            $internalService->loadFromChannel($channel);
            $result = $internalService->getConnectionStatus();

            // Also include channel config status
            $result['channel_config'] = [
                'internal_connected' => $channel->config['internal_connected'] ?? false,
                'internal_phone_number' => $channel->config['internal_phone_number'] ?? null,
                'connected_at' => $channel->config['connected_at'] ?? null,
            ];

            return response()->json($result);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'connected' => false,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Disconnect internal session.
     */
    public function disconnectInternalSession(Channel $channel): JsonResponse
    {
        if ($channel->type !== ChannelTypeEnum::WHATSAPP || $channel->provider_type !== 'internal') {
            return response()->json([
                'error' => 'Canal nao configurado para WhatsApp interno.',
            ], 400);
        }

        if (!$channel->internal_session_id) {
            return response()->json([
                'error' => 'Sessao nao existe.',
            ], 400);
        }

        try {
            $internalService = app(InternalWhatsAppService::class);
            $internalService->loadFromChannel($channel);
            $result = $internalService->disconnectSession();

            // Update channel config
            $config = $channel->config ?? [];
            $config['internal_connected'] = false;
            $config['disconnected_at'] = now()->toIso8601String();
            $channel->update(['config' => $config]);

            return response()->json([
                'success' => true,
                'message' => 'Sessao desconectada.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete internal session completely.
     */
    public function deleteInternalSession(Channel $channel): JsonResponse
    {
        if ($channel->type !== ChannelTypeEnum::WHATSAPP || $channel->provider_type !== 'internal') {
            return response()->json([
                'error' => 'Canal nao configurado para WhatsApp interno.',
            ], 400);
        }

        if (!$channel->internal_session_id) {
            return response()->json([
                'error' => 'Sessao nao existe.',
            ], 400);
        }

        try {
            $internalService = app(InternalWhatsAppService::class);
            $internalService->loadFromChannel($channel);
            $result = $internalService->deleteSession();

            // Clear session from channel
            $config = $channel->config ?? [];
            $config['internal_connected'] = false;
            $config['disconnected_at'] = now()->toIso8601String();
            $channel->update([
                'internal_session_id' => null,
                'config' => $config,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Sessao removida completamente.',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Simula recebimento de mensagem WhatsApp para testes locais.
     *
     * USO: POST /api/webhooks/simulate-message
     * BODY: { "ticket_id": "uuid", "message": "texto da mensagem" }
     */
    public function simulateMessage(Request $request): JsonResponse
    {
        // Apenas em ambiente local/dev
        if (app()->environment('production')) {
            return response()->json(['error' => 'Not available in production'], 403);
        }

        $validated = $request->validate([
            'ticket_id' => 'required|uuid|exists:tickets,id',
            'message' => 'required|string|max:4096',
        ]);

        try {
            $ticket = Ticket::with(['lead', 'channel', 'contact'])->findOrFail($validated['ticket_id']);
            $channel = $ticket->channel;

            if (!$channel) {
                return response()->json(['error' => 'Channel not found'], 404);
            }

            // Configura o serviço com o canal
            $this->whatsAppService->loadFromChannel($channel);

            // Simula o payload do webhook do WhatsApp
            $simulatedPayload = [
                'entry' => [[
                    'changes' => [[
                        'value' => [
                            'metadata' => [
                                'phone_number_id' => $channel->config['phone_number_id'] ?? 'simulated',
                            ],
                            'messages' => [[
                                'id' => 'simulated_' . time(),
                                'from' => $ticket->contact->phone ?? '5511999999999',
                                'timestamp' => time(),
                                'type' => 'text',
                                'text' => [
                                    'body' => $validated['message'],
                                ],
                            ]],
                            'contacts' => [[
                                'profile' => [
                                    'name' => $ticket->contact->name ?? 'Contato Simulado',
                                ],
                                'wa_id' => $ticket->contact->phone ?? '5511999999999',
                            ]],
                        ],
                    ]],
                ]],
            ];

            // Processa o webhook simulado
            $this->whatsAppService->processIncomingWebhook($simulatedPayload, $channel);

            return response()->json([
                'success' => true,
                'message' => 'Mensagem simulada processada com sucesso',
                'ticket_id' => $ticket->id,
                'simulated_message' => $validated['message'],
            ]);

        } catch (\Exception $e) {
            Log::error('Simulate message error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

