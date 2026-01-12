<?php

namespace App\Contracts;

use App\Models\Channel;

interface WhatsAppProviderInterface
{
    /**
     * Initialize the provider with channel configuration.
     */
    public function loadFromChannel(Channel $channel): self;

    /**
     * Send a text message.
     *
     * @param string $to Phone number in international format
     * @param string $message Text message content
     * @return array Response with message_id and status
     */
    public function sendTextMessage(string $to, string $message): array;

    /**
     * Send media message (image, video, audio, document).
     *
     * @param string $to Phone number
     * @param string $type Media type (image, video, audio, document)
     * @param string $mediaUrl URL or path to the media file
     * @param string|null $caption Optional caption for images/videos
     * @return array Response with message_id and status
     */
    public function sendMediaMessage(string $to, string $type, string $mediaUrl, ?string $caption = null): array;

    /**
     * Send template message (Meta API only).
     *
     * @param string $to Phone number
     * @param string $templateName Template name
     * @param string $languageCode Language code (default: pt_BR)
     * @param array $components Template components (header, body, buttons)
     * @return array Response with message_id and status
     * @throws \Exception If provider doesn't support templates
     */
    public function sendTemplateMessage(string $to, string $templateName, string $languageCode = 'pt_BR', array $components = []): array;

    /**
     * Mark message as read.
     *
     * @param string $messageId External message ID
     * @return bool Success status
     */
    public function markAsRead(string $messageId): bool;

    /**
     * Test connection to the provider.
     *
     * @return array Result with success status and message
     */
    public function testConnection(): array;

    /**
     * Get provider type identifier.
     *
     * @return string Provider type ('meta' or 'internal')
     */
    public function getProviderType(): string;

    /**
     * Check if provider supports WhatsApp Business templates.
     *
     * @return bool True if templates are supported
     */
    public function supportsTemplates(): bool;

    /**
     * Get connection status information.
     *
     * @return array Connection status details
     */
    public function getConnectionStatus(): array;
}
