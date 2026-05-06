<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adiciona kill switch de tokens Passport.
     *
     * `token_version` — counter incrementado a cada revocação em massa
     * (útil pra log/debug, não usado pra checar validade do token).
     *
     * `tokens_invalidated_at` — timestamp da última revocação. Tokens
     * Passport criados ANTES desse instante são tratados como inválidos
     * pelo middleware EnsureTokenIsValid.
     *
     * Use cases:
     * - Usuário trocou senha → invalida todos tokens emitidos antes
     * - Admin clicou em "Sair de todos os dispositivos"
     * - Detectada atividade suspeita → kill switch
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('token_version')->default(0)->after('remember_token');
            $table->timestamp('tokens_invalidated_at')->nullable()->after('token_version');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['token_version', 'tokens_invalidated_at']);
        });
    }
};
