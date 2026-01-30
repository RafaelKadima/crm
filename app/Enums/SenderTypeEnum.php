<?php

namespace App\Enums;

enum SenderTypeEnum: string
{
    case CONTACT = 'contact';
    case USER = 'user';
    case IA = 'ia';
    case SYSTEM = 'system';

    public function label(): string
    {
        return match ($this) {
            self::CONTACT => 'Contato',
            self::USER => 'Usuário',
            self::IA => 'IA',
            self::SYSTEM => 'Sistema',
        };
    }
}


