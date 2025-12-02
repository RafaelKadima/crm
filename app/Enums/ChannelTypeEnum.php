<?php

namespace App\Enums;

enum ChannelTypeEnum: string
{
    case WHATSAPP = 'whatsapp';
    case INSTAGRAM = 'instagram';
    case WEBCHAT = 'webchat';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::WHATSAPP => 'WhatsApp',
            self::INSTAGRAM => 'Instagram',
            self::WEBCHAT => 'Webchat',
            self::OTHER => 'Outro',
        };
    }
}


