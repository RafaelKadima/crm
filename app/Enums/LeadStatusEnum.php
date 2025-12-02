<?php

namespace App\Enums;

enum LeadStatusEnum: string
{
    case OPEN = 'open';
    case WON = 'won';
    case LOST = 'lost';
    case DISQUALIFIED = 'disqualified';

    public function label(): string
    {
        return match ($this) {
            self::OPEN => 'Aberto',
            self::WON => 'Ganho',
            self::LOST => 'Perdido',
            self::DISQUALIFIED => 'Desqualificado',
        };
    }

    public function isOpen(): bool
    {
        return $this === self::OPEN;
    }

    public function isClosed(): bool
    {
        return in_array($this, [self::WON, self::LOST, self::DISQUALIFIED]);
    }
}


