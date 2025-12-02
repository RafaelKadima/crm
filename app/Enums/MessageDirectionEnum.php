<?php

namespace App\Enums;

enum MessageDirectionEnum: string
{
    case INBOUND = 'inbound';
    case OUTBOUND = 'outbound';

    public function label(): string
    {
        return match ($this) {
            self::INBOUND => 'Entrada',
            self::OUTBOUND => 'Saída',
        };
    }
}


