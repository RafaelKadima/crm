<?php

namespace App\Enums;

enum PlanEnum: string
{
    case BASIC = 'basic';
    case IA_SDR = 'ia_sdr';
    case ENTERPRISE = 'enterprise';

    public function label(): string
    {
        return match ($this) {
            self::BASIC => 'Básico',
            self::IA_SDR => 'IA SDR',
            self::ENTERPRISE => 'Enterprise',
        };
    }

    public function hasIaSdr(): bool
    {
        return in_array($this, [self::IA_SDR, self::ENTERPRISE]);
    }

    public function hasIaVendedor(): bool
    {
        return $this === self::ENTERPRISE;
    }

    public function hasCampaigns(): bool
    {
        return $this === self::ENTERPRISE;
    }
}


