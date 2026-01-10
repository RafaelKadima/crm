<?php

namespace App\Modules\Meta\Services;

use App\Models\MetaIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaProfileService
{
    protected string $apiVersion;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', 'v19.0');
        $this->baseUrl = "https://graph.facebook.com/{$this->apiVersion}";
    }

    /**
     * Obtém o perfil do WhatsApp Business.
     */
    public function getProfile(MetaIntegration $integration): array
    {
        $this->validateIntegration($integration);

        $fields = [
            'about',
            'address',
            'description',
            'email',
            'profile_picture_url',
            'websites',
            'vertical',
        ];

        $response = Http::withToken($integration->access_token)
            ->get("{$this->baseUrl}/{$integration->phone_number_id}/whatsapp_business_profile", [
                'fields' => implode(',', $fields),
            ]);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            throw new \Exception('Failed to get profile: ' . ($error['message'] ?? 'Unknown error'));
        }

        $data = $response->json()['data'][0] ?? [];

        Log::info('Meta profile fetched', [
            'integration_id' => $integration->id,
        ]);

        return [
            'about' => $data['about'] ?? null,
            'address' => $data['address'] ?? null,
            'description' => $data['description'] ?? null,
            'email' => $data['email'] ?? null,
            'profile_picture_url' => $data['profile_picture_url'] ?? null,
            'websites' => $data['websites'] ?? [],
            'vertical' => $data['vertical'] ?? null,
        ];
    }

    /**
     * Atualiza o perfil do WhatsApp Business.
     *
     * @param MetaIntegration $integration
     * @param array $data Array com campos a atualizar:
     *   - about: string (max 139 chars)
     *   - address: string (max 256 chars)
     *   - description: string (max 512 chars)
     *   - email: string (max 128 chars)
     *   - websites: array (max 2 URLs, each max 256 chars)
     *   - vertical: string (category)
     *   - profile_picture_handle: string (handle from uploaded image)
     */
    public function updateProfile(MetaIntegration $integration, array $data): bool
    {
        $this->validateIntegration($integration);

        $allowedFields = [
            'about',
            'address',
            'description',
            'email',
            'websites',
            'vertical',
            'profile_picture_handle',
        ];

        // Filtra apenas campos permitidos
        $payload = array_intersect_key($data, array_flip($allowedFields));

        if (empty($payload)) {
            throw new \InvalidArgumentException('No valid fields provided for update');
        }

        // Validações
        $this->validateProfileData($payload);

        // Adiciona messaging_product (requerido)
        $payload['messaging_product'] = 'whatsapp';

        $response = Http::withToken($integration->access_token)
            ->post("{$this->baseUrl}/{$integration->phone_number_id}/whatsapp_business_profile", $payload);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            Log::error('Meta profile update failed', [
                'integration_id' => $integration->id,
                'error' => $error,
                'payload' => $payload,
            ]);
            throw new \Exception('Failed to update profile: ' . ($error['message'] ?? 'Unknown error'));
        }

        Log::info('Meta profile updated', [
            'integration_id' => $integration->id,
            'fields' => array_keys($payload),
        ]);

        return true;
    }

    /**
     * Faz upload de uma imagem para usar como foto de perfil.
     * Retorna o handle que deve ser usado em updateProfile.
     */
    public function uploadProfilePhoto(MetaIntegration $integration, string $filePath): string
    {
        $this->validateIntegration($integration);

        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException("File not found: {$filePath}");
        }

        // Valida tamanho (max 5MB)
        $fileSize = filesize($filePath);
        if ($fileSize > 5 * 1024 * 1024) {
            throw new \InvalidArgumentException('Profile photo must be less than 5MB');
        }

        // Valida tipo de arquivo
        $mimeType = mime_content_type($filePath);
        $allowedTypes = ['image/jpeg', 'image/png'];
        if (!in_array($mimeType, $allowedTypes)) {
            throw new \InvalidArgumentException('Profile photo must be JPEG or PNG');
        }

        // Upload resumable
        // Step 1: Create upload session
        $createResponse = Http::withToken($integration->access_token)
            ->post("{$this->baseUrl}/{$integration->waba_id}/uploads", [
                'file_length' => $fileSize,
                'file_type' => $mimeType,
            ]);

        if (!$createResponse->successful()) {
            $error = $createResponse->json()['error'] ?? [];
            throw new \Exception('Failed to create upload session: ' . ($error['message'] ?? 'Unknown error'));
        }

        $uploadId = $createResponse->json()['id'];

        // Step 2: Upload file
        $uploadResponse = Http::withToken($integration->access_token)
            ->withHeaders(['file_offset' => 0])
            ->withBody(file_get_contents($filePath), $mimeType)
            ->post("{$this->baseUrl}/{$uploadId}");

        if (!$uploadResponse->successful()) {
            $error = $uploadResponse->json()['error'] ?? [];
            throw new \Exception('Failed to upload file: ' . ($error['message'] ?? 'Unknown error'));
        }

        $handle = $uploadResponse->json()['h'];

        Log::info('Meta profile photo uploaded', [
            'integration_id' => $integration->id,
            'handle' => $handle,
        ]);

        return $handle;
    }

    /**
     * Upload de foto de perfil a partir de conteúdo base64.
     */
    public function uploadProfilePhotoFromBase64(MetaIntegration $integration, string $base64Data, string $mimeType = 'image/jpeg'): string
    {
        $this->validateIntegration($integration);

        // Remove o prefixo data:image/xxx;base64, se presente
        if (preg_match('/^data:image\/\w+;base64,/', $base64Data)) {
            $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $base64Data);
        }

        $imageData = base64_decode($base64Data);

        if ($imageData === false) {
            throw new \InvalidArgumentException('Invalid base64 data');
        }

        // Valida tamanho (max 5MB)
        $fileSize = strlen($imageData);
        if ($fileSize > 5 * 1024 * 1024) {
            throw new \InvalidArgumentException('Profile photo must be less than 5MB');
        }

        // Valida tipo de arquivo
        $allowedTypes = ['image/jpeg', 'image/png'];
        if (!in_array($mimeType, $allowedTypes)) {
            throw new \InvalidArgumentException('Profile photo must be JPEG or PNG');
        }

        // Step 1: Create upload session
        $createResponse = Http::withToken($integration->access_token)
            ->post("{$this->baseUrl}/{$integration->waba_id}/uploads", [
                'file_length' => $fileSize,
                'file_type' => $mimeType,
            ]);

        if (!$createResponse->successful()) {
            $error = $createResponse->json()['error'] ?? [];
            throw new \Exception('Failed to create upload session: ' . ($error['message'] ?? 'Unknown error'));
        }

        $uploadId = $createResponse->json()['id'];

        // Step 2: Upload file
        $uploadResponse = Http::withToken($integration->access_token)
            ->withHeaders(['file_offset' => 0])
            ->withBody($imageData, $mimeType)
            ->post("{$this->baseUrl}/{$uploadId}");

        if (!$uploadResponse->successful()) {
            $error = $uploadResponse->json()['error'] ?? [];
            throw new \Exception('Failed to upload file: ' . ($error['message'] ?? 'Unknown error'));
        }

        $handle = $uploadResponse->json()['h'];

        Log::info('Meta profile photo uploaded from base64', [
            'integration_id' => $integration->id,
            'handle' => $handle,
        ]);

        return $handle;
    }

    /**
     * Obtém as categorias de negócio disponíveis (vertical).
     */
    public function getAvailableCategories(): array
    {
        return [
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
        ];
    }

    /**
     * Valida os dados do perfil antes de enviar.
     */
    protected function validateProfileData(array $data): void
    {
        if (isset($data['about']) && strlen($data['about']) > 139) {
            throw new \InvalidArgumentException('About text must be 139 characters or less');
        }

        if (isset($data['address']) && strlen($data['address']) > 256) {
            throw new \InvalidArgumentException('Address must be 256 characters or less');
        }

        if (isset($data['description']) && strlen($data['description']) > 512) {
            throw new \InvalidArgumentException('Description must be 512 characters or less');
        }

        if (isset($data['email'])) {
            if (strlen($data['email']) > 128) {
                throw new \InvalidArgumentException('Email must be 128 characters or less');
            }
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                throw new \InvalidArgumentException('Invalid email format');
            }
        }

        if (isset($data['websites'])) {
            if (!is_array($data['websites'])) {
                throw new \InvalidArgumentException('Websites must be an array');
            }
            if (count($data['websites']) > 2) {
                throw new \InvalidArgumentException('Maximum 2 websites allowed');
            }
            foreach ($data['websites'] as $website) {
                if (strlen($website) > 256) {
                    throw new \InvalidArgumentException('Each website URL must be 256 characters or less');
                }
                if (!filter_var($website, FILTER_VALIDATE_URL)) {
                    throw new \InvalidArgumentException("Invalid website URL: {$website}");
                }
            }
        }

        if (isset($data['vertical'])) {
            $validCategories = array_keys($this->getAvailableCategories());
            if (!in_array($data['vertical'], $validCategories)) {
                throw new \InvalidArgumentException('Invalid business category (vertical)');
            }
        }
    }

    /**
     * Valida se a integração está ativa e funcional.
     */
    protected function validateIntegration(MetaIntegration $integration): void
    {
        if (!$integration->isActive()) {
            throw new \Exception('Integration is not active. Status: ' . $integration->status->value);
        }

        if (!$integration->access_token) {
            throw new \Exception('Integration has no access token');
        }

        if (!$integration->phone_number_id) {
            throw new \Exception('Integration has no phone number ID');
        }
    }
}
