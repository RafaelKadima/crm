<?php

namespace App\Services;

use App\Contracts\WhatsAppProviderInterface;
use App\Models\Channel;

class WhatsAppProviderFactory
{
    /**
     * Create a WhatsApp provider instance for the given channel.
     */
    public static function make(Channel $channel): WhatsAppProviderInterface
    {
        return app(WhatsAppService::class)->loadFromChannel($channel);
    }

    /**
     * Create a provider instance by type (without channel context).
     */
    public static function forType(string $type): WhatsAppProviderInterface
    {
        if ($type !== 'meta') {
            throw new \Exception("Unknown WhatsApp provider type: {$type}");
        }

        return app(WhatsAppService::class);
    }

    /**
     * Get list of available provider types.
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
        ];
    }
}
