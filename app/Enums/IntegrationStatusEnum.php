<?php

namespace App\Enums;

enum IntegrationStatusEnum: string
{
    case SUCCESS = 'success';
    case ERROR = 'error';

    public function label(): string
    {
        return match ($this) {
            self::SUCCESS => 'Sucesso',
            self::ERROR => 'Erro',
        };
    }
}


