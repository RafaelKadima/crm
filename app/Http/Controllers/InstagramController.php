<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Services\InstagramService;
use App\Enums\ChannelTypeEnum;
use App\Enums\SenderTypeEnum;
use App\Enums\MessageDirectionEnum;
use App\Enums\TicketStatusEnum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class InstagramController extends Controller
{
    protected InstagramService $instagramService;

    public function __construct(InstagramService $instagramService)
    {
        $this->instagramService = $instagramService;
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
        $verifyToken = config('services.instagram.verify_token', 'crm_instagram_verify_token');

        if ($mode === 'subscribe' && $token === $verifyToken) {
            Log::info('Instagram webhook verified successfully');
            return response($challenge, 200);
        }

        Log::warning('Instagram webhook verification failed', [
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

        Log::info('Instagram webhook received', ['payload' => $payload]);

        try {
            // Detect if it's Instagram or other
            $object = $payload['object'] ?? null;
            
            if ($object !== 'instagram') {
                Log::warning('Instagram webhook: unexpected object type', ['object' => $object]);
                return response()->json(['status' => 'ignored']);
            }

            $entry = $payload['entry'][0] ?? null;
            if (!$entry) {
                return response()->json(['status' => 'no_entry']);
            }

            // Get Page ID from the webhook
            $pageId = $entry['id'] ?? null;

            if (!$pageId) {
                Log::warning('Instagram webhook: missing page_id');
                return response()->json(['status' => 'ignored']);
            }

            // Find channel by page_id
            $channel = Channel::where('type', ChannelTypeEnum::INSTAGRAM)
                ->whereJsonContains('config->page_id', $pageId)
                ->first();

            if (!$channel) {
                Log::warning('Instagram webhook: channel not found', ['page_id' => $pageId]);
                return response()->json(['status' => 'channel_not_found']);
            }

            // Process the webhook
            $this->instagramService->processIncomingWebhook($payload, $channel);

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('Instagram webhook error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Always return 200 to prevent Meta from retrying
            return response()->json(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * Envia mensagem via Instagram DM
     */
    public function sendMessage(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000', // Instagram limit is 1000 chars
        ]);

        $channel = $ticket->channel;

        if (!$channel || $channel->type !== ChannelTypeEnum::INSTAGRAM) {
            return response()->json([
                'error' => 'Este ticket não está associado a um canal Instagram.',
            ], 400);
        }

        $contact = $ticket->contact;
        $instagramId = $contact->custom_fields['instagram_id'] ?? null;
        
        if (!$instagramId) {
            return response()->json([
                'error' => 'Contato não possui Instagram ID cadastrado.',
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
            $this->instagramService->loadFromChannel($channel);
            $result = $this->instagramService->sendTextMessage($instagramId, $validated['message']);

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

            return response()->json([
                'success' => true,
                'ticket_message' => $ticketMessage,
                'instagram_response' => $result,
            ]);

        } catch (\Exception $e) {
            Log::error('Instagram send message failed', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Envia imagem via Instagram DM
     */
    public function sendImage(Request $request, Ticket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'image_url' => 'required|url',
        ]);

        $channel = $ticket->channel;

        if (!$channel || $channel->type !== ChannelTypeEnum::INSTAGRAM) {
            return response()->json([
                'error' => 'Este ticket não está associado a um canal Instagram.',
            ], 400);
        }

        $contact = $ticket->contact;
        $instagramId = $contact->custom_fields['instagram_id'] ?? null;
        
        if (!$instagramId) {
            return response()->json([
                'error' => 'Contato não possui Instagram ID cadastrado.',
            ], 400);
        }

        try {
            $this->instagramService->loadFromChannel($channel);
            $result = $this->instagramService->sendImage($instagramId, $validated['image_url']);

            // Save message to database
            $ticketMessage = TicketMessage::create([
                'tenant_id' => $ticket->tenant_id,
                'ticket_id' => $ticket->id,
                'sender_type' => SenderTypeEnum::USER,
                'sender_id' => auth()->id(),
                'direction' => MessageDirectionEnum::OUTBOUND,
                'message' => '[Imagem] ' . $validated['image_url'],
                'sent_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'ticket_message' => $ticketMessage,
                'instagram_response' => $result,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Configura canal Instagram
     */
    public function configureChannel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel_id' => 'required|uuid|exists:channels,id',
            'page_id' => 'required|string',
            'access_token' => 'required|string',
            'instagram_account_id' => 'nullable|string',
        ]);

        $channel = Channel::find($validated['channel_id']);

        if ($channel->type !== ChannelTypeEnum::INSTAGRAM) {
            return response()->json([
                'error' => 'Este canal não é do tipo Instagram.',
            ], 400);
        }

        $channel->update([
            'config' => [
                'page_id' => $validated['page_id'],
                'access_token' => $validated['access_token'],
                'instagram_account_id' => $validated['instagram_account_id'] ?? null,
                'configured_at' => now()->toIso8601String(),
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Canal Instagram configurado com sucesso.',
            'channel' => $channel,
            'webhook_url' => url('/api/webhooks/instagram'),
        ]);
    }

    /**
     * Testa conexão com Instagram
     */
    public function testConnection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page_id' => 'required|string',
            'access_token' => 'required|string',
        ]);

        try {
            // Get Instagram Business Account linked to the page
            $response = Http::withToken($validated['access_token'])
                ->get("https://graph.facebook.com/v18.0/{$validated['page_id']}", [
                    'fields' => 'instagram_business_account,name'
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $igAccount = $data['instagram_business_account']['id'] ?? null;

                if (!$igAccount) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Esta página não possui uma conta Business do Instagram vinculada.',
                    ], 400);
                }

                // Get Instagram account info
                $igResponse = Http::withToken($validated['access_token'])
                    ->get("https://graph.facebook.com/v18.0/{$igAccount}", [
                        'fields' => 'username,name,profile_picture_url,followers_count,follows_count'
                    ]);

                $igData = $igResponse->json();

                return response()->json([
                    'success' => true,
                    'message' => 'Conexão estabelecida com sucesso!',
                    'page_name' => $data['name'] ?? null,
                    'instagram_account_id' => $igAccount,
                    'instagram_username' => $igData['username'] ?? null,
                    'instagram_name' => $igData['name'] ?? null,
                    'profile_picture' => $igData['profile_picture_url'] ?? null,
                    'followers_count' => $igData['followers_count'] ?? null,
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
     * Lista conversas recentes do Instagram
     */
    public function getConversations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'channel_id' => 'required|uuid|exists:channels,id',
        ]);

        $channel = Channel::find($validated['channel_id']);
        
        if ($channel->type !== ChannelTypeEnum::INSTAGRAM) {
            return response()->json(['error' => 'Canal não é Instagram'], 400);
        }

        $config = $channel->config;
        $pageId = $config['page_id'] ?? null;
        $accessToken = $config['access_token'] ?? null;

        if (!$pageId || !$accessToken) {
            return response()->json(['error' => 'Canal não configurado'], 400);
        }

        try {
            $response = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/v18.0/{$pageId}/conversations", [
                    'platform' => 'instagram',
                    'fields' => 'participants,messages{message,from,created_time}'
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'conversations' => $response->json()['data'] ?? [],
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => $response->json()['error']['message'] ?? 'Erro ao buscar conversas',
            ], 400);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

