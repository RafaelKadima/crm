<?php

namespace App\Services;

use App\Contracts\WhatsAppProviderInterface;
use App\Models\Channel;

class WhatsAppProviderFactory
{
    /**
     * Create a WhatsApp provider instance for the given channel.
     *
     * @param Channel $channel The channel to create a provider for
     * @return WhatsAppProviderInterface The configured provider instance
     * @throws \Exception If provider type is unknown
     */
    public static function make(Channel $channel): WhatsAppProviderInterface
    {
        $providerType = $channel->provider_type ?? 'meta';

        $provider = match ($providerType) {
            'meta' => app(WhatsAppService::class),
            'internal' => app(InternalWhatsAppService::class),
            default => throw new \Exception("Unknown WhatsApp provider type: {$providerType}"),
        };

        return $provider->loadFromChannel($channel);
    }

    /**
     * Create a provider instance by type (without channel context).
     *
     * @param string $type Provider type ('meta' or 'internal')
     * @return WhatsAppProviderInterface The provider instance
     * @throws \Exception If provider type is unknown
     */
    public static function forType(string $type): WhatsAppProviderInterface
    {
        return match ($type) {
            'meta' => app(WhatsAppService::class),
            'internal' => app(InternalWhatsAppService::class),
            default => throw new \Exception("Unknown WhatsApp provider type: {$type}"),
        };
    }

    /**
     * Get list of available provider types.
     *
     * @return array List of provider types with labels
     */
    public static function getAvailableProviders(): array
    {
        return [
            [
                'type' => 'meta',
                'label' => 'Meta Cloud API',
                'description' => 'WhatsApp Business API oficial da Meta',
                'supports_templates' => true,
                'requires_qr' => false,
            ],
            [
                'type' => 'internal',
                'label' => 'WhatsApp Interno',
                'description' => 'Conexao via QR Code (sem custos Meta)',
                'supports_templates' => false,
                'requires_qr' => true,
            ],
        ];
    }
}
