<?php

namespace App\Services;

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

class InstagramService
{
    protected string $apiVersion = 'v18.0';
    protected string $baseUrl;
    protected ?string $pageId;
    protected ?string $instagramAccountId;
    protected ?string $accessToken;

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
        
        $this->pageId = $config['page_id'] ?? null;
        $this->instagramAccountId = $config['instagram_account_id'] ?? null;
        $this->accessToken = $config['access_token'] ?? null;

        return $this;
    }

    /**
     * Configura manualmente (para testes)
     */
    public function configure(string $pageId, string $accessToken, ?string $instagramAccountId = null): self
    {
        $this->pageId = $pageId;
        $this->accessToken = $accessToken;
        $this->instagramAccountId = $instagramAccountId;

        return $this;
    }

    /**
     * Envia mensagem de texto
     */
    public function sendTextMessage(string $recipientId, string $message): array
    {
        $this->validateConfig();

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->pageId}/messages", [
                'recipient' => ['id' => $recipientId],
                'message' => ['text' => $message],
            ]);

        $result = $response->json();

        if (!$response->successful()) {
            Log::error('Instagram send message failed', [
                'to' => $recipientId,
                'error' => $result,
            ]);
            throw new \Exception($result['error']['message'] ?? 'Erro ao enviar mensagem');
        }

        Log::info('Instagram message sent', [
            'to' => $recipientId,
            'message_id' => $result['message_id'] ?? null,
        ]);

        return $result;
    }

    /**
     * Envia imagem
     */
    public function sendImage(string $recipientId, string $imageUrl): array
    {
        $this->validateConfig();

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->pageId}/messages", [
                'recipient' => ['id' => $recipientId],
                'message' => [
                    'attachment' => [
                        'type' => 'image',
                        'payload' => ['url' => $imageUrl],
                    ],
                ],
            ]);

        $result = $response->json();

        if (!$response->successful()) {
            throw new \Exception($result['error']['message'] ?? 'Erro ao enviar imagem');
        }

        return $result;
    }

    /**
     * Envia reação a uma mensagem (heart, like, etc)
     */
    public function sendReaction(string $recipientId, string $messageId, string $reaction = 'love'): array
    {
        $this->validateConfig();

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->pageId}/messages", [
                'recipient' => ['id' => $recipientId],
                'sender_action' => 'react',
                'payload' => [
                    'message_id' => $messageId,
                    'reaction' => $reaction, // love, haha, wow, sad, angry, like
                ],
            ]);

        return $response->json();
    }

    /**
     * Marca mensagem como vista
     */
    public function markAsSeen(string $recipientId): bool
    {
        $this->validateConfig();

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->pageId}/messages", [
                'recipient' => ['id' => $recipientId],
                'sender_action' => 'mark_seen',
            ]);

        return $response->successful();
    }

    /**
     * Envia indicador de digitação
     */
    public function sendTypingIndicator(string $recipientId, bool $typing = true): bool
    {
        $this->validateConfig();

        $response = Http::withToken($this->accessToken)
            ->post("{$this->baseUrl}/{$this->pageId}/messages", [
                'recipient' => ['id' => $recipientId],
                'sender_action' => $typing ? 'typing_on' : 'typing_off',
            ]);

        return $response->successful();
    }

    /**
     * Obtém informações do usuário do Instagram
     */
    public function getUserProfile(string $userId): ?array
    {
        $this->validateConfig();

        $response = Http::withToken($this->accessToken)
            ->get("{$this->baseUrl}/{$userId}", [
                'fields' => 'name,username,profile_pic,follower_count,is_verified_user,is_business_follow_user,is_user_follow_business',
            ]);

        if ($response->successful()) {
            return $response->json();
        }

        return null;
    }

    /**
     * Processa webhook de mensagem recebida
     */
    public function processIncomingWebhook(array $payload, Channel $channel): ?TicketMessage
    {
        $entry = $payload['entry'][0] ?? null;
        if (!$entry) return null;

        $messaging = $entry['messaging'][0] ?? null;
        if (!$messaging) return null;

        // Ignora se for echo (mensagem enviada por nós)
        if (isset($messaging['message']['is_echo']) && $messaging['message']['is_echo']) {
            return null;
        }

        $senderId = $messaging['sender']['id'];
        $recipientId = $messaging['recipient']['id'];
        $timestamp = $messaging['timestamp'];
        $message = $messaging['message'] ?? null;

        if (!$message) {
            // Pode ser uma reação, story_mention, etc
            return $this->processNonMessageEvent($messaging, $channel);
        }

        $messageId = $message['mid'];

        // Obtém informações do usuário
        $this->loadFromChannel($channel);
        $userProfile = $this->getUserProfile($senderId);

        // Find or create contact
        $contact = $this->findOrCreateContact($channel, $senderId, $userProfile);

        // Find or create ticket
        $ticket = $this->findOrCreateTicket($channel, $contact);

        // Extract message content
        $content = $this->extractMessageContent($message);

        // Create ticket message
        $ticketMessage = TicketMessage::create([
            'tenant_id' => $channel->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::CONTACT,
            'sender_id' => $contact->id,
            'direction' => MessageDirectionEnum::INBOUND,
            'message' => $content,
            'sent_at' => now(),
        ]);

        // Update ticket last message
        $ticket->update(['updated_at' => now()]);

        // 🔥 Disparar evento broadcast para notificar o frontend em tempo real
        event(new TicketMessageCreated($ticketMessage, $ticket));

        // Mark as seen
        $this->markAsSeen($senderId);

        Log::info('Instagram message received', [
            'from' => $senderId,
            'username' => $userProfile['username'] ?? 'unknown',
            'ticket_id' => $ticket->id,
            'message_id' => $ticketMessage->id,
        ]);

        return $ticketMessage;
    }

    /**
     * Processa eventos que não são mensagens (reações, story mentions, etc)
     */
    protected function processNonMessageEvent(array $messaging, Channel $channel): ?TicketMessage
    {
        // Story mention
        if (isset($messaging['message']['attachments'][0]['type']) && 
            $messaging['message']['attachments'][0]['type'] === 'story_mention') {
            Log::info('Instagram story mention received', ['messaging' => $messaging]);
            // Pode criar um ticket ou notificação para story mentions
        }

        // Reaction
        if (isset($messaging['reaction'])) {
            Log::info('Instagram reaction received', ['messaging' => $messaging]);
        }

        return null;
    }

    /**
     * Encontra ou cria contato
     */
    protected function findOrCreateContact(Channel $channel, string $instagramId, ?array $userProfile): Contact
    {
        $contact = Contact::where('tenant_id', $channel->tenant_id)
            ->whereJsonContains('custom_fields->instagram_id', $instagramId)
            ->first();

        if (!$contact) {
            $name = $userProfile['name'] ?? $userProfile['username'] ?? "Instagram User {$instagramId}";
            
            $contact = Contact::create([
                'tenant_id' => $channel->tenant_id,
                'name' => $name,
                'custom_fields' => [
                    'instagram_id' => $instagramId,
                    'instagram_username' => $userProfile['username'] ?? null,
                    'instagram_profile_pic' => $userProfile['profile_pic'] ?? null,
                    'instagram_followers' => $userProfile['follower_count'] ?? null,
                    'instagram_verified' => $userProfile['is_verified_user'] ?? false,
                ],
            ]);
        } else {
            // Update profile info
            if ($userProfile) {
                $customFields = $contact->custom_fields ?? [];
                $customFields['instagram_username'] = $userProfile['username'] ?? $customFields['instagram_username'] ?? null;
                $customFields['instagram_profile_pic'] = $userProfile['profile_pic'] ?? $customFields['instagram_profile_pic'] ?? null;
                $contact->update(['custom_fields' => $customFields]);
            }
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

            Log::info('Ticket created from Instagram', ['ticket_id' => $ticket->id, 'lead_id' => $lead->id]);

            // Se o lead tem estágio, mover para o primeiro estágio do pipeline
            if ($lead->stage_id) {
                $pipeline = $lead->stage?->pipeline;
                if ($pipeline) {
                    $firstStage = $pipeline->stages()->orderBy('position')->first();
                    if ($firstStage && $firstStage->id !== $lead->stage_id) {
                        $lead->update(['stage_id' => $firstStage->id]);
                        Log::info('Lead moved to first stage on reopen', [
                            'lead_id' => $lead->id,
                            'from_stage' => $lead->getOriginal('stage_id'),
                            'to_stage' => $firstStage->id,
                        ]);
                    }
                }
            }
        } else if (!$ticket->lead_id) {
            // Se ticket existe mas não tem lead, associa
            $ticket->update(['lead_id' => $lead->id]);
            Log::info('Ticket associated with lead', ['ticket_id' => $ticket->id, 'lead_id' => $lead->id]);
        }

        return $ticket;
    }

    /**
     * Encontra ou cria lead para o contato
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

            // Distribui automaticamente para um vendedor (Round Robin)
            try {
                $assignmentService = app(\App\Services\LeadAssignmentService::class);
                $owner = $assignmentService->assignLeadOwner($lead);
                Log::info('Lead auto-assigned to owner', ['lead_id' => $lead->id, 'owner_id' => $owner->id, 'owner_name' => $owner->name]);
            } catch (\Exception $e) {
                Log::warning('Could not auto-assign lead', ['lead_id' => $lead->id, 'error' => $e->getMessage()]);
            }

            Log::info('Lead created from Instagram', ['lead_id' => $lead->id, 'contact_id' => $contact->id]);
        }

        return $lead;
    }

    /**
     * Extrai conteúdo da mensagem
     */
    protected function extractMessageContent(array $message): string
    {
        // Texto
        if (isset($message['text'])) {
            return $message['text'];
        }

        // Attachments
        if (isset($message['attachments'])) {
            $attachment = $message['attachments'][0];
            $type = $attachment['type'];

            return match ($type) {
                'image' => '[Imagem] ' . ($attachment['payload']['url'] ?? ''),
                'video' => '[Vídeo]',
                'audio' => '[Áudio]',
                'file' => '[Arquivo]',
                'share' => '[Post compartilhado] ' . ($attachment['payload']['url'] ?? ''),
                'story_mention' => '[Menção no Story]',
                'reel' => '[Reel compartilhado]',
                default => "[{$type}]",
            };
        }

        // Sticker
        if (isset($message['sticker_id'])) {
            return '[Sticker]';
        }

        return '[Mensagem não suportada]';
    }

    /**
     * Testa a conexão com a API do Instagram
     */
    public function testConnection(): array
    {
        $this->validateConfig();

        try {
            // Get Instagram account info from Page
            $response = Http::withToken($this->accessToken)
                ->get("{$this->baseUrl}/{$this->pageId}", [
                    'fields' => 'instagram_business_account{id,username,name,profile_picture_url,followers_count}',
                ]);

            $result = $response->json();

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => $result['error']['message'] ?? 'Erro ao conectar com a API',
                ];
            }

            if (!isset($result['instagram_business_account'])) {
                return [
                    'success' => false,
                    'error' => 'Página não tem conta Instagram Business conectada',
                ];
            }

            $instagram = $result['instagram_business_account'];

            return [
                'success' => true,
                'instagram_account_id' => $instagram['id'],
                'instagram_username' => $instagram['username'] ?? '',
                'instagram_name' => $instagram['name'] ?? '',
                'profile_picture' => $instagram['profile_picture_url'] ?? '',
                'followers_count' => $instagram['followers_count'] ?? 0,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Valida configuração
     */
    protected function validateConfig(): void
    {
        if (!$this->pageId || !$this->accessToken) {
            throw new \Exception('Instagram não configurado. Configure page_id e access_token.');
        }
    }
}

