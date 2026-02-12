<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChannelWhatsAppProfileController extends Controller
{
    protected string $apiVersion;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', 'v19.0');
        $this->baseUrl = "https://graph.facebook.com/{$this->apiVersion}";
    }

    /**
     * Obtém o perfil do WhatsApp Business de um canal.
     */
    public function getProfile(Channel $channel): JsonResponse
    {
        try {
            $this->validateChannel($channel);

            $config = $channel->config;
            $accessToken = $config['access_token'] ?? null;
            $phoneNumberId = $config['phone_number_id'] ?? null;

            $fields = [
                'about',
                'address',
                'description',
                'email',
                'profile_picture_url',
                'websites',
                'vertical',
            ];

            $response = Http::withToken($accessToken)
                ->get("{$this->baseUrl}/{$phoneNumberId}/whatsapp_business_profile", [
                    'fields' => implode(',', $fields),
                ]);

            if (!$response->successful()) {
                $error = $response->json()['error'] ?? [];
                Log::error('Failed to get WhatsApp profile', [
                    'channel_id' => $channel->id,
                    'error' => $error,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => $error['message'] ?? 'Failed to get profile',
                ], 400);
            }

            $data = $response->json()['data'][0] ?? [];

            return response()->json([
                'success' => true,
                'data' => [
                    'about' => $data['about'] ?? null,
                    'address' => $data['address'] ?? null,
                    'description' => $data['description'] ?? null,
                    'email' => $data['email'] ?? null,
                    'profile_picture_url' => $data['profile_picture_url'] ?? null,
                    'websites' => $data['websites'] ?? [],
                    'vertical' => $data['vertical'] ?? null,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting WhatsApp profile', [
                'channel_id' => $channel->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Atualiza o perfil do WhatsApp Business de um canal.
     */
    public function updateProfile(Request $request, Channel $channel): JsonResponse
    {
        try {
            $this->validateChannel($channel);

            $config = $channel->config;
            $accessToken = $config['access_token'] ?? null;
            $phoneNumberId = $config['phone_number_id'] ?? null;

            $validated = $request->validate([
                'about' => 'nullable|string|max:139',
                'address' => 'nullable|string|max:256',
                'description' => 'nullable|string|max:512',
                'email' => 'nullable|email|max:128',
                'websites' => 'nullable|array|max:2',
                'websites.*' => 'url|max:256',
                'vertical' => 'nullable|string',
            ]);

            $payload = array_filter($validated, fn($v) => $v !== null);

            if (empty($payload)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No valid fields provided for update',
                ], 400);
            }

            $payload['messaging_product'] = 'whatsapp';

            $response = Http::withToken($accessToken)
                ->post("{$this->baseUrl}/{$phoneNumberId}/whatsapp_business_profile", $payload);

            if (!$response->successful()) {
                $error = $response->json()['error'] ?? [];
                Log::error('Failed to update WhatsApp profile', [
                    'channel_id' => $channel->id,
                    'error' => $error,
                ]);
                return response()->json([
                    'success' => false,
                    'message' => $error['message'] ?? 'Failed to update profile',
                ], 400);
            }

            Log::info('WhatsApp profile updated', [
                'channel_id' => $channel->id,
                'fields' => array_keys($payload),
            ]);

            // Return updated profile
            return $this->getProfile($channel);
        } catch (\Exception $e) {
            Log::error('Error updating WhatsApp profile', [
                'channel_id' => $channel->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Upload de foto de perfil.
     */
    public function uploadPhoto(Request $request, Channel $channel): JsonResponse
    {
        try {
            $this->validateChannel($channel);

            $config = $channel->config;
            $accessToken = $config['access_token'] ?? null;
            $phoneNumberId = $config['phone_number_id'] ?? null;
            $wabaId = $config['waba_id'] ?? null;

            if (!$wabaId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Channel does not have WABA ID configured',
                ], 400);
            }

            // Check if photo is provided as file or base64
            $imageData = null;
            $mimeType = 'image/jpeg';

            if ($request->hasFile('photo')) {
                $file = $request->file('photo');

                if (!in_array($file->getMimeType(), ['image/jpeg', 'image/png'])) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Photo must be JPEG or PNG',
                    ], 400);
                }

                if ($file->getSize() > 5 * 1024 * 1024) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Photo must be less than 5MB',
                    ], 400);
                }

                $imageData = file_get_contents($file->getRealPath());
                $mimeType = $file->getMimeType();
            } elseif ($request->has('photo_base64')) {
                $base64Data = $request->input('photo_base64');
                $mimeType = $request->input('mime_type', 'image/jpeg');

                // Remove data:image prefix if present
                if (preg_match('/^data:image\/\w+;base64,/', $base64Data)) {
                    $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $base64Data);
                }

                $imageData = base64_decode($base64Data);

                if ($imageData === false) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid base64 data',
                    ], 400);
                }

                if (strlen($imageData) > 5 * 1024 * 1024) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Photo must be less than 5MB',
                    ], 400);
                }
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'No photo provided',
                ], 400);
            }

            // Step 1: Create upload session
            $createResponse = Http::withToken($accessToken)
                ->post("{$this->baseUrl}/{$wabaId}/uploads", [
                    'file_length' => strlen($imageData),
                    'file_type' => $mimeType,
                ]);

            if (!$createResponse->successful()) {
                $error = $createResponse->json()['error'] ?? [];
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create upload session: ' . ($error['message'] ?? 'Unknown error'),
                ], 400);
            }

            $uploadId = $createResponse->json()['id'];

            // Step 2: Upload file
            $uploadResponse = Http::withToken($accessToken)
                ->withHeaders(['file_offset' => 0])
                ->withBody($imageData, $mimeType)
                ->post("{$this->baseUrl}/{$uploadId}");

            if (!$uploadResponse->successful()) {
                $error = $uploadResponse->json()['error'] ?? [];
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to upload file: ' . ($error['message'] ?? 'Unknown error'),
                ], 400);
            }

            $handle = $uploadResponse->json()['h'];

            // Step 3: Update profile with new photo handle
            $updateResponse = Http::withToken($accessToken)
                ->post("{$this->baseUrl}/{$phoneNumberId}/whatsapp_business_profile", [
                    'messaging_product' => 'whatsapp',
                    'profile_picture_handle' => $handle,
                ]);

            if (!$updateResponse->successful()) {
                $error = $updateResponse->json()['error'] ?? [];
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to update profile with new photo: ' . ($error['message'] ?? 'Unknown error'),
                ], 400);
            }

            Log::info('WhatsApp profile photo updated', [
                'channel_id' => $channel->id,
            ]);

            // Return updated profile
            return $this->getProfile($channel);
        } catch (\Exception $e) {
            Log::error('Error uploading WhatsApp profile photo', [
                'channel_id' => $channel->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Retorna as categorias de negócio disponíveis.
     */
    public function getCategories(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'UNDEFINED' => 'Nao especificado',
                'OTHER' => 'Outro',
                'AUTO' => 'Automotivo',
                'BEAUTY' => 'Beleza, Spa e Salao',
                'APPAREL' => 'Roupas e Acessorios',
                'EDU' => 'Educacao',
                'ENTERTAIN' => 'Entretenimento',
                'EVENT_PLAN' => 'Planejamento de Eventos',
                'FINANCE' => 'Financas',
                'GROCERY' => 'Supermercado',
                'GOVT' => 'Governo',
                'HOTEL' => 'Hotel e Hospedagem',
                'HEALTH' => 'Saude',
                'NONPROFIT' => 'ONG',
                'PROF_SERVICES' => 'Servicos Profissionais',
                'RETAIL' => 'Varejo',
                'TRAVEL' => 'Viagens e Transporte',
                'RESTAURANT' => 'Restaurante',
                'NOT_A_BIZ' => 'Nao e um negocio',
            ],
        ]);
    }

    /**
     * Valida se o canal é WhatsApp e tem as configurações necessárias.
     */
    protected function validateChannel(Channel $channel): void
    {
        if ($channel->type !== 'whatsapp') {
            throw new \Exception('Channel is not a WhatsApp channel');
        }

        $config = $channel->config;

        if (empty($config['access_token'])) {
            throw new \Exception('Channel does not have access token configured');
        }

        if (empty($config['phone_number_id'])) {
            throw new \Exception('Channel does not have phone number ID configured');
        }
    }
}
