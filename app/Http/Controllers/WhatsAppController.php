<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\TicketMessageAttachment;
use App\Services\WhatsAppService;
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

            Log::info('Sending media via WhatsApp', [
                'attachment_id' => $attachment->id,
                'mime_type' => $attachment->mime_type,
                'file_path' => $attachment->file_path,
                'media_type' => $mediaType,
            ]);

            // Use direct upload for all audio files (more reliable than URL method)
            // WhatsApp often can't access S3 URLs due to timing/security issues
            $needsDirectUpload = $mediaType === 'audio' || str_contains($attachment->mime_type ?? '', 'webm');

            // Audio files should be sent as voice notes (PTT) for better UX
            // This makes them appear as "mensagem de voz" instead of "arquivo de áudio"
            $sendAsVoiceNote = $mediaType === 'audio';

            if ($needsDirectUpload) {
                // Upload file directly to WhatsApp, then send using media_id
                Log::info('Using direct upload for audio/unsupported format', [
                    'mime_type' => $attachment->mime_type,
                    'file_path' => $attachment->file_path,
                    'as_voice_note' => $sendAsVoiceNote,
                ]);

                // Upload with voice note conversion (OGG OPUS) for audio files
                $uploadResult = $this->whatsAppService->uploadMedia(
                    $attachment->file_path,
                    $attachment->mime_type,
                    $sendAsVoiceNote // Convert to OGG OPUS if true
                );

                $mediaId = $uploadResult['media_id'];
                $convertedPath = $uploadResult['converted_path'];
                $convertedMimeType = $uploadResult['mime_type'];
                $isVoiceNote = $uploadResult['is_voice_note'] ?? false;

                // Send with voice:true flag if converted to OGG OPUS
                $result = $this->whatsAppService->sendMediaById(
                    $contact->phone,
                    $mediaType,
                    $mediaId,
                    $validated['caption'] ?? null,
                    $isVoiceNote // voice:true makes it appear as voice message
                );

                Log::info('Audio sent as voice note (PTT)', [
                    'is_voice_note' => $isVoiceNote,
                    'converted_mime' => $convertedMimeType,
                ]);

                // Use the converted file URL for display in chat
                $disk = Storage::disk($attachment->storage_disk);
                if (config("filesystems.disks.{$attachment->storage_disk}.driver") === 's3') {
                    $mediaUrl = $disk->temporaryUrl($convertedPath, now()->addDays(7));
                } else {
                    $mediaUrl = $disk->url($convertedPath);
                }

                // Update attachment with converted file info
                $attachment->update([
                    'file_path' => $convertedPath,
                    'mime_type' => $convertedMimeType,
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

