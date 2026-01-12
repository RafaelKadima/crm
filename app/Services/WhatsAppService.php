<?php

namespace App\Services;

use App\Contracts\WhatsAppProviderInterface;
use App\Events\TicketMessageCreated;
use App\Models\Channel;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Enums\ChannelTypeEnum;
use App\Enums\SenderTypeEnum;
use App\Enums\MessageDirectionEnum;
use App\Enums\TicketStatusEnum;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService implements WhatsAppProviderInterface
{
    protected string $apiVersion = 'v18.0';
    protected string $baseUrl;
    protected ?string $phoneNumberId;
    protected ?string $accessToken;
    protected ?string $businessAccountId;

    public function __construct(?Channel $channel = null)
    {
        $this->baseUrl = "https://graph.facebook.com/{$this->apiVersion}";
        
        if ($channel) {
            $this->loadFromChannel($channel);
        }
    }

    /**
     * Carrega configurações do canal
     */
    public function loadFromChannel(Channel $channel): self
    {
        $config = $channel->config ?? [];
        
        $this->phoneNumberId = $config['phone_number_id'] ?? null;
        $this->accessToken = $config['access_token'] ?? null;
        $this->businessAccountId = $config['business_account_id'] ?? null;

        return $this;
    }

    /**
     * Configura manualmente (para testes)
     */
    public function configure(string $phoneNumberId, string $accessToken, ?string $businessAccountId = null): self
    {
        $this->phoneNumberId = $phoneNumberId;
        $this->accessToken = $accessToken;
        $this->businessAccountId = $businessAccountId;

        return $this;
    }

    /**
     * Envia mensagem de texto
     */
    public function sendTextMessage(string $to, string $message): array
    {
        $this->validateConfig();

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $this->formatPhoneNumber($to),
                'type' => 'text',
                'text' => [
                    'preview_url' => true,
                    'body' => $message,
                ],
            ]);

        $result = $response->json();

        if (!$response->successful()) {
            Log::error('WhatsApp send message failed', [
                'to' => $to,
                'error' => $result,
            ]);
            throw new \Exception($result['error']['message'] ?? 'Erro ao enviar mensagem');
        }

        Log::info('WhatsApp message sent', [
            'to' => $to,
            'message_id' => $result['messages'][0]['id'] ?? null,
        ]);

        return $result;
    }

    /**
     * Envia template de mensagem
     */
    public function sendTemplateMessage(string $to, string $templateName, string $languageCode = 'pt_BR', array $components = []): array
    {
        $this->validateConfig();

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => [
                    'code' => $languageCode,
                ],
            ],
        ];

        if (!empty($components)) {
            $payload['template']['components'] = $components;
        }

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/messages", $payload);

        $result = $response->json();

        if (!$response->successful()) {
            Log::error('WhatsApp send template failed', [
                'to' => $to,
                'template' => $templateName,
                'error' => $result,
            ]);
            throw new \Exception($result['error']['message'] ?? 'Erro ao enviar template');
        }

        return $result;
    }

    /**
     * Envia mensagem com mídia (imagem, documento, áudio, vídeo) via URL
     */
    public function sendMediaMessage(string $to, string $type, string $mediaUrl, ?string $caption = null): array
    {
        $this->validateConfig();

        $mediaTypes = ['image', 'document', 'audio', 'video', 'sticker'];
        if (!in_array($type, $mediaTypes)) {
            throw new \Exception("Tipo de mídia inválido: {$type}");
        }

        $mediaPayload = ['link' => $mediaUrl];
        if ($caption && in_array($type, ['image', 'video', 'document'])) {
            $mediaPayload['caption'] = $caption;
        }

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $this->formatPhoneNumber($to),
                'type' => $type,
                $type => $mediaPayload,
            ]);

        $result = $response->json();

        if (!$response->successful()) {
            throw new \Exception($result['error']['message'] ?? 'Erro ao enviar mídia');
        }

        return $result;
    }

    /**
     * Upload media file directly to WhatsApp (for formats like WebM that need processing)
     * Returns array with media_id and converted_path (if conversion happened)
     *
     * @param string $filePath Path to the file on storage disk
     * @param string $mimeType Original MIME type of the file
     * @param bool $asVoiceNote If true and file is audio, converts to OGG OPUS for PTT
     * @return array{media_id: string, converted_path: string, mime_type: string, is_voice_note: bool}
     */
    public function uploadMedia(string $filePath, string $mimeType, bool $asVoiceNote = false): array
    {
        $this->validateConfig();

        $disk = \Illuminate\Support\Facades\Storage::disk('media');

        if (!$disk->exists($filePath)) {
            throw new \Exception("Arquivo não encontrado: {$filePath}");
        }

        $fileContents = $disk->get($filePath);
        $fileName = basename($filePath);
        $isVoiceNote = false;

        // WhatsApp accepts: audio/ogg, audio/opus, audio/mpeg, audio/amr, audio/mp4, audio/aac
        // For voice notes (PTT), MUST use OGG OPUS format + voice:true flag
        $normalizedMimeType = $mimeType;

        // Check if this is an audio file
        $isAudio = str_contains($mimeType, 'audio') || str_contains($mimeType, 'webm');

        // For audio files that should be sent as voice notes, convert to OGG OPUS
        if ($isAudio && $asVoiceNote) {
            Log::error('[PTT DEBUG] Starting conversion', ['filePath' => $filePath, 'mimeType' => $mimeType]);
            $convertedPath = $this->convertToOggOpus($disk, $filePath);
            Log::error('[PTT DEBUG] Conversion result', ['convertedPath' => $convertedPath]);
            if ($convertedPath) {
                $filePath = $convertedPath;
                $fileContents = $disk->get($filePath);
                // MUST use .ogg extension and audio/ogg MIME type for WhatsApp Mobile
                // WebM container does NOT work on mobile even with opus codec!
                // CRITICAL: WhatsApp Mobile REJECTS "audio/ogg; codecs=opus" - use ONLY "audio/ogg"
                // CRITICAL FOR iOS: filename extension MUST be .ogg - iOS validates extension + MIME + header
                $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
                $fileName = $fileNameWithoutExt . '.ogg'; // Force .ogg extension for iOS compatibility
                $normalizedMimeType = 'audio/ogg'; // NO parameters! Mobile rejects ; codecs=opus
                $isVoiceNote = true;
                Log::error('[PTT DEBUG] Conversion successful, using OGG container', [
                    'new_path' => $filePath,
                    'mime_type' => $normalizedMimeType,
                    'file_name' => $fileName,
                    'original_name' => basename($filePath),
                ]);
            } else {
                // Fallback to MP3 if OGG conversion fails (won't be PTT but will work)
                Log::warning('OGG OPUS conversion failed, falling back to MP3');
                if (str_contains($mimeType, 'webm')) {
                    $convertedPath = $this->convertWebmToMp3($disk, $filePath);
                    if ($convertedPath) {
                        $filePath = $convertedPath;
                        $fileContents = $disk->get($filePath);
                        $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
                        $fileName = $fileNameWithoutExt . '.mp3';
                        $normalizedMimeType = 'audio/mpeg';
                    } else {
                        throw new \Exception('FFmpeg não disponível. Instale FFmpeg para enviar áudios via WhatsApp.');
                    }
                }
            }
        }
        // For WebM without voice note flag, convert to MP3 (legacy behavior)
        elseif (str_contains($mimeType, 'webm')) {
            $convertedPath = $this->convertWebmToMp3($disk, $filePath);
            if ($convertedPath) {
                $filePath = $convertedPath;
                $fileContents = $disk->get($filePath);
                $fileNameWithoutExt = pathinfo($fileName, PATHINFO_FILENAME);
                $fileName = $fileNameWithoutExt . '.mp3';
                $normalizedMimeType = 'audio/mpeg';
                Log::info('Converted WebM to MP3', ['new_path' => $filePath, 'file_name' => $fileName]);
            } else {
                throw new \Exception('FFmpeg não disponível. Instale FFmpeg para enviar áudios via WhatsApp.');
            }
        }
        // Ensure audio/mp4 not video/mp4
        elseif (str_contains($mimeType, 'mp4') && !str_contains($mimeType, 'audio')) {
            $normalizedMimeType = 'audio/mp4';
        }

        Log::error('[PTT DEBUG] Uploading media to WhatsApp', [
            'original_mime' => $mimeType,
            'normalized_mime' => $normalizedMimeType,
            'file_name' => $fileName,
            'file_size' => strlen($fileContents),
            'as_voice_note' => $asVoiceNote,
            'is_voice_note' => $isVoiceNote,
        ]);

        // Upload to WhatsApp Media API
        $response = Http::withToken($this->accessToken)
            ->attach('file', $fileContents, $fileName, ['Content-Type' => $normalizedMimeType])
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/media", [
                'messaging_product' => 'whatsapp',
                'type' => $normalizedMimeType,
            ]);

        $result = $response->json();

        if (!$response->successful() || !isset($result['id'])) {
            Log::error('WhatsApp media upload failed', [
                'status' => $response->status(),
                'response' => $result,
                'mime_type' => $normalizedMimeType,
            ]);
            throw new \Exception($result['error']['message'] ?? 'Erro ao fazer upload da mídia');
        }

        Log::info('WhatsApp media uploaded', ['media_id' => $result['id'], 'is_voice_note' => $isVoiceNote]);

        return [
            'media_id' => $result['id'],
            'converted_path' => $filePath, // Returns the converted file path (e.g., .ogg instead of .webm)
            'mime_type' => $normalizedMimeType,
            'is_voice_note' => $isVoiceNote, // True if converted to OGG OPUS for PTT
        ];
    }

    /**
     * Send media message using media_id (after uploading via uploadMedia)
     *
     * @param string $to Recipient phone number
     * @param string $type Media type (image, video, audio, document, sticker)
     * @param string $mediaId WhatsApp media ID from uploadMedia()
     * @param string|null $caption Caption for the media (not supported for audio)
     * @param bool $voice If true and type is 'audio', sends as voice note (PTT) instead of audio file
     */
    public function sendMediaById(string $to, string $type, string $mediaId, ?string $caption = null, bool $voice = false): array
    {
        $this->validateConfig();

        $mediaTypes = ['image', 'document', 'audio', 'video', 'sticker'];
        if (!in_array($type, $mediaTypes)) {
            throw new \Exception("Tipo de mídia inválido: {$type}");
        }

        $mediaPayload = ['id' => $mediaId];

        if ($caption && in_array($type, ['image', 'video', 'document'])) {
            $mediaPayload['caption'] = $caption;
        }

        // Para áudio com voice=true, envia como nota de voz (PTT - Push To Talk)
        // Isso faz o áudio aparecer como "mensagem de voz" no WhatsApp, não como arquivo
        if ($type === 'audio' && $voice) {
            $mediaPayload['voice'] = true;
            Log::info('Sending audio as voice note (PTT)', ['media_id' => $mediaId]);
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => $type,
            $type => $mediaPayload,
        ];

        Log::info('Sending media by ID to WhatsApp', [
            'to' => $this->formatPhoneNumber($to),
            'media_id' => $mediaId,
            'type' => $type,
            'voice' => $voice,
        ]);

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/messages", $payload);

        $result = $response->json();

        Log::info('WhatsApp send media response', [
            'status' => $response->status(),
            'response' => $result,
        ]);

        if (!$response->successful()) {
            throw new \Exception($result['error']['message'] ?? 'Erro ao enviar mídia');
        }

        return $result;
    }

    /**
     * Send voice note (PTT) - iOS-safe method
     *
     * This method handles the complete flow for sending voice notes that work on ALL platforms,
     * especially iOS which is very strict about format validation.
     *
     * iOS Requirements (ALL must be met):
     * - Container: OGG (not WebM)
     * - Codec: OPUS
     * - Sample rate: 16000 Hz
     * - MIME type: audio/ogg (no parameters!)
     * - Filename extension: .ogg (iOS validates this!)
     * - Upload via /media endpoint (not URL)
     * - Send with voice:true flag
     *
     * @param string $to Recipient phone number
     * @param string $filePath Path to audio file in storage
     * @param string $mimeType Original MIME type of the file
     * @return array Result from WhatsApp API
     */
    public function sendVoiceNotePTT(string $to, string $filePath, string $mimeType): array
    {
        $this->validateConfig();

        Log::error('[PTT iOS-SAFE] Starting voice note send', [
            'to' => $to,
            'file_path' => $filePath,
            'original_mime' => $mimeType,
        ]);

        $disk = \Illuminate\Support\Facades\Storage::disk('media');

        if (!$disk->exists($filePath)) {
            throw new \Exception("Arquivo não encontrado: {$filePath}");
        }

        // Step 1: Convert to OGG OPUS (iOS-compatible format)
        $convertedPath = $this->convertToOggOpus($disk, $filePath);

        if (!$convertedPath) {
            throw new \Exception('Falha na conversão do áudio para OGG OPUS. Verifique se FFmpeg está instalado.');
        }

        Log::error('[PTT iOS-SAFE] Conversion complete', [
            'converted_path' => $convertedPath,
        ]);

        // Step 2: Read converted file
        $fileContents = $disk->get($convertedPath);

        // Step 3: Force correct filename with .ogg extension (CRITICAL for iOS!)
        $originalFileName = pathinfo($filePath, PATHINFO_FILENAME);
        $fileName = $originalFileName . '.ogg';

        // Step 4: Force correct MIME type (CRITICAL for iOS - no parameters!)
        $mimeType = 'audio/ogg';

        Log::error('[PTT iOS-SAFE] Uploading to WhatsApp', [
            'file_name' => $fileName,
            'mime_type' => $mimeType,
            'file_size' => strlen($fileContents),
        ]);

        // Step 5: Upload to WhatsApp Media API
        $uploadResponse = Http::withToken($this->accessToken)
            ->attach('file', $fileContents, $fileName, ['Content-Type' => $mimeType])
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/media", [
                'messaging_product' => 'whatsapp',
                'type' => $mimeType,
            ]);

        $uploadResult = $uploadResponse->json();

        if (!$uploadResponse->successful() || !isset($uploadResult['id'])) {
            Log::error('[PTT iOS-SAFE] Upload failed', [
                'status' => $uploadResponse->status(),
                'response' => $uploadResult,
            ]);
            throw new \Exception($uploadResult['error']['message'] ?? 'Erro ao fazer upload da mídia');
        }

        $mediaId = $uploadResult['id'];

        Log::error('[PTT iOS-SAFE] Upload successful, sending message', [
            'media_id' => $mediaId,
        ]);

        // Step 6: Send as voice note with voice:true (CRITICAL for PTT appearance)
        $sendPayload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'audio',
            'audio' => [
                'id' => $mediaId,
                'voice' => true, // Makes it appear as voice message, not audio file
            ],
        ];

        Log::error('[PTT iOS-SAFE] Sending with payload', [
            'payload' => $sendPayload,
        ]);

        $sendResponse = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/messages", $sendPayload);

        $sendResult = $sendResponse->json();

        if (!$sendResponse->successful()) {
            Log::error('[PTT iOS-SAFE] Send failed', [
                'status' => $sendResponse->status(),
                'response' => $sendResult,
            ]);
            throw new \Exception($sendResult['error']['message'] ?? 'Erro ao enviar mensagem de voz');
        }

        Log::error('[PTT iOS-SAFE] Success!', [
            'message_id' => $sendResult['messages'][0]['id'] ?? null,
        ]);

        return [
            'result' => $sendResult,
            'media_id' => $mediaId,
            'converted_path' => $convertedPath,
            'file_name' => $fileName,
            'mime_type' => $mimeType,
        ];
    }

    /**
     * Marca mensagem como lida
     */
    public function markAsRead(string $messageId): bool
    {
        $this->validateConfig();

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'status' => 'read',
                'message_id' => $messageId,
            ]);

        return $response->successful();
    }

    /**
     * Processa webhook de mensagem recebida
     */
    public function processIncomingWebhook(array $payload, Channel $channel): ?TicketMessage
    {
        $entry = $payload['entry'][0] ?? null;
        if (!$entry) return null;

        $changes = $entry['changes'][0] ?? null;
        if (!$changes || $changes['field'] !== 'messages') return null;

        $value = $changes['value'] ?? null;
        if (!$value) return null;

        // Status updates (delivered, read, etc)
        if (isset($value['statuses'])) {
            $this->processStatusUpdate($value['statuses'][0]);
            return null;
        }

        $message = $value['messages'][0] ?? null;
        if (!$message) return null;

        $contactInfo = $value['contacts'][0] ?? null;
        $phoneNumber = $message['from'];
        $messageType = $message['type'];
        $messageId = $message['id'];
        $timestamp = $message['timestamp'];

        // Find or create contact
        $contact = $this->findOrCreateContact($channel, $phoneNumber, $contactInfo);

        // Find or create ticket
        $ticket = $this->findOrCreateTicket($channel, $contact);

        // Extract message content and media metadata
        $content = $this->extractMessageContent($message);

        // =====================
        // 🛠️ VERIFICAR APROVAÇÃO DE FIX
        // Intercepta mensagens de desenvolvedores aprovadores
        // =====================
        $fixApprovalResult = $this->checkFixApprovalMessage($content, $phoneNumber, $channel);
        if ($fixApprovalResult) {
            Log::info('Fix approval message processed', [
                'phone' => $phoneNumber,
                'action' => $fixApprovalResult['action'],
            ]);
            // Não cria ticket normal, apenas retorna
            return null;
        }
        $metadata = $this->extractMediaMetadata($message, $channel);

        // Create ticket message
        $ticketMessage = TicketMessage::create([
            'tenant_id' => $channel->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::CONTACT,
            'sender_id' => $contact->id,
            'direction' => MessageDirectionEnum::INBOUND,
            'message' => $content,
            'metadata' => $metadata,
            'sent_at' => now(),
        ]);

        // Update ticket last message
        $ticket->update(['updated_at' => now()]);

        // 🔥 Disparar evento broadcast para notificar o frontend em tempo real
        event(new TicketMessageCreated($ticketMessage, $ticket));

        // =====================
        // 🔀 ROTEAMENTO DE FILAS (INDEPENDENTE DA IA)
        // O menu de filas é uma funcionalidade de ROTEAMENTO, não de IA.
        // Deve aparecer mesmo com IA desabilitada para o ticket.
        // =====================
        if ($ticket->lead && $channel->hasQueueMenu()) {
            $routingService = app(\App\Services\QueueRoutingService::class);

            if ($routingService->needsQueueMenu($ticket->lead, $channel)) {
                // Lead precisa escolher fila - processa menu (independente da IA)
                $this->handleQueueMenuRouting($ticketMessage, $ticket, $ticket->lead, $channel, $routingService);

                // Mark as read e retorna (menu foi processado)
                $this->loadFromChannel($channel);
                $this->markAsRead($messageId);
                return $ticketMessage;
            }
        }

        // =====================
        // 🤖 RESPOSTA DA IA (após roteamento de filas)
        // =====================
        if ($channel->hasIa() && $ticket->lead) {
            if ($ticket->hasIaEnabled()) {
                // IA habilitada: responde automaticamente
                $this->triggerSdrResponse($ticketMessage, $ticket, $ticket->lead, $channel);
            } else {
                // IA desabilitada: apenas salva contexto para aprendizado
                Log::info('IA disabled for ticket, skipping auto-response but saving for learning', [
                    'ticket_id' => $ticket->id,
                    'lead_id' => $ticket->lead_id,
                    'disabled_by' => $ticket->ia_disabled_by,
                ]);
                
                // Salva contexto para memória/aprendizado mesmo sem responder
                $this->saveContextForLearning($ticketMessage, $ticket, $channel);
            }
        }

        // Mark as read
        $this->loadFromChannel($channel);
        $this->markAsRead($messageId);

        Log::info('WhatsApp message received', [
            'from' => $phoneNumber,
            'ticket_id' => $ticket->id,
            'message_id' => $ticketMessage->id,
        ]);

        return $ticketMessage;
    }

    /**
     * Encontra ou cria contato
     */
    protected function findOrCreateContact(Channel $channel, string $phone, ?array $contactInfo): Contact
    {
        $formattedPhone = $this->formatPhoneNumber($phone);

        $contact = Contact::where('tenant_id', $channel->tenant_id)
            ->where('phone', $formattedPhone)
            ->first();

        if (!$contact) {
            $name = $contactInfo['profile']['name'] ?? "WhatsApp {$phone}";
            
            $contact = Contact::create([
                'tenant_id' => $channel->tenant_id,
                'name' => $name,
                'phone' => $formattedPhone,
            ]);
        }

        return $contact;
    }

    /**
     * Encontra ou cria ticket
     */
    protected function findOrCreateTicket(Channel $channel, Contact $contact): Ticket
    {
        // SEMPRE garantir que existe um lead para o contato
        $lead = $this->findOrCreateLead($channel, $contact);

        // Find open ticket for this contact
        $ticket = Ticket::where('tenant_id', $channel->tenant_id)
            ->where('contact_id', $contact->id)
            ->where('channel_id', $channel->id)
            ->whereNotIn('status', [TicketStatusEnum::CLOSED])
            ->first();

        if (!$ticket) {
            $ticket = Ticket::create([
                'tenant_id' => $channel->tenant_id,
                'contact_id' => $contact->id,
                'channel_id' => $channel->id,
                'lead_id' => $lead->id,
                'status' => TicketStatusEnum::OPEN,
            ]);

            Log::info('Ticket created from WhatsApp', ['ticket_id' => $ticket->id, 'lead_id' => $lead->id]);
        } else if (!$ticket->lead_id) {
            // Se ticket existe mas não tem lead, associa
            $ticket->update(['lead_id' => $lead->id]);
            Log::info('Ticket associated with lead', ['ticket_id' => $ticket->id, 'lead_id' => $lead->id]);
        }

        return $ticket;
    }

    /**
     * Encontra ou cria lead para o contato
     * 
     * IMPORTANTE: Se o canal tem menu de filas habilitado, o lead é criado
     * SEM owner_id. A distribuição acontece DEPOIS que o lead escolher a fila.
     * Isso evita atribuir o lead a um vendedor errado antes da escolha do setor.
     */
    protected function findOrCreateLead(Channel $channel, Contact $contact): Lead
    {
        $lead = Lead::where('tenant_id', $channel->tenant_id)
            ->where('contact_id', $contact->id)
            ->first();

        if (!$lead) {
            // Get the first pipeline and its first stage
            $pipeline = \App\Models\Pipeline::where('tenant_id', $channel->tenant_id)
                ->where('is_default', true)
                ->first();

            if (!$pipeline) {
                $pipeline = \App\Models\Pipeline::where('tenant_id', $channel->tenant_id)->first();
            }

            $firstStage = null;
            if ($pipeline) {
                $firstStage = \App\Models\PipelineStage::where('pipeline_id', $pipeline->id)
                    ->orderBy('order')
                    ->first();
            }

            // Create the lead
            $lead = Lead::create([
                'tenant_id' => $channel->tenant_id,
                'contact_id' => $contact->id,
                'channel_id' => $channel->id,
                'pipeline_id' => $pipeline?->id,
                'stage_id' => $firstStage?->id,
                'status' => \App\Enums\LeadStatusEnum::OPEN,
                'name' => $contact->name,
                'phone' => $contact->phone,
            ]);

            // =====================================================
            // DISTRIBUIÇÃO CONDICIONAL
            // =====================================================
            // SÓ distribui automaticamente se o canal NÃO tem menu de filas.
            // Se tem menu de filas, a distribuição acontece DEPOIS que o lead
            // escolher a fila no método triggerSdrResponse() → routeLeadToQueue()
            // =====================================================
            // #region agent log H4,H5 - Distribution check
            $hasQueueMenu = $channel->hasQueueMenu();
            file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H4,H5','location'=>'WhatsAppService:findOrCreateLead:DISTRIBUTION_CHECK','message'=>'Checking distribution path','data'=>['lead_id'=>$lead->id,'channel_id'=>$channel->id,'channel_name'=>$channel->name,'has_queue_menu'=>$hasQueueMenu,'will_auto_distribute'=>!$hasQueueMenu],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
            // #endregion
            if (!$hasQueueMenu) {
                try {
                    // #region agent log H5 - Calling assignment
                    file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H5','location'=>'WhatsAppService:findOrCreateLead:CALLING_ASSIGNMENT','message'=>'About to call assignLeadOwner','data'=>['lead_id'=>$lead->id],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
                    // #endregion
                    $assignmentService = app(\App\Services\LeadAssignmentService::class);
                    $owner = $assignmentService->assignLeadOwner($lead);
                    // #region agent log H5 - Assignment success
                    file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H5','location'=>'WhatsAppService:findOrCreateLead:ASSIGNMENT_SUCCESS','message'=>'Lead assigned successfully','data'=>['lead_id'=>$lead->id,'owner_id'=>$owner->id,'owner_name'=>$owner->name],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
                    // #endregion
                    Log::info('Lead auto-assigned to owner (no queue menu)', [
                        'lead_id' => $lead->id, 
                        'owner_id' => $owner->id, 
                        'owner_name' => $owner->name,
                        'channel_id' => $channel->id,
                    ]);
                } catch (\Exception $e) {
                    // #region agent log H5 - Assignment error
                    file_put_contents(storage_path('logs/debug.log'), json_encode(['hypothesisId'=>'H5','location'=>'WhatsAppService:findOrCreateLead:ASSIGNMENT_ERROR','message'=>'Assignment failed','data'=>['lead_id'=>$lead->id,'error'=>$e->getMessage()],'timestamp'=>now()->toIso8601String()])."\n", FILE_APPEND);
                    // #endregion
                    Log::warning('Could not auto-assign lead', ['lead_id' => $lead->id, 'error' => $e->getMessage()]);
                }
            } else {
                Log::info('Lead created without owner - waiting for queue selection', [
                    'lead_id' => $lead->id,
                    'channel_id' => $channel->id,
                    'has_queue_menu' => true,
                ]);
            }

            Log::info('Lead created from WhatsApp', ['lead_id' => $lead->id, 'contact_id' => $contact->id]);
        }

        return $lead;
    }

    /**
     * Extrai conteúdo da mensagem
     */
    protected function extractMessageContent(array $message): string
    {
        $type = $message['type'];

        return match ($type) {
            'text' => $message['text']['body'] ?? '',
            'image' => '[Imagem] ' . ($message['image']['caption'] ?? ''),
            'video' => '[Vídeo] ' . ($message['video']['caption'] ?? ''),
            'audio' => '[Áudio]',
            'document' => '[Documento] ' . ($message['document']['filename'] ?? ''),
            'sticker' => '[Sticker]',
            'location' => "[Localização] {$message['location']['latitude']}, {$message['location']['longitude']}",
            'contacts' => '[Contato compartilhado]',
            'interactive' => $this->extractInteractiveContent($message['interactive'] ?? []),
            'button' => $message['button']['text'] ?? '[Botão]',
            default => "[{$type}]",
        };
    }

    /**
     * Extrai conteúdo interativo
     */
    protected function extractInteractiveContent(array $interactive): string
    {
        $type = $interactive['type'] ?? '';
        
        return match ($type) {
            'button_reply' => $interactive['button_reply']['title'] ?? '[Resposta de botão]',
            'list_reply' => $interactive['list_reply']['title'] ?? '[Resposta de lista]',
            default => '[Mensagem interativa]',
        };
    }

    /**
     * Extrai metadata de mídia da mensagem
     */
    protected function extractMediaMetadata(array $message, Channel $channel): ?array
    {
        $type = $message['type'];
        $mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        
        if (!in_array($type, $mediaTypes)) {
            return null;
        }

        $mediaData = $message[$type] ?? null;
        if (!$mediaData) {
            return null;
        }

        $mediaId = $mediaData['id'] ?? null;
        if (!$mediaId) {
            return null;
        }

        // Get media URL from Meta API
        $mediaUrl = $this->getMediaUrl($mediaId, $channel);

        return [
            'media_type' => $type,
            'media_id' => $mediaId,
            'media_url' => $mediaUrl,
            'mime_type' => $mediaData['mime_type'] ?? null,
            'file_name' => $mediaData['filename'] ?? null,
            'file_size' => $mediaData['file_size'] ?? null,
            'caption' => $mediaData['caption'] ?? null,
            "{$type}_url" => $mediaUrl, // image_url, video_url, etc.
        ];
    }

    /**
     * Obtém URL de download da mídia da API do Meta e salva localmente
     */
    protected function getMediaUrl(string $mediaId, Channel $channel): ?string
    {
        try {
            $this->loadFromChannel($channel);
            
            // First, get the media info to get the download URL
            $response = Http::withToken($this->accessToken)
                ->get("https://graph.facebook.com/v21.0/{$mediaId}");

            if (!$response->successful()) {
                Log::error('Failed to get media info', [
                    'media_id' => $mediaId,
                    'error' => $response->json(),
                ]);
                return null;
            }

            $mediaInfo = $response->json();
            $downloadUrl = $mediaInfo['url'] ?? null;
            $mimeType = $mediaInfo['mime_type'] ?? 'application/octet-stream';

            if (!$downloadUrl) {
                return null;
            }

            // Download the media immediately and store on S3
            $s3Url = $this->downloadAndStoreMedia($downloadUrl, $mediaId, $mimeType, $channel);
            
            if ($s3Url) {
                return $s3Url;
            }

            // Fallback to Meta URL if download failed (will expire)
            Log::warning('Media download failed, using temporary Meta URL', ['media_id' => $mediaId]);
            return $downloadUrl;

        } catch (\Exception $e) {
            Log::error('Error getting media URL', [
                'media_id' => $mediaId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Downloads media from Meta and stores it on S3
     */
    protected function downloadAndStoreMedia(string $downloadUrl, string $mediaId, string $mimeType, Channel $channel): ?string
    {
        try {
            $this->loadFromChannel($channel);
            
            // Download the media
            $response = Http::withToken($this->accessToken)
                ->timeout(60)
                ->get($downloadUrl);

            if (!$response->successful()) {
                Log::error('Failed to download media from Meta', [
                    'media_id' => $mediaId,
                    'status' => $response->status(),
                ]);
                return null;
            }

            // Determine file extension from mime type
            $extension = $this->getExtensionFromMimeType($mimeType);
            
            // Create directory structure: whatsapp/{tenant_id}/{date}/
            $tenantId = $channel->tenant_id;
            $date = now()->format('Y-m-d');
            $directory = "whatsapp/{$tenantId}/{$date}";
            
            // Generate unique filename
            $filename = $mediaId . '.' . $extension;
            $fullPath = $directory . '/' . $filename;

            // Store the file on S3 (media disk)
            $disk = \Illuminate\Support\Facades\Storage::disk('media');
            $disk->put($fullPath, $response->body());

            // Return signed URL that allows public access without authentication
            // URL is valid for 7 days (WhatsApp conversation window is 24h, but messages are stored)
            $signedUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
                'media.public',
                now()->addDays(7),
                ['path' => $fullPath]
            );

            Log::info('Media stored on S3', [
                'media_id' => $mediaId,
                'path' => $fullPath,
                'url' => $signedUrl,
            ]);

            return $signedUrl;

        } catch (\Exception $e) {
            Log::error('Error downloading and storing media', [
                'media_id' => $mediaId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Convert WebM audio to MP3 format using FFmpeg
     * MP3 is universally compatible with WhatsApp
     * Returns the path to the converted file, or null if FFmpeg is not available
     */
    protected function convertWebmToMp3($disk, string $inputPath): ?string
    {
        // Check if FFmpeg is available
        $ffmpegPath = $this->findFfmpeg();
        if (!$ffmpegPath) {
            Log::warning('FFmpeg not found - cannot convert WebM to MP3');
            return null;
        }

        try {
            // Create temp files
            $tempDir = sys_get_temp_dir();
            $inputFile = $tempDir . '/' . uniqid('webm_') . '.webm';
            $outputFile = $tempDir . '/' . uniqid('mp3_') . '.mp3';

            // Write input file
            file_put_contents($inputFile, $disk->get($inputPath));

            // Convert using FFmpeg (WebM -> MP3)
            // Settings for good voice quality:
            // - libmp3lame codec (standard MP3)
            // - 44.1kHz sample rate
            // - mono channel (voice)
            // - 128k bitrate
            $command = sprintf(
                '"%s" -i "%s" -acodec libmp3lame -ar 44100 -ac 1 -b:a 128k "%s" -y 2>&1',
                $ffmpegPath,
                $inputFile,
                $outputFile
            );

            Log::info('Running FFmpeg conversion WebM->MP3', ['command' => $command]);
            $output = shell_exec($command);

            // Check if output file was created
            if (!file_exists($outputFile) || filesize($outputFile) === 0) {
                Log::error('FFmpeg conversion failed', ['output' => $output]);
                @unlink($inputFile);
                return null;
            }

            // Save converted file to storage
            $outputPath = str_replace('.webm', '.mp3', $inputPath);
            $disk->put($outputPath, file_get_contents($outputFile));

            // Cleanup temp files
            @unlink($inputFile);
            @unlink($outputFile);

            return $outputPath;

        } catch (\Exception $e) {
            Log::error('FFmpeg conversion error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Convert audio to OGG OPUS format for WhatsApp Voice Notes (PTT)
     *
     * WhatsApp requires OGG container with OPUS codec for voice messages (PTT).
     * Using this format + voice:true flag makes audio appear as "voice message"
     * instead of "audio file" in WhatsApp.
     *
     * CRITICAL: WebM container does NOT work on WhatsApp Mobile even with OPUS codec!
     * WhatsApp Web is permissive, but Mobile strictly requires OGG container.
     *
     * Required settings for WhatsApp PTT:
     * - Container: OGG (not WebM!)
     * - Codec: libopus
     * - Sample rate: 48000 Hz (OPUS standard)
     * - Channels: mono (1)
     * - Bitrate: 24k (voice optimized)
     * - Application: voip (optimized for speech)
     *
     * @param mixed $disk Storage disk instance
     * @param string $inputPath Path to input audio file
     * @return string|null Path to converted file, or null if conversion failed
     */
    protected function convertToOggOpus($disk, string $inputPath): ?string
    {
        Log::error('[PTT DEBUG] convertToOggOpus called', ['inputPath' => $inputPath]);

        // Check if FFmpeg is available
        $ffmpegPath = $this->findFfmpeg();
        Log::error('[PTT DEBUG] FFmpeg path', ['ffmpegPath' => $ffmpegPath]);
        if (!$ffmpegPath) {
            Log::error('[PTT DEBUG] FFmpeg not found');
            return null;
        }

        try {
            // Create temp files
            $tempDir = sys_get_temp_dir();
            $extension = pathinfo($inputPath, PATHINFO_EXTENSION);
            $inputFile = $tempDir . '/' . uniqid('audio_') . '.' . $extension;
            $outputFile = $tempDir . '/' . uniqid('ogg_') . '.ogg';

            // Write input file
            file_put_contents($inputFile, $disk->get($inputPath));

            // Convert using FFmpeg to OGG OPUS (WhatsApp PTT format)
            // CRITICAL settings for WhatsApp Mobile (especially iPhone) compatibility:
            // - vn: no video
            // - map_metadata -1: strip all metadata (mobile rejects extra tags)
            // - ac 1: mono channel
            // - ar 16000: 16kHz sample rate (WhatsApp internal format for voice notes!)
            // - c:a libopus: OPUS codec
            // - b:a 32k: 32kbps bitrate (WhatsApp typical for voice)
            // - vbr constrained: constrained VBR for consistent quality
            // - frame_duration 20: 20ms frames (standard, most compatible)
            // - application voip: voice-optimized encoding
            // - f ogg: OGG container (WebM fails on mobile)
            $command = sprintf(
                '"%s" -y -i "%s" -vn -map_metadata -1 -ac 1 -ar 16000 -c:a libopus -b:a 32k -vbr constrained -frame_duration 20 -application voip -f ogg "%s" 2>&1',
                $ffmpegPath,
                $inputFile,
                $outputFile
            );

            Log::error('[PTT DEBUG] Running FFmpeg', ['command' => $command]);
            $output = shell_exec($command);
            Log::error('[PTT DEBUG] FFmpeg output', ['output' => substr($output ?? '', -500)]);

            // Check if output file was created
            if (!file_exists($outputFile) || filesize($outputFile) === 0) {
                Log::error('[PTT DEBUG] FFmpeg failed - no output file', ['output' => $output]);
                @unlink($inputFile);
                return null;
            }

            // Run ffprobe to verify the output format
            $ffprobePath = $this->findFfprobe();
            if ($ffprobePath) {
                $probeCommand = sprintf('"%s" -v error -show_format -show_streams -of json "%s" 2>&1', $ffprobePath, $outputFile);
                $probeOutput = shell_exec($probeCommand);
                Log::error('[PTT DEBUG] FFprobe verification', ['output' => $probeOutput]);
            }

            Log::error('[PTT DEBUG] FFmpeg success', ['size' => filesize($outputFile)]);

            // Generate output path with .ogg extension
            $basePath = preg_replace('/\.[^.]+$/', '', $inputPath);
            $outputPath = $basePath . '.ogg';
            $disk->put($outputPath, file_get_contents($outputFile));

            Log::info('Audio converted to OGG OPUS successfully', [
                'input' => $inputPath,
                'output' => $outputPath,
                'size' => filesize($outputFile),
            ]);

            // Cleanup temp files
            @unlink($inputFile);
            @unlink($outputFile);

            return $outputPath;

        } catch (\Exception $e) {
            Log::error('FFmpeg OGG OPUS conversion error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Convert audio to MP3 format using FFmpeg (iOS-safe)
     * MP3 via URL link is the proven method that works on all platforms
     */
    public function convertToMp3($disk, string $inputPath): ?string
    {
        Log::error('[PTT MP3] convertToMp3 called', ['inputPath' => $inputPath]);

        $ffmpegPath = $this->findFfmpeg();
        if (!$ffmpegPath) {
            Log::error('[PTT MP3] FFmpeg not found');
            return null;
        }

        try {
            $tempDir = sys_get_temp_dir();
            $extension = pathinfo($inputPath, PATHINFO_EXTENSION);
            $inputFile = $tempDir . '/' . uniqid('audio_') . '.' . $extension;
            $outputFile = $tempDir . '/' . uniqid('mp3_') . '.mp3';

            // Write input file
            file_put_contents($inputFile, $disk->get($inputPath));

            // Convert to MP3 using FFmpeg
            // Settings optimized for voice and universal compatibility:
            // - vn: no video
            // - ac 1: mono channel (voice)
            // - ar 44100: standard sample rate for MP3
            // - b:a 128k: 128kbps bitrate (good quality, small size)
            // - f mp3: MP3 format
            $command = sprintf(
                '"%s" -y -i "%s" -vn -ac 1 -ar 44100 -b:a 128k -f mp3 "%s" 2>&1',
                $ffmpegPath,
                $inputFile,
                $outputFile
            );

            Log::error('[PTT MP3] Running FFmpeg', ['command' => $command]);
            $output = shell_exec($command);
            Log::error('[PTT MP3] FFmpeg output', ['output' => substr($output ?? '', -500)]);

            if (!file_exists($outputFile) || filesize($outputFile) === 0) {
                Log::error('[PTT MP3] FFmpeg failed - no output file', ['output' => $output]);
                @unlink($inputFile);
                return null;
            }

            Log::error('[PTT MP3] FFmpeg success', ['size' => filesize($outputFile)]);

            // Generate output path with .mp3 extension
            $basePath = preg_replace('/\.[^.]+$/', '', $inputPath);
            $outputPath = $basePath . '.mp3';
            $disk->put($outputPath, file_get_contents($outputFile));

            Log::info('Audio converted to MP3 successfully', [
                'input' => $inputPath,
                'output' => $outputPath,
                'size' => filesize($outputFile),
            ]);

            // Cleanup temp files
            @unlink($inputFile);
            @unlink($outputFile);

            return $outputPath;

        } catch (\Exception $e) {
            Log::error('FFmpeg MP3 conversion error', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Send voice note as MP3 with voice:true flag (for PTT appearance)
     * Converts to MP3, uploads to WhatsApp API, sends with voice:true
     */
    public function sendVoiceNoteMP3(string $to, string $filePath, string $mimeType): array
    {
        $this->validateConfig();

        Log::error('[PTT MP3 VOICE] Starting voice note send', [
            'to' => $to,
            'file_path' => $filePath,
            'original_mime' => $mimeType,
        ]);

        $disk = \Illuminate\Support\Facades\Storage::disk('media');

        if (!$disk->exists($filePath)) {
            throw new \Exception("Arquivo não encontrado: {$filePath}");
        }

        // Step 1: Convert to MP3
        $convertedPath = $this->convertToMp3($disk, $filePath);

        if (!$convertedPath) {
            throw new \Exception('Falha na conversão do áudio para MP3. Verifique se FFmpeg está instalado.');
        }

        Log::error('[PTT MP3 VOICE] Conversion complete', [
            'converted_path' => $convertedPath,
        ]);

        // Step 2: Read converted file
        $fileContents = $disk->get($convertedPath);
        $fileName = pathinfo($convertedPath, PATHINFO_BASENAME);

        Log::error('[PTT MP3 VOICE] Uploading to WhatsApp', [
            'file_name' => $fileName,
            'file_size' => strlen($fileContents),
        ]);

        // Step 3: Upload to WhatsApp Media API
        $uploadResponse = Http::withToken($this->accessToken)
            ->attach('file', $fileContents, $fileName, ['Content-Type' => 'audio/mpeg'])
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/media", [
                'messaging_product' => 'whatsapp',
                'type' => 'audio/mpeg',
            ]);

        $uploadResult = $uploadResponse->json();

        if (!$uploadResponse->successful() || !isset($uploadResult['id'])) {
            Log::error('[PTT MP3 VOICE] Upload failed', [
                'status' => $uploadResponse->status(),
                'response' => $uploadResult,
            ]);
            throw new \Exception($uploadResult['error']['message'] ?? 'Erro ao fazer upload da mídia');
        }

        $mediaId = $uploadResult['id'];

        Log::error('[PTT MP3 VOICE] Upload successful, sending message', [
            'media_id' => $mediaId,
        ]);

        // Step 4: Send as voice note with voice:true
        $sendPayload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'audio',
            'audio' => [
                'id' => $mediaId,
                'voice' => true, // Makes it appear as voice message (PTT)
            ],
        ];

        Log::error('[PTT MP3 VOICE] Sending with payload', [
            'payload' => $sendPayload,
        ]);

        $sendResponse = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->phoneNumberId}/messages", $sendPayload);

        $sendResult = $sendResponse->json();

        if (!$sendResponse->successful()) {
            Log::error('[PTT MP3 VOICE] Send failed', [
                'status' => $sendResponse->status(),
                'response' => $sendResult,
            ]);
            throw new \Exception($sendResult['error']['message'] ?? 'Erro ao enviar mensagem de voz');
        }

        Log::error('[PTT MP3 VOICE] Success!', [
            'message_id' => $sendResult['messages'][0]['id'] ?? null,
        ]);

        // Generate public URL for display in chat
        if (config("filesystems.disks.media.driver") === 's3') {
            $mediaUrl = $disk->temporaryUrl($convertedPath, now()->addDays(7));
        } else {
            $mediaUrl = $disk->url($convertedPath);
        }

        return [
            'result' => $sendResult,
            'media_id' => $mediaId,
            'converted_path' => $convertedPath,
            'mime_type' => 'audio/mpeg',
            'file_name' => $fileName,
            'media_url' => $mediaUrl,
        ];
    }

    /**
     * Find FFmpeg executable path
     */
    protected function findFfmpeg(): ?string
    {
        // Common paths to check
        $paths = [
            'ffmpeg', // In PATH
            '/usr/bin/ffmpeg',
            '/usr/local/bin/ffmpeg',
            'C:\\ffmpeg\\bin\\ffmpeg.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
        ];

        foreach ($paths as $path) {
            // Check if command exists
            if (PHP_OS_FAMILY === 'Windows') {
                $check = shell_exec("where $path 2>nul");
            } else {
                $check = shell_exec("which $path 2>/dev/null");
            }
            
            if ($check) {
                return trim($check);
            }
            
            // Check direct path
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Find ffprobe executable for audio analysis
     */
    protected function findFfprobe(): ?string
    {
        // Common paths to check
        $paths = [
            'ffprobe', // In PATH
            '/usr/bin/ffprobe',
            '/usr/local/bin/ffprobe',
            'C:\\ffmpeg\\bin\\ffprobe.exe',
            'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe',
        ];

        foreach ($paths as $path) {
            // Check if command exists
            if (PHP_OS_FAMILY === 'Windows') {
                $check = shell_exec("where $path 2>nul");
            } else {
                $check = shell_exec("which $path 2>/dev/null");
            }

            if ($check) {
                return trim($check);
            }

            // Check direct path
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Get file extension from MIME type
     */
    protected function getExtensionFromMimeType(string $mimeType): string
    {
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'video/mp4' => 'mp4',
            'video/3gpp' => '3gp',
            'audio/ogg' => 'ogg',
            'audio/mpeg' => 'mp3',
            'audio/aac' => 'aac',
            'audio/amr' => 'amr',
            'application/pdf' => 'pdf',
            'application/vnd.ms-powerpoint' => 'ppt',
            'application/msword' => 'doc',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
        ];

        return $extensions[$mimeType] ?? 'bin';
    }

    /**
     * Processa atualização de status
     */
    protected function processStatusUpdate(array $status): void
    {
        $messageId = $status['id'];
        $statusType = $status['status']; // sent, delivered, read, failed
        $errors = $status['errors'] ?? null;

        Log::info('WhatsApp status update', [
            'message_id' => $messageId,
            'status' => $statusType,
            'errors' => $errors,
            'full_status' => $status,
        ]);

        // Update message metadata if needed
        $message = TicketMessage::whereJsonContains('metadata->whatsapp_message_id', $messageId)->first();
        if ($message) {
            $metadata = $message->metadata ?? [];
            $metadata['delivery_status'] = $statusType;
            $metadata['status_timestamp'] = $status['timestamp'];
            $message->update(['metadata' => $metadata]);
        }
    }

    /**
     * Formata número de telefone
     */
    protected function formatPhoneNumber(string $phone): string
    {
        // Remove tudo exceto números
        $phone = preg_replace('/\D/', '', $phone);
        
        // Adiciona código do Brasil se não tiver
        if (strlen($phone) === 11 || strlen($phone) === 10) {
            $phone = '55' . $phone;
        }

        return $phone;
    }

    /**
     * Valida configuração
     */
    protected function validateConfig(): void
    {
        if (!$this->phoneNumberId || !$this->accessToken) {
            throw new \Exception('WhatsApp não configurado. Configure phone_number_id e access_token.');
        }
    }

    /**
     * Testa a conexão com a API do WhatsApp
     */
    public function testConnection(): array
    {
        $this->validateConfig();

        try {
            $response = Http::withToken($this->accessToken)
                ->get("{$this->baseUrl}/{$this->phoneNumberId}");

            $result = $response->json();

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => $result['error']['message'] ?? 'Erro ao conectar com a API',
                ];
            }

            return [
                'success' => true,
                'phone_number' => $result['display_phone_number'] ?? $result['id'],
                'verified_name' => $result['verified_name'] ?? '',
                'quality_rating' => $result['quality_rating'] ?? '',
                'id' => $result['id'],
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * {@inheritdoc}
     */
    public function getProviderType(): string
    {
        return 'meta';
    }

    /**
     * {@inheritdoc}
     */
    public function supportsTemplates(): bool
    {
        return true;
    }

    /**
     * {@inheritdoc}
     */
    public function getConnectionStatus(): array
    {
        try {
            $result = $this->testConnection();

            if ($result['success']) {
                return [
                    'status' => 'connected',
                    'connected' => true,
                    'phone_number' => $result['phone_number'] ?? null,
                    'verified_name' => $result['verified_name'] ?? null,
                    'quality_rating' => $result['quality_rating'] ?? null,
                    'provider' => 'meta',
                ];
            }

            return [
                'status' => 'disconnected',
                'connected' => false,
                'error' => $result['error'] ?? 'Connection failed',
                'provider' => 'meta',
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'connected' => false,
                'error' => $e->getMessage(),
                'provider' => 'meta',
            ];
        }
    }

    /**
     * Verifica token do webhook
     */
    public static function verifyWebhookToken(string $mode, string $token, string $challenge, string $verifyToken): ?string
    {
        if ($mode === 'subscribe' && $token === $verifyToken) {
            return $challenge;
        }
        return null;
    }

    /**
     * Processa o menu de roteamento de filas.
     *
     * IMPORTANTE: Esta lógica é INDEPENDENTE da IA estar habilitada.
     * O menu de filas é uma funcionalidade de ROTEAMENTO, não de resposta automática.
     */
    protected function handleQueueMenuRouting(
        TicketMessage $message,
        Ticket $ticket,
        Lead $lead,
        Channel $channel,
        \App\Services\QueueRoutingService $routingService
    ): void {
        $messageContent = $message->message;
        $phone = $lead->contact->phone;
        $this->loadFromChannel($channel);

        // Verifica se a mensagem é uma resposta válida do menu
        if ($routingService->isValidMenuResponse($channel, $messageContent)) {
            // Processa a escolha da fila
            $queue = $routingService->processMenuResponse($lead, $channel, $messageContent);

            if ($queue) {
                Log::info('Lead routed to queue from menu response', [
                    'lead_id' => $lead->id,
                    'queue_id' => $queue->id,
                    'queue_name' => $queue->name,
                ]);

                // Envia mensagem de boas-vindas da fila se configurada
                if (!empty($queue->welcome_message)) {
                    $welcomeMsg = $queue->welcome_message;
                } else {
                    // Mensagem padrão de confirmação
                    $welcomeMsg = "Perfeito! Você selecionou *{$queue->menu_label}*. Em que posso ajudá-lo?";
                }

                $this->sendTextMessage($phone, $welcomeMsg);

                // Salva a mensagem no ticket para aparecer na conversa
                $this->saveOutboundMessage($ticket, $welcomeMsg, [
                    'type' => 'queue_welcome',
                    'queue_id' => $queue->id,
                    'queue_name' => $queue->name,
                ]);
            } else {
                // Resposta inválida, reenvia o menu com mensagem de erro
                $invalidMsg = $routingService->getInvalidResponseText($channel);
                $menuText = $routingService->getFormattedMenuText($channel, $invalidMsg);
                $this->sendTextMessage($phone, $menuText);

                // Salva a mensagem no ticket para aparecer na conversa
                $this->saveOutboundMessage($ticket, $menuText, [
                    'type' => 'queue_menu_retry',
                    'reason' => 'invalid_response',
                ]);
            }
        } else {
            // Primeira interação - envia menu configurado no canal
            $menuText = $routingService->getFormattedMenuText($channel);
            $this->sendTextMessage($phone, $menuText);

            // Salva a mensagem no ticket para aparecer na conversa
            $this->saveOutboundMessage($ticket, $menuText, [
                'type' => 'queue_menu',
                'channel_id' => $channel->id,
            ]);

            Log::info('Queue menu sent to lead', [
                'lead_id' => $lead->id,
                'channel_id' => $channel->id,
            ]);
        }
    }

    /**
     * Dispara processamento do SDR IA para responder automaticamente.
     *
     * Arquitetura consolidada: sempre usa Python Agent (ai-service)
     * com fallback básico embutido no ProcessAgentResponse.
     */
    protected function triggerSdrResponse(TicketMessage $message, Ticket $ticket, Lead $lead, Channel $channel): void
    {
        // NOTA: O roteamento de filas agora é feito no nível superior (handleIncomingMessage)
        // antes de chamar este método. Isso permite que o menu de filas apareça
        // mesmo com a IA desabilitada para o ticket.

        // =====================
        // SELEÇÃO DO SDR AGENT
        // =====================
        // Prioridade: Fila > Pipeline > Canal
        $sdrAgent = null;
        
        // 1. PRIORIDADE MÁXIMA: Se o lead está em uma fila, busca o agente da fila
        if ($lead->queue_id && $lead->queue) {
            $queue = $lead->queue;
            
            // Primeiro tenta o agente configurado diretamente na fila
            if ($queue->sdr_agent_id) {
                $queueAgent = $queue->sdrAgent;
                if ($queueAgent && $queueAgent->is_active) {
                    $sdrAgent = $queueAgent;
                    Log::info('Using SDR Agent from queue', [
                        'queue_id' => $queue->id,
                        'queue_name' => $queue->name,
                        'sdr_agent_id' => $sdrAgent->id,
                        'agent_name' => $sdrAgent->name,
                    ]);
                }
            }
            
            // Fallback: agente do pipeline da fila
            if (!$sdrAgent && $queue->pipeline && $queue->pipeline->sdr_agent_id) {
                $pipelineAgent = $queue->pipeline->sdrAgent;
                if ($pipelineAgent && $pipelineAgent->is_active) {
                    $sdrAgent = $pipelineAgent;
                    Log::info('Using SDR Agent from queue pipeline', [
                        'queue_id' => $queue->id,
                        'pipeline_id' => $queue->pipeline_id,
                        'sdr_agent_id' => $sdrAgent->id,
                    ]);
                }
            }
        }
        
        // 2. Se não tem agente da fila, verifica o pipeline do lead
        if (!$sdrAgent && $lead->pipeline && $lead->pipeline->sdr_agent_id) {
            $pipelineAgent = $lead->pipeline->sdrAgent;
            if ($pipelineAgent && $pipelineAgent->is_active) {
                $sdrAgent = $pipelineAgent;
                Log::info('Using SDR Agent from lead pipeline', [
                    'pipeline_id' => $lead->pipeline_id,
                    'sdr_agent_id' => $sdrAgent->id,
                    'agent_name' => $sdrAgent->name,
                ]);
            }
        }

        // 3. FALLBACK: Se não tem no pipeline, tenta o SDR Agent vinculado ao canal
        if (!$sdrAgent && $channel->sdr_agent_id) {
            $channelAgent = $channel->sdrAgent;
            if ($channelAgent && $channelAgent->is_active) {
                $sdrAgent = $channelAgent;
                Log::info('Using SDR Agent from channel (fallback)', [
                    'channel_id' => $channel->id,
                    'sdr_agent_id' => $sdrAgent->id,
                    'agent_name' => $sdrAgent->name,
                ]);
            }
        }

        // 4. Fallback: busca SDR Agent que tem este canal vinculado
        if (!$sdrAgent) {
            $sdrAgent = \App\Models\SdrAgent::where('channel_id', $channel->id)
                ->where('is_active', true)
                ->first();
        }

        // 5. Se não tem SDR Agent, usa n8n como fallback externo
        if (!$sdrAgent) {
            if (!empty($channel->ia_workflow_id)) {
                Log::info('No SDR Agent found, using n8n workflow', ['channel_id' => $channel->id]);
                $n8nService = app(\App\Services\N8nWebhookService::class);
                $n8nService->notifyNewMessage($message, $ticket, $lead, $channel);
            } else {
                Log::warning('No SDR Agent or n8n workflow configured', ['channel_id' => $channel->id]);
            }
            return;
        }

        // 6. Verifica se a OpenAI está configurada (necessário para qualquer processamento)
        $aiService = app(\App\Services\AI\AiService::class);
        if (!$aiService->isConfigured()) {
            Log::warning('OpenAI not configured, falling back to n8n', ['channel_id' => $channel->id]);
            if (!empty($channel->ia_workflow_id)) {
                $n8nService = app(\App\Services\N8nWebhookService::class);
                $n8nService->notifyNewMessage($message, $ticket, $lead, $channel);
            }
            return;
        }

        // =====================================================
        // 7. DISPARO DO PROCESSAMENTO DE IA
        // =====================================================
        // Estratégia de agrupamento de mensagens fragmentadas:
        // 
        // PRIORIDADE 1: Redis + Python Worker
        //   - Agrupa mensagens no Redis por ticket
        //   - Worker Python processa quando detecta fim de intenção
        //   - Mais sofisticado e preciso
        //
        // PRIORIDADE 2: Job Laravel com Debounce (FALLBACK)
        //   - Usa Cache do Laravel para debounce
        //   - Aguarda DEBOUNCE_SECONDS antes de processar
        //   - Agrupa todas mensagens pendentes do ticket
        //   - Garante comportamento consistente mesmo sem Redis
        // =====================================================
        
        $queueService = app(\App\Services\AI\MessageQueueService::class);
        
        if ($queueService->isAvailable()) {
            // PRIORIDADE 1: Envia para fila Redis/Python (agrupa mensagens)
            $queueService->enqueue($message, $ticket, $lead, $channel, $sdrAgent);
            Log::info('Message sent to Python queue (Redis)', [
                'message_id' => $message->id,
                'ticket_id' => $ticket->id,
                'agent_id' => $sdrAgent->id,
            ]);
        } else {
            // FALLBACK: Usa Job Laravel com Debounce
            // Isso garante agrupamento de mensagens mesmo sem Redis
            \App\Jobs\ProcessAgentResponseDebounced::dispatchWithDebounce(
                $message, 
                $ticket, 
                $lead, 
                $channel, 
                $sdrAgent
            );
            Log::info('Agent job dispatched with debounce (Laravel fallback)', [
                'message_id' => $message->id,
                'ticket_id' => $ticket->id,
                'agent_id' => $sdrAgent->id,
                'agent_name' => $sdrAgent->name,
                'debounce_seconds' => \App\Jobs\ProcessAgentResponseDebounced::DEBOUNCE_SECONDS,
            ]);
        }
    }

    /**
     * Salva contexto da conversa para aprendizado da IA.
     * Usado quando a IA está desabilitada no ticket mas queremos continuar aprendendo.
     * 
     * Isso permite que:
     * 1. O vendedor humano atenda o cliente
     * 2. A IA observe as respostas do vendedor
     * 3. A IA aprenda com as interações para melhorar no futuro
     */
    protected function saveContextForLearning(TicketMessage $message, Ticket $ticket, Channel $channel): void
    {
        try {
            // Busca o SDR Agent para salvar o contexto associado
            $sdrAgent = null;
            $lead = $ticket->lead;
            
            if ($lead && $lead->queue && $lead->queue->sdr_agent_id) {
                $sdrAgent = $lead->queue->sdrAgent;
            } elseif ($lead && $lead->pipeline && $lead->pipeline->sdr_agent_id) {
                $sdrAgent = $lead->pipeline->sdrAgent;
            } elseif ($channel->sdr_agent_id) {
                $sdrAgent = $channel->sdrAgent;
            }

            if (!$sdrAgent || !$lead) {
                return;
            }

            // Dispara job para salvar contexto no ai-service (memória)
            // Isso permite que a IA aprenda com as interações mesmo sem responder
            \App\Jobs\SaveConversationContext::dispatch(
                $ticket->id,
                $lead->id,
                $sdrAgent->id,
                $channel->tenant_id
            );

            Log::info('Conversation context queued for learning', [
                'ticket_id' => $ticket->id,
                'lead_id' => $lead->id,
                'agent_id' => $sdrAgent->id,
                'ia_enabled' => false,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to save context for learning', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Salva uma mensagem de saída (automação) no ticket.
     * 
     * Usado para registrar mensagens enviadas automaticamente pelo sistema
     * (menu de filas, boas-vindas, etc.) para que apareçam na conversa.
     */
    protected function saveOutboundMessage(Ticket $ticket, string $content, array $metadata = []): TicketMessage
    {
        $message = TicketMessage::create([
            'tenant_id' => $ticket->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => \App\Enums\SenderTypeEnum::IA,
            'direction' => \App\Enums\MessageDirectionEnum::OUTBOUND,
            'message' => $content,
            'sent_at' => now(),
            'metadata' => array_merge([
                'automated' => true,
                'source' => 'queue_routing',
            ], $metadata),
        ]);

        // Dispara evento para atualização em tempo real no frontend
        event(new \App\Events\TicketMessageCreated($message, $ticket));

        Log::info('Outbound message saved', [
            'ticket_id' => $ticket->id,
            'message_id' => $message->id,
            'type' => $metadata['type'] ?? 'automated',
        ]);

        return $message;
    }

    /**
     * Verifica se a mensagem é uma aprovação/rejeição de fix de um desenvolvedor.
     * Retorna array com informações se for, null caso contrário.
     */
    protected function checkFixApprovalMessage(string $content, string $phone, Channel $channel): ?array
    {
        $upperContent = mb_strtoupper(trim($content));

        // Verifica se começa com APROVAR ou REJEITAR
        if (!str_starts_with($upperContent, 'APROVAR') && !str_starts_with($upperContent, 'REJEITAR')) {
            return null;
        }

        // Busca tenant e verifica se tem configuração de fix
        $tenant = $channel->tenant;
        $fixSettings = $tenant->fix_agent_settings ?? [];

        if (!($fixSettings['enabled'] ?? false)) {
            return null;
        }

        // Verifica se o telefone está na lista de aprovadores
        $approverPhones = $fixSettings['approver_phones'] ?? [];
        $formattedPhone = $this->formatPhoneNumber($phone);

        $isApprover = false;
        foreach ($approverPhones as $approverPhone) {
            if ($this->formatPhoneNumber($approverPhone) === $formattedPhone) {
                $isApprover = true;
                break;
            }
        }

        if (!$isApprover) {
            return null;
        }

        // Busca fix request pendente
        $fixRequest = \App\Models\AgentFixRequest::where('tenant_id', $tenant->id)
            ->pending()
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$fixRequest) {
            // Envia mensagem informando que não há fix pendente
            $this->loadFromChannel($channel);
            $this->sendTextMessage($phone, "Não há solicitações de correção pendentes no momento.");
            return ['action' => 'no_pending_fix'];
        }

        try {
            if (str_starts_with($upperContent, 'APROVAR')) {
                // Aprovar
                $fixRequest->approve($formattedPhone);

                // Disparar job para executar a correção
                \App\Jobs\ProcessApprovedFix::dispatch($fixRequest);

                // Confirma para o desenvolvedor
                $this->loadFromChannel($channel);
                $this->sendTextMessage($phone, "Correção aprovada e em execução! Você será notificado quando o deploy for concluído.");

                Log::info('Fix approved via WhatsApp', [
                    'fix_request_id' => $fixRequest->id,
                    'approver' => $formattedPhone,
                ]);

                return ['action' => 'approved', 'fix_request_id' => $fixRequest->id];

            } else {
                // Rejeitar - extrai motivo
                $reason = trim(str_replace('REJEITAR', '', $upperContent)) ?: 'Sem motivo especificado';
                $fixRequest->reject($reason, $formattedPhone);

                // Confirma para o desenvolvedor
                $this->loadFromChannel($channel);
                $this->sendTextMessage($phone, "Correção rejeitada. O ticket será escalado para atendimento humano.");

                // Notifica o cliente que foi escalado
                $ticket = $fixRequest->ticket()->with('lead.contact')->first();
                if ($ticket && $ticket->lead && $ticket->lead->contact) {
                    $customerMessage = "A correção identificada precisa de revisão adicional. ";
                    $customerMessage .= "Um desenvolvedor humano vai analisar o problema e resolver o mais rápido possível.";
                    $this->sendTextMessage($ticket->lead->contact->phone, $customerMessage);
                }

                Log::info('Fix rejected via WhatsApp', [
                    'fix_request_id' => $fixRequest->id,
                    'reason' => $reason,
                    'approver' => $formattedPhone,
                ]);

                return ['action' => 'rejected', 'fix_request_id' => $fixRequest->id, 'reason' => $reason];
            }
        } catch (\Exception $e) {
            Log::error('Error processing fix approval', [
                'error' => $e->getMessage(),
                'phone' => $phone,
            ]);
            return null;
        }
    }
}

