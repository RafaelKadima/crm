<?php

namespace App\Enums;

enum HttpMethodEnum: string
{
    case POST = 'POST';
    case PUT = 'PUT';
    case PATCH = 'PATCH';

    public function label(): string
    {
        return $this->value;
    }
}


