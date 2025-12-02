<?php

namespace App\Enums;

enum TaskStatusEnum: string
{
    case PENDING = 'pending';
    case DONE = 'done';
    case CANCELED = 'canceled';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Pendente',
            self::DONE => 'Concluída',
            self::CANCELED => 'Cancelada',
        };
    }
}


