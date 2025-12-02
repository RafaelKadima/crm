<?php

namespace App\Enums;

enum TicketStatusEnum: string
{
    case OPEN = 'open';
    case PENDING = 'pending';
    case WAITING_CUSTOMER = 'waiting_customer';
    case CLOSED = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::OPEN => 'Aberto',
            self::PENDING => 'Pendente',
            self::WAITING_CUSTOMER => 'Aguardando Cliente',
            self::CLOSED => 'Fechado',
        };
    }

    public function isOpen(): bool
    {
        return $this !== self::CLOSED;
    }
}


