<?php

namespace App\Enums;

enum BroadcastMessageStatusEnum: string
{
    case PENDING = 'PENDING';
    case SENT = 'SENT';
    case DELIVERED = 'DELIVERED';
    case READ = 'READ';
    case FAILED = 'FAILED';

    public function description(): string
    {
        return match($this) {
            self::PENDING => 'Aguardando envio',
            self::SENT => 'Enviado',
            self::DELIVERED => 'Entregue',
            self::READ => 'Lido',
            self::FAILED => 'Falhou',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::PENDING => 'gray',
            self::SENT => 'blue',
            self::DELIVERED => 'green',
            self::READ => 'emerald',
            self::FAILED => 'red',
        };
    }
}
