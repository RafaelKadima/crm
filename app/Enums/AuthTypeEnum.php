<?php

namespace App\Enums;

enum AuthTypeEnum: string
{
    case NONE = 'none';
    case BASIC = 'basic';
    case BEARER = 'bearer';
    case API_KEY = 'api_key';
    case LINX_SMART = 'linx_smart';

    public function label(): string
    {
        return match ($this) {
            self::NONE => 'Sem autenticacao',
            self::BASIC => 'Basic Auth',
            self::BEARER => 'Bearer Token',
            self::API_KEY => 'API Key',
            self::LINX_SMART => 'Linx Smart API',
        };
    }
}
