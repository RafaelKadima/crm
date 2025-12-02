<?php

namespace App\Enums;

enum InteractionSourceEnum: string
{
    case HUMAN = 'human';
    case IA = 'ia';

    public function label(): string
    {
        return match ($this) {
            self::HUMAN => 'Humano',
            self::IA => 'IA',
        };
    }
}


