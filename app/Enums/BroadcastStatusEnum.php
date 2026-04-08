<?php

namespace App\Enums;

enum BroadcastStatusEnum: string
{
    case DRAFT = 'DRAFT';
    case SENDING = 'SENDING';
    case PAUSED = 'PAUSED';
    case COMPLETED = 'COMPLETED';
    case CANCELLED = 'CANCELLED';

    public function description(): string
    {
        return match($this) {
            self::DRAFT => 'Rascunho — aguardando início',
            self::SENDING => 'Enviando mensagens',
            self::PAUSED => 'Envio pausado',
            self::COMPLETED => 'Envio concluído',
            self::CANCELLED => 'Envio cancelado',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::DRAFT => 'gray',
            self::SENDING => 'blue',
            self::PAUSED => 'yellow',
            self::COMPLETED => 'green',
            self::CANCELLED => 'red',
        };
    }

    public function canStart(): bool
    {
        return in_array($this, [self::DRAFT, self::PAUSED]);
    }

    public function canPause(): bool
    {
        return $this === self::SENDING;
    }

    public function canCancel(): bool
    {
        return in_array($this, [self::DRAFT, self::SENDING, self::PAUSED]);
    }
}
