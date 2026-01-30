<?php

namespace App\Http\Controllers;

use App\Events\TicketMessageCreated;
use App\Models\Channel;
use App\Models\Contact;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Enums\ChannelTypeEnum;
use App\Enums\SenderTypeEnum;
use App\Enums\MessageDirectionEnum;
use App\Enums\TicketStatusEnum;
use App\Enums\LeadStatusEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Handles webhooks from the internal WhatsApp API (Whatsmeow).
 *
 * This controller receives events from the Go-based whatsapp-api service:
 * - message: Incoming messages from WhatsApp users
 * - status: Message delivery status updates (sent, delivered, read)
 * - connection: Session connection state changes (connected, disconnected, qr_ready)
 */
class InternalWhatsAppWebhookController extends Controller
{
    /**
     * Receive webhook events from the internal WhatsApp API.
     */
    public function receive(Request $request): JsonResponse
    {
        // Validate API key
        $apiKey = $request->header('X-API-Key');
        $expectedKey = config('services.internal_whatsapp.api_key');

        if ($expectedKey && $apiKey !== $expectedKey) {
            Log::warning('Internal WhatsApp webhook: invalid API key', [
                'provided_key' => substr($apiKey ?? '', 0, 8) . '...',
            ]);
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $payload = $request->all();
        $eventType = $request->header('X-Webhook-Event', $payload['type'] ?? 'unknown');

        Log::info('Internal WhatsApp webhook received', [
            'type' => $eventType,
            'session_id' => $payload['session_id'] ?? null,
            'client_id' => $payload['client_id'] ?? null,
        ]);

        try {
            return match ($eventType) {
                'message' => $this->handleMessage($payload),
                'status' => $this->handleStatus($payload),
                'connection' => $this->handleConnection($payload),
                default => response()->json(['status' => 'ignored', 'type' => $eventType]),
            };
        } catch (\Exception $e) {
            Log::error('Internal WhatsApp webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle incoming message events.
     */
    protected function handleMessage(array $payload): JsonResponse
    {
        $sessionId = $payload['session_id'] ?? null;
        $clientId = $payload['client_id'] ?? null;
        $data = $payload['data'] ?? [];

        // Skip outgoing messages (sent by us)
        if ($data['is_from_me'] ?? false) {
            return response()->json(['status' => 'ignored', 'reason' => 'outgoing_message']);
        }

        // Find channel by session ID
        $channel = Channel::where('type', ChannelTypeEnum::WHATSAPP)
            ->where('provider_type', 'internal')
            ->where('internal_session_id', $sessionId)
            ->first();

        if (!$channel) {
            Log::warning('Internal WhatsApp: channel not found for session', [
                'session_id' => $sessionId,
                'client_id' => $clientId,
            ]);
            return response()->json(['status' => 'channel_not_found'], 404);
        }

        $phoneNumber = $data['from'] ?? '';
        $messageType = $data['type'] ?? 'text';
        $messageId = $data['message_id'] ?? '';
        $pushName = $data['push_name'] ?? null;

        // Find or create contact
        $contact = $this->findOrCreateContact($channel, $phoneNumber, $pushName);

        // Find or create ticket
        $ticket = $this->findOrCreateTicket($channel, $contact);

        // Extract message content
        $content = $this->extractMessageContent($data);

        // Build metadata
        $metadata = $this->buildMetadata($data, $messageId);

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

        // Update ticket timestamp
        $ticket->update(['updated_at' => now()]);

        // Broadcast event for real-time updates
        event(new TicketMessageCreated($ticketMessage, $ticket));

        // Trigger AI response if enabled
        $this->triggerAIResponseIfEnabled($ticketMessage, $ticket, $channel);

        Log::info('Internal WhatsApp message processed', [
            'ticket_id' => $ticket->id,
            'message_id' => $ticketMessage->id,
            'from' => $phoneNumber,
        ]);

        return response()->json([
            'status' => 'success',
            'ticket_id' => $ticket->id,
            'message_id' => $ticketMessage->id,
        ]);
    }

    /**
     * Handle message status updates.
     */
    protected function handleStatus(array $payload): JsonResponse
    {
        $data = $payload['data'] ?? [];
        $messageId = $data['message_id'] ?? '';
        $status = $data['status'] ?? ''; // sent, delivered, read

        Log::info('Internal WhatsApp status update', [
            'message_id' => $messageId,
            'status' => $status,
        ]);

        // Find and update message by internal message ID in metadata
        $message = TicketMessage::whereJsonContains('metadata->internal_message_id', $messageId)->first();

        if ($message) {
            $metadata = $message->metadata ?? [];
            $metadata['delivery_status'] = $status;
            $metadata['status_updated_at'] = now()->toIso8601String();
            $message->update(['metadata' => $metadata]);

            Log::info('Message status updated', [
                'ticket_message_id' => $message->id,
                'new_status' => $status,
            ]);
        }

        return response()->json(['status' => 'processed']);
    }

    /**
     * Handle connection status changes.
     */
    protected function handleConnection(array $payload): JsonResponse
    {
        $sessionId = $payload['session_id'] ?? '';
        $data = $payload['data'] ?? [];
        $status = $data['status'] ?? ''; // connected, disconnected, qr_ready, logged_out
        $phoneNumber = $data['phone_number'] ?? null;

        Log::info('Internal WhatsApp connection event', [
            'session_id' => $sessionId,
            'status' => $status,
            'phone_number' => $phoneNumber,
        ]);

        // Find channel by session ID
        $channel = Channel::where('internal_session_id', $sessionId)->first();

        if ($channel) {
            $config = $channel->config ?? [];

            switch ($status) {
                case 'connected':
                    $config['internal_connected'] = true;
                    $config['internal_phone_number'] = $phoneNumber;
                    $config['connected_at'] = now()->toIso8601String();
                    $config['disconnected_at'] = null;

                    // Update channel identifier with the connected phone number
                    if ($phoneNumber && !$channel->identifier) {
                        $channel->identifier = $phoneNumber;
                    }
                    break;

                case 'disconnected':
                case 'logged_out':
                    $config['internal_connected'] = false;
                    $config['disconnected_at'] = now()->toIso8601String();
                    break;

                case 'qr_ready':
                    $config['qr_ready_at'] = now()->toIso8601String();
                    break;
            }

            $channel->config = $config;
            $channel->save();

            Log::info('Channel connection status updated', [
                'channel_id' => $channel->id,
                'status' => $status,
            ]);
        }

        return response()->json(['status' => 'processed']);
    }

    /**
     * Find or create contact from phone number.
     */
    protected function findOrCreateContact(Channel $channel, string $phone, ?string $name): Contact
    {
        $formattedPhone = $this->formatPhoneNumber($phone);

        $contact = Contact::where('tenant_id', $channel->tenant_id)
            ->where('phone', $formattedPhone)
            ->first();

        if (!$contact) {
            $contact = Contact::create([
                'tenant_id' => $channel->tenant_id,
                'name' => $name ?? "WhatsApp {$phone}",
                'phone' => $formattedPhone,
            ]);

            Log::info('Contact created from internal WhatsApp', [
                'contact_id' => $contact->id,
                'phone' => $formattedPhone,
            ]);
        }

        return $contact;
    }

    /**
     * Find or create ticket for contact.
     */
    protected function findOrCreateTicket(Channel $channel, Contact $contact): Ticket
    {
        // Ensure lead exists for contact
        $lead = $this->findOrCreateLead($channel, $contact);

        // Find open ticket for this contact and channel
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

            Log::info('Ticket created from internal WhatsApp', [
                'ticket_id' => $ticket->id,
                'lead_id' => $lead->id,
            ]);

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
        } elseif (!$ticket->lead_id) {
            $ticket->update(['lead_id' => $lead->id]);
        }

        return $ticket;
    }

    /**
     * Find or create lead for contact.
     */
    protected function findOrCreateLead(Channel $channel, Contact $contact): Lead
    {
        $lead = Lead::where('tenant_id', $channel->tenant_id)
            ->where('contact_id', $contact->id)
            ->first();

        if (!$lead) {
            // Get default pipeline and first stage
            $pipeline = Pipeline::where('tenant_id', $channel->tenant_id)
                ->where('is_default', true)
                ->first();

            if (!$pipeline) {
                $pipeline = Pipeline::where('tenant_id', $channel->tenant_id)->first();
            }

            $firstStage = null;
            if ($pipeline) {
                $firstStage = PipelineStage::where('pipeline_id', $pipeline->id)
                    ->orderBy('order')
                    ->first();
            }

            $lead = Lead::create([
                'tenant_id' => $channel->tenant_id,
                'contact_id' => $contact->id,
                'channel_id' => $channel->id,
                'pipeline_id' => $pipeline?->id,
                'stage_id' => $firstStage?->id,
                'status' => LeadStatusEnum::OPEN,
                'name' => $contact->name,
                'phone' => $contact->phone,
            ]);

            // Auto-assign lead if channel doesn't have queue menu
            if (!$channel->hasQueueMenu()) {
                try {
                    $assignmentService = app(\App\Services\LeadAssignmentService::class);
                    $assignmentService->assignLeadOwner($lead);
                } catch (\Exception $e) {
                    Log::warning('Could not auto-assign lead from internal WhatsApp', [
                        'lead_id' => $lead->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            Log::info('Lead created from internal WhatsApp', [
                'lead_id' => $lead->id,
                'contact_id' => $contact->id,
            ]);
        }

        return $lead;
    }

    /**
     * Extract message content from webhook data.
     */
    protected function extractMessageContent(array $data): string
    {
        $type = $data['type'] ?? 'text';
        $body = $data['body'] ?? '';

        return match ($type) {
            'text' => $body,
            'image' => '[Imagem] ' . $body,
            'video' => '[Video] ' . $body,
            'audio' => '[Audio]',
            'document' => '[Documento] ' . ($data['file_name'] ?? ''),
            'sticker' => '[Sticker]',
            'location' => '[Localizacao]',
            'contact' => '[Contato compartilhado]',
            default => "[{$type}]",
        };
    }

    /**
     * Build metadata array from webhook data.
     */
    protected function buildMetadata(array $data, string $messageId): ?array
    {
        $type = $data['type'] ?? 'text';

        $metadata = [
            'internal_message_id' => $messageId,
            'provider' => 'internal',
            'is_group' => $data['is_group'] ?? false,
        ];

        if (!empty($data['group_name'])) {
            $metadata['group_name'] = $data['group_name'];
        }

        if (!empty($data['quoted_msg_id'])) {
            $metadata['quoted_message_id'] = $data['quoted_msg_id'];
        }

        // Add media metadata if present
        $mediaTypes = ['image', 'video', 'audio', 'document'];
        if (in_array($type, $mediaTypes)) {
            $metadata['media_type'] = $type;
            $metadata['media_url'] = $data['media_url'] ?? null;
            $metadata['mime_type'] = $data['mime_type'] ?? null;
            $metadata['file_name'] = $data['file_name'] ?? null;
        }

        return $metadata;
    }

    /**
     * Trigger AI response if channel has AI enabled.
     */
    protected function triggerAIResponseIfEnabled(TicketMessage $message, Ticket $ticket, Channel $channel): void
    {
        // Skip if channel doesn't have AI enabled
        if (!$channel->hasIa()) {
            return;
        }

        // Skip if ticket has AI disabled
        if (!$ticket->hasIaEnabled()) {
            return;
        }

        $lead = $ticket->lead;
        if (!$lead) {
            return;
        }

        // Handle queue menu routing first
        if ($channel->hasQueueMenu()) {
            $routingService = app(\App\Services\QueueRoutingService::class);

            if ($routingService->needsQueueMenu($lead, $channel)) {
                $this->handleQueueMenuRouting($message, $ticket, $lead, $channel, $routingService);
                return;
            }
        }

        // Find SDR Agent (priority: queue > pipeline > channel)
        $sdrAgent = $this->findSdrAgent($lead, $channel);

        if (!$sdrAgent) {
            Log::info('No SDR Agent found for internal WhatsApp message', [
                'channel_id' => $channel->id,
                'lead_id' => $lead->id,
            ]);
            return;
        }

        // Queue AI response using the same mechanism as Meta provider
        $queueService = app(\App\Services\AI\MessageQueueService::class);

        if ($queueService->isAvailable()) {
            $queueService->enqueue($message, $ticket, $lead, $channel, $sdrAgent);
        } else {
            \App\Jobs\ProcessAgentResponseDebounced::dispatchWithDebounce(
                $message,
                $ticket,
                $lead,
                $channel,
                $sdrAgent
            );
        }

        Log::info('AI response triggered for internal WhatsApp', [
            'ticket_id' => $ticket->id,
            'agent_id' => $sdrAgent->id,
        ]);
    }

    /**
     * Handle queue menu routing.
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

        // Get the internal WhatsApp service
        $whatsappService = app(\App\Services\InternalWhatsAppService::class);
        $whatsappService->loadFromChannel($channel);

        if ($routingService->isValidMenuResponse($channel, $messageContent)) {
            $queue = $routingService->processMenuResponse($lead, $channel, $messageContent);

            if ($queue) {
                $welcomeMsg = !empty($queue->welcome_message)
                    ? $queue->welcome_message
                    : "Perfeito! Voce selecionou *{$queue->menu_label}*. Em que posso ajuda-lo?";

                $whatsappService->sendTextMessage($phone, $welcomeMsg);
                $this->saveOutboundMessage($ticket, $welcomeMsg, [
                    'type' => 'queue_welcome',
                    'queue_id' => $queue->id,
                ]);
            } else {
                $invalidMsg = $routingService->getInvalidResponseText($channel);
                $menuText = $routingService->getFormattedMenuText($channel, $invalidMsg);
                $whatsappService->sendTextMessage($phone, $menuText);
                $this->saveOutboundMessage($ticket, $menuText, ['type' => 'queue_menu_retry']);
            }
        } else {
            $menuText = $routingService->getFormattedMenuText($channel);
            $whatsappService->sendTextMessage($phone, $menuText);
            $this->saveOutboundMessage($ticket, $menuText, ['type' => 'queue_menu']);
        }
    }

    /**
     * Find SDR Agent for the lead.
     */
    protected function findSdrAgent(Lead $lead, Channel $channel): ?\App\Models\SdrAgent
    {
        // Se a fila tem SDR desabilitado, não usa nenhum agente (ignora todos os fallbacks)
        if ($lead->queue_id && $lead->queue && $lead->queue->sdr_disabled) {
            return null;
        }

        // Priority 1: Queue's SDR Agent
        if ($lead->queue_id && $lead->queue && $lead->queue->sdr_agent_id) {
            $agent = $lead->queue->sdrAgent;
            if ($agent && $agent->is_active) {
                return $agent;
            }
        }

        // Priority 2: Pipeline's SDR Agent
        if ($lead->pipeline && $lead->pipeline->sdr_agent_id) {
            $agent = $lead->pipeline->sdrAgent;
            if ($agent && $agent->is_active) {
                return $agent;
            }
        }

        // Priority 3: Channel's SDR Agent
        if ($channel->sdr_agent_id) {
            $agent = $channel->sdrAgent;
            if ($agent && $agent->is_active) {
                return $agent;
            }
        }

        // Fallback: Any active agent linked to channel
        return \App\Models\SdrAgent::where('channel_id', $channel->id)
            ->where('is_active', true)
            ->first();
    }

    /**
     * Save outbound message to ticket.
     */
    protected function saveOutboundMessage(Ticket $ticket, string $content, array $metadata = []): TicketMessage
    {
        $message = TicketMessage::create([
            'tenant_id' => $ticket->tenant_id,
            'ticket_id' => $ticket->id,
            'sender_type' => SenderTypeEnum::IA,
            'direction' => MessageDirectionEnum::OUTBOUND,
            'message' => $content,
            'sent_at' => now(),
            'metadata' => array_merge([
                'automated' => true,
                'provider' => 'internal',
            ], $metadata),
        ]);

        event(new TicketMessageCreated($message, $ticket));

        return $message;
    }

    /**
     * Format phone number to international format.
     */
    protected function formatPhoneNumber(string $phone): string
    {
        $phone = preg_replace('/\D/', '', $phone);

        if (strlen($phone) === 11 || strlen($phone) === 10) {
            $phone = '55' . $phone;
        }

        return $phone;
    }
}
