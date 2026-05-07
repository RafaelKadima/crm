<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tracking customizado de sessões — uma linha por device/token Passport.
 * Permite UI "Sessões ativas" + revogar device específico (não-token-version
 * kill switch).
 *
 * Diferente de oauth_access_tokens (que tem só id + user + scopes), guarda:
 *   - device_name (parsed do user_agent — Chrome on Mac, Safari iPhone, etc)
 *   - last_activity_at (atualizado em cada request via middleware)
 *   - revoked_at (revoga só esse device, não invalida outros tokens)
 *
 * Combinado com tokens_invalidated_at (kill switch global do Sprint 1)
 * dá controle granular: revogar 1 device OU todos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->string('token_id', 100)->nullable();   // Passport token id
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('device_name', 200)->nullable();
            $table->timestamp('last_activity_at')->useCurrent();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['user_id', 'revoked_at'], 'user_sessions_active_idx');
            $table->index('token_id', 'user_sessions_token_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_sessions');
    }
};
