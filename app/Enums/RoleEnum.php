<?php

namespace App\Enums;

enum RoleEnum: string
{
    case ADMIN = 'admin';
    case GESTOR = 'gestor';
    case VENDEDOR = 'vendedor';
    case MARKETING = 'marketing';

    public function label(): string
    {
        return match ($this) {
            self::ADMIN => 'Administrador',
            self::GESTOR => 'Gestor',
            self::VENDEDOR => 'Vendedor',
            self::MARKETING => 'Marketing',
        };
    }

    public function canManageUsers(): bool
    {
        return in_array($this, [self::ADMIN, self::GESTOR]);
    }

    public function canViewAllLeads(): bool
    {
        return in_array($this, [self::ADMIN, self::GESTOR]);
    }

    public function canManageCampaigns(): bool
    {
        return in_array($this, [self::ADMIN, self::MARKETING]);
    }
}


