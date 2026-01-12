<?php

namespace App\Services;

use App\Contracts\WhatsAppProviderInterface;
use App\Models\Channel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Internal WhatsApp Service using Whatsmeow (Go API)
 *
 * This service communicates with the internal whatsapp-api service
 * that uses Whatsmeow library for WhatsApp Web connection via QR Code.
 */
class InternalWhatsAppService implements WhatsAppProviderInterface
{
    protected string $baseUrl;
    protected string $apiKey;
    protected int $timeout;
    protected ?string $sessionId = null;
    protected ?Channel $channel = null;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.internal_whatsapp.url', 'http://whatsapp-api:3000'), '/');
        $this->apiKey = config('services.internal_whatsapp.api_key', '');
        $this->timeout = (int) config('services.internal_whatsapp.timeout', 30);
    }

    /**
     * {@inheritdoc}
     */
    public function loadFromChannel(Channel $channel): self
    {
        $this->channel = $channel;
        $this->sessionId = $channel->internal_session_id;
        return $this;
    }

    /**
     * {@inheritdoc}
     */
    public function sendTextMessage(string $to, string $message): array
    {
        $this->validateSession();

        $response = $this->makeRequest('POST', "/api/sessions/{$this->sessionId}/send/text", [
            'to' => $this->formatPhoneNumber($to),
            'text' => $message,
        ]);

        Log::info('Internal WhatsApp message sent', [
            'to' => $to,
            'session_id' => $this->sessionId,
            'response' => $response,
        ]);

        return $response;
    }

    /**
     * {@inheritdoc}
     */
    public function sendMediaMessage(string $to, string $type, string $mediaUrl, ?string $caption = null): array
    {
        $this->validateSession();

        $endpoint = match ($type) {
            'image' => 'image',
            'document' => 'document',
            default => throw new \Exception("Unsupported media type for internal provider: {$type}. Supported: image, document"),
        };

        // Download media and send as base64
        $mediaContent = @file_get_contents($mediaUrl);
        if ($mediaContent === false) {
            throw new \Exception("Could not download media from URL: {$mediaUrl}");
        }

        $base64 = base64_encode($mediaContent);
        $mimeType = $this->getMimeTypeFromUrl($mediaUrl);
        $fileName = basename(parse_url($mediaUrl, PHP_URL_PATH));

        $payload = [
            'to' => $this->formatPhoneNumber($to),
            $type => $base64,
            'mime_type' => $mimeType,
        ];

        if ($type === 'document' && $fileName) {
            $payload['file_name'] = $fileName;
        }

        if ($caption) {
            $payload['caption'] = $caption;
        }

        $response = $this->makeRequest('POST', "/api/sessions/{$this->sessionId}/send/{$endpoint}", $payload);

        Log::info('Internal WhatsApp media sent', [
            'to' => $to,
            'type' => $type,
            'session_id' => $this->sessionId,
        ]);

        return $response;
    }

    /**
     * {@inheritdoc}
     */
    public function sendTemplateMessage(string $to, string $templateName, string $languageCode = 'pt_BR', array $components = []): array
    {
        throw new \Exception('Template messages are not supported by the internal WhatsApp provider. Templates require Meta Cloud API approval and cannot be sent via Whatsmeow.');
    }

    /**
     * {@inheritdoc}
     */
    public function markAsRead(string $messageId): bool
    {
        // Internal API doesn't have a mark as read endpoint
        // WhatsApp Web automatically marks messages as read when connected
        Log::debug('markAsRead called on internal provider - no action needed', [
            'message_id' => $messageId,
        ]);
        return true;
    }

    /**
     * {@inheritdoc}
     */
    public function testConnection(): array
    {
        try {
            $response = Http::withHeaders(['X-API-Key' => $this->apiKey])
                ->timeout(10)
                ->get("{$this->baseUrl}/health");

            if ($response->successful()) {
                $healthData = $response->json();
                return [
                    'success' => true,
                    'message' => 'Internal WhatsApp API is healthy',
                    'provider' => 'internal',
                    'data' => $healthData,
                ];
            }

            return [
                'success' => false,
                'error' => 'Internal WhatsApp API health check failed',
                'status' => $response->status(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'provider' => 'internal',
            ];
        }
    }

    /**
     * {@inheritdoc}
     */
    public function getProviderType(): string
    {
        return 'internal';
    }

    /**
     * {@inheritdoc}
     */
    public function supportsTemplates(): bool
    {
        return false;
    }

    /**
     * {@inheritdoc}
     */
    public function getConnectionStatus(): array
    {
        if (!$this->sessionId) {
            return [
                'status' => 'no_session',
                'connected' => false,
                'message' => 'No session configured for this channel',
            ];
        }

        try {
            $response = Http::withHeaders(['X-API-Key' => $this->apiKey])
                ->timeout(10)
                ->get("{$this->baseUrl}/api/sessions/{$this->sessionId}");

            if ($response->successful()) {
                return array_merge($response->json(), ['provider' => 'internal']);
            }

            if ($response->status() === 404) {
                return [
                    'status' => 'session_not_found',
                    'connected' => false,
                    'message' => 'Session not found in the API',
                ];
            }

            return [
                'status' => 'error',
                'connected' => false,
                'error' => $response->json()['error'] ?? 'Unknown error',
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'error',
                'connected' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    // ==========================================
    // Internal Provider Specific Methods
    // ==========================================

    /**
     * Create a new WhatsApp session.
     *
     * @param string $clientId Unique identifier for the client (usually channel ID)
     * @return array Session info with session_id
     */
    public function createSession(string $clientId): array
    {
        $response = $this->makeRequest('POST', '/api/sessions', [
            'client_id' => $clientId,
        ]);

        Log::info('Internal WhatsApp session created', [
            'client_id' => $clientId,
            'session_id' => $response['session_id'] ?? null,
        ]);

        return $response;
    }

    /**
     * Connect session and initiate QR code generation.
     *
     * @return array Connection result with QR code if needed
     */
    public function connectSession(): array
    {
        $this->validateSession();

        // Use longer timeout for QR code generation
        $response = Http::withHeaders(['X-API-Key' => $this->apiKey])
            ->timeout(60)
            ->post("{$this->baseUrl}/api/sessions/{$this->sessionId}/connect");

        $result = $response->json();

        Log::info('Internal WhatsApp session connect attempt', [
            'session_id' => $this->sessionId,
            'status' => $result['status'] ?? 'unknown',
        ]);

        if (!$response->successful()) {
            throw new \Exception($result['error'] ?? 'Failed to connect session');
        }

        return $result;
    }

    /**
     * Get current QR code for session.
     *
     * @return array QR code data (base64 PNG)
     */
    public function getQRCode(): array
    {
        $this->validateSession();

        // Use longer timeout for QR code
        $response = Http::withHeaders(['X-API-Key' => $this->apiKey])
            ->timeout(60)
            ->get("{$this->baseUrl}/api/sessions/{$this->sessionId}/qr");

        $result = $response->json();

        if (!$response->successful()) {
            throw new \Exception($result['error'] ?? 'Failed to get QR code');
        }

        return $result;
    }

    /**
     * Disconnect session.
     *
     * @return array Disconnect result
     */
    public function disconnectSession(): array
    {
        $this->validateSession();

        $response = $this->makeRequest('POST', "/api/sessions/{$this->sessionId}/disconnect");

        Log::info('Internal WhatsApp session disconnected', [
            'session_id' => $this->sessionId,
        ]);

        return $response;
    }

    /**
     * Delete session completely.
     *
     * @return array Delete result
     */
    public function deleteSession(): array
    {
        $this->validateSession();

        $response = Http::withHeaders(['X-API-Key' => $this->apiKey])
            ->timeout($this->timeout)
            ->delete("{$this->baseUrl}/api/sessions/{$this->sessionId}");

        $result = $response->json();

        Log::info('Internal WhatsApp session deleted', [
            'session_id' => $this->sessionId,
        ]);

        if (!$response->successful()) {
            throw new \Exception($result['error'] ?? 'Failed to delete session');
        }

        return $result;
    }

    /**
     * List all sessions.
     *
     * @return array List of sessions
     */
    public function listSessions(): array
    {
        $response = Http::withHeaders(['X-API-Key' => $this->apiKey])
            ->timeout($this->timeout)
            ->get("{$this->baseUrl}/api/sessions");

        if (!$response->successful()) {
            throw new \Exception('Failed to list sessions');
        }

        return $response->json();
    }

    // ==========================================
    // Helper Methods
    // ==========================================

    /**
     * Make HTTP request to the internal API.
     */
    protected function makeRequest(string $method, string $endpoint, array $data = []): array
    {
        $url = "{$this->baseUrl}{$endpoint}";

        $request = Http::withHeaders(['X-API-Key' => $this->apiKey])
            ->timeout($this->timeout);

        $response = match (strtoupper($method)) {
            'GET' => $request->get($url, $data),
            'POST' => $request->post($url, $data),
            'DELETE' => $request->delete($url, $data),
            default => throw new \Exception("Unsupported HTTP method: {$method}"),
        };

        $result = $response->json();

        if (!$response->successful()) {
            $error = $result['error'] ?? 'Request failed';
            Log::error('Internal WhatsApp API request failed', [
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'error' => $error,
            ]);
            throw new \Exception($error);
        }

        return $result ?? [];
    }

    /**
     * Validate that a session is configured.
     */
    protected function validateSession(): void
    {
        if (!$this->sessionId) {
            throw new \Exception('No session configured. Create a session and connect it via QR code first.');
        }
    }

    /**
     * Format phone number to international format.
     */
    protected function formatPhoneNumber(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/\D/', '', $phone);

        // Add Brazil country code if not present
        if (strlen($phone) === 11 || strlen($phone) === 10) {
            $phone = '55' . $phone;
        }

        return $phone;
    }

    /**
     * Get MIME type from URL.
     */
    protected function getMimeTypeFromUrl(string $url): string
    {
        $extension = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));

        return match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'mp3' => 'audio/mpeg',
            'ogg' => 'audio/ogg',
            'mp4' => 'video/mp4',
            default => 'application/octet-stream',
        };
    }
}
