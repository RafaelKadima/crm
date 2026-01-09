<?php

namespace App\Enums;

enum MetaIntegrationStatusEnum: string
{
    case ACTIVE = 'active';
    case EXPIRED = 'expired';
    case REAUTH_REQUIRED = 'reauth_required';

    public function label(): string
    {
        return match ($this) {
            self::ACTIVE => 'Ativo',
            self::EXPIRED => 'Expirado',
            self::REAUTH_REQUIRED => 'Requer Reautenticação',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::ACTIVE => 'green',
            self::EXPIRED => 'red',
            self::REAUTH_REQUIRED => 'yellow',
        };
    }

    public function isActive(): bool
    {
        return $this === self::ACTIVE;
    }

    public function needsAttention(): bool
    {
        return $this !== self::ACTIVE;
    }
}
