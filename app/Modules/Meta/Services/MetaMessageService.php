<?php

namespace App\Modules\Meta\Services;

use App\Models\MetaIntegration;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaMessageService
{
    protected string $apiVersion;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiVersion = config('services.meta.api_version', 'v19.0');
        $this->baseUrl = "https://graph.facebook.com/{$this->apiVersion}";
    }

    /**
     * Envia uma mensagem de texto.
     */
    public function sendText(MetaIntegration $integration, string $to, string $message): array
    {
        $this->validateIntegration($integration);

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'text',
            'text' => [
                'preview_url' => true,
                'body' => $message,
            ],
        ];

        return $this->sendRequest($integration, $payload);
    }

    /**
     * Envia uma mensagem de template.
     */
    public function sendTemplate(
        MetaIntegration $integration,
        string $to,
        string $templateName,
        array $components = [],
        string $language = 'pt_BR'
    ): array {
        $this->validateIntegration($integration);

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => [
                    'code' => $language,
                ],
            ],
        ];

        if (!empty($components)) {
            $payload['template']['components'] = $components;
        }

        return $this->sendRequest($integration, $payload);
    }

    /**
     * Envia uma mensagem de mídia (imagem, vídeo, documento, áudio).
     */
    public function sendMedia(
        MetaIntegration $integration,
        string $to,
        string $type,
        string $mediaUrl,
        ?string $caption = null,
        ?string $filename = null
    ): array {
        $this->validateIntegration($integration);

        $validTypes = ['image', 'video', 'audio', 'document', 'sticker'];
        if (!in_array($type, $validTypes)) {
            throw new \InvalidArgumentException("Invalid media type: {$type}. Valid types: " . implode(', ', $validTypes));
        }

        $mediaPayload = ['link' => $mediaUrl];

        if ($caption && in_array($type, ['image', 'video', 'document'])) {
            $mediaPayload['caption'] = $caption;
        }

        if ($filename && $type === 'document') {
            $mediaPayload['filename'] = $filename;
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => $type,
            $type => $mediaPayload,
        ];

        return $this->sendRequest($integration, $payload);
    }

    /**
     * Envia uma mensagem de mídia usando media_id (upload prévio).
     */
    public function sendMediaById(
        MetaIntegration $integration,
        string $to,
        string $type,
        string $mediaId,
        ?string $caption = null,
        ?string $filename = null
    ): array {
        $this->validateIntegration($integration);

        $mediaPayload = ['id' => $mediaId];

        if ($caption && in_array($type, ['image', 'video', 'document'])) {
            $mediaPayload['caption'] = $caption;
        }

        if ($filename && $type === 'document') {
            $mediaPayload['filename'] = $filename;
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => $type,
            $type => $mediaPayload,
        ];

        return $this->sendRequest($integration, $payload);
    }

    /**
     * Envia áudio como nota de voz (PTT).
     */
    public function sendVoiceNote(MetaIntegration $integration, string $to, string $mediaId): array
    {
        $this->validateIntegration($integration);

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'audio',
            'audio' => [
                'id' => $mediaId,
                'voice' => true,
            ],
        ];

        return $this->sendRequest($integration, $payload);
    }

    /**
     * Faz upload de mídia para a API da Meta.
     */
    public function uploadMedia(MetaIntegration $integration, string $filePath, string $mimeType): string
    {
        $this->validateIntegration($integration);

        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException("File not found: {$filePath}");
        }

        $response = Http::withToken($integration->access_token)
            ->attach('file', file_get_contents($filePath), basename($filePath))
            ->post("{$this->baseUrl}/{$integration->phone_number_id}/media", [
                'messaging_product' => 'whatsapp',
                'type' => $mimeType,
            ]);

        if (!$response->successful()) {
            $error = $response->json()['error'] ?? [];
            throw new \Exception('Media upload failed: ' . ($error['message'] ?? 'Unknown error'));
        }

        $data = $response->json();

        Log::info('Meta media uploaded', [
            'integration_id' => $integration->id,
            'media_id' => $data['id'] ?? null,
        ]);

        return $data['id'];
    }

    /**
     * Obtém URL de mídia a partir do media_id.
     */
    public function getMediaUrl(MetaIntegration $integration, string $mediaId): ?string
    {
        $this->validateIntegration($integration);

        $response = Http::withToken($integration->access_token)
            ->get("{$this->baseUrl}/{$mediaId}");

        if (!$response->successful()) {
            return null;
        }

        return $response->json()['url'] ?? null;
    }

    /**
     * Marca uma mensagem como lida.
     */
    public function markAsRead(MetaIntegration $integration, string $messageId): bool
    {
        $this->validateIntegration($integration);

        $payload = [
            'messaging_product' => 'whatsapp',
            'status' => 'read',
            'message_id' => $messageId,
        ];

        try {
            $response = Http::withToken($integration->access_token)
                ->post("{$this->baseUrl}/{$integration->phone_number_id}/messages", $payload);

            return $response->successful();
        } catch (\Exception $e) {
            Log::warning('Meta mark as read failed', [
                'integration_id' => $integration->id,
                'message_id' => $messageId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Envia mensagem interativa com botões.
     */
    public function sendInteractiveButtons(
        MetaIntegration $integration,
        string $to,
        string $body,
        array $buttons,
        ?string $header = null,
        ?string $footer = null
    ): array {
        $this->validateIntegration($integration);

        $interactive = [
            'type' => 'button',
            'body' => ['text' => $body],
            'action' => [
                'buttons' => array_map(function ($button, $index) {
                    return [
                        'type' => 'reply',
                        'reply' => [
                            'id' => $button['id'] ?? "btn_{$index}",
                            'title' => substr($button['title'], 0, 20),
                        ],
                    ];
                }, $buttons, array_keys($buttons)),
            ],
        ];

        if ($header) {
            $interactive['header'] = ['type' => 'text', 'text' => $header];
        }

        if ($footer) {
            $interactive['footer'] = ['text' => $footer];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'interactive',
            'interactive' => $interactive,
        ];

        return $this->sendRequest($integration, $payload);
    }

    /**
     * Envia mensagem interativa com lista.
     */
    public function sendInteractiveList(
        MetaIntegration $integration,
        string $to,
        string $body,
        string $buttonText,
        array $sections,
        ?string $header = null,
        ?string $footer = null
    ): array {
        $this->validateIntegration($integration);

        $interactive = [
            'type' => 'list',
            'body' => ['text' => $body],
            'action' => [
                'button' => substr($buttonText, 0, 20),
                'sections' => $sections,
            ],
        ];

        if ($header) {
            $interactive['header'] = ['type' => 'text', 'text' => $header];
        }

        if ($footer) {
            $interactive['footer'] = ['text' => $footer];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'interactive',
            'interactive' => $interactive,
        ];

        return $this->sendRequest($integration, $payload);
    }

    /**
     * Envia reação a uma mensagem.
     */
    public function sendReaction(MetaIntegration $integration, string $to, string $messageId, string $emoji): array
    {
        $this->validateIntegration($integration);

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $this->formatPhoneNumber($to),
            'type' => 'reaction',
            'reaction' => [
                'message_id' => $messageId,
                'emoji' => $emoji,
            ],
        ];

        return $this->sendRequest($integration, $payload);
    }

    /**
     * Executa a requisição para a API de mensagens.
     */
    protected function sendRequest(MetaIntegration $integration, array $payload): array
    {
        $response = Http::withToken($integration->access_token)
            ->post("{$this->baseUrl}/{$integration->phone_number_id}/messages", $payload);

        $data = $response->json();

        if (!$response->successful()) {
            $error = $data['error'] ?? [];
            Log::error('Meta message send failed', [
                'integration_id' => $integration->id,
                'error_code' => $error['code'] ?? null,
                'error_message' => $error['message'] ?? 'Unknown error',
                'payload_type' => $payload['type'] ?? 'unknown',
            ]);

            throw new \Exception('Message send failed: ' . ($error['message'] ?? 'Unknown error'));
        }

        Log::info('Meta message sent', [
            'integration_id' => $integration->id,
            'message_id' => $data['messages'][0]['id'] ?? null,
            'type' => $payload['type'] ?? 'unknown',
        ]);

        return [
            'success' => true,
            'message_id' => $data['messages'][0]['id'] ?? null,
            'contacts' => $data['contacts'] ?? [],
        ];
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

    /**
     * Formata o número de telefone para o padrão internacional.
     */
    protected function formatPhoneNumber(string $phone): string
    {
        // Remove caracteres não numéricos
        $phone = preg_replace('/\D/', '', $phone);

        // Se começa com 0, remove
        if (str_starts_with($phone, '0')) {
            $phone = substr($phone, 1);
        }

        // Se não tem código do país, adiciona 55 (Brasil)
        if (strlen($phone) <= 11) {
            $phone = '55' . $phone;
        }

        return $phone;
    }
}
