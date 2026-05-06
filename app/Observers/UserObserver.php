<?php

namespace App\Observers;

use App\Models\User;

class UserObserver
{
    /**
     * Quando o password muda, invalida automaticamente todos tokens Passport
     * emitidos antes deste momento. Padrão de segurança esperado em SaaS:
     * trocar a senha derruba sessões ativas em outros dispositivos.
     */
    public function updating(User $user): void
    {
        if ($user->isDirty('password')) {
            $user->token_version = ($user->token_version ?? 0) + 1;
            $user->tokens_invalidated_at = now();
        }
    }
}
