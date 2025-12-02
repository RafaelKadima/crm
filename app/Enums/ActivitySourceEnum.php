<?php

namespace App\Enums;

enum ActivitySourceEnum: string
{
    case SYSTEM = 'system';
    case USER = 'user';
    case IA = 'ia';

    public function label(): string
    {
        return match ($this) {
            self::SYSTEM => 'Sistema',
            self::USER => 'Usuário',
            self::IA => 'IA',
        };
    }
}


