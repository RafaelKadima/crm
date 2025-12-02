<?php

namespace App\Enums;

enum TaskTypeEnum: string
{
    case CALL = 'call';
    case WHATSAPP = 'whatsapp';
    case MEETING = 'meeting';
    case FOLLOW_UP = 'follow_up';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::CALL => 'Ligação',
            self::WHATSAPP => 'WhatsApp',
            self::MEETING => 'Reunião',
            self::FOLLOW_UP => 'Follow-up',
            self::OTHER => 'Outro',
        };
    }
}


