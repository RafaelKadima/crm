<?php

namespace App\Enums;

enum IaModeEnum: string
{
    case NONE = 'none';
    case IA_SDR = 'ia_sdr';
    case ENTERPRISE = 'enterprise';

    public function label(): string
    {
        return match ($this) {
            self::NONE => 'Sem IA',
            self::IA_SDR => 'IA SDR',
            self::ENTERPRISE => 'Enterprise',
        };
    }

    public function hasIa(): bool
    {
        return $this !== self::NONE;
    }
}


