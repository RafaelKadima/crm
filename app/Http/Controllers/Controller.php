<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    use AuthorizesRequests;

    protected function safeErrorMessage(\Throwable $e, string $fallback = 'Erro interno do servidor.'): string
    {
        return app()->environment('production') ? $fallback : $e->getMessage();
    }
}
