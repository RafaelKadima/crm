<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 2FA via TOTP (compatível com Google Authenticator / Authy / 1Password).
 *
 * Fluxo:
 *   1. POST /auth/2fa/enable → gera secret + retorna QR code data URI
 *   2. POST /auth/2fa/confirm → user envia código atual; gera 8 recovery
 *      codes one-time-use; seta two_factor_confirmed_at
 *   3. POST /auth/login → se two_factor_confirmed_at existe, NÃO emite
 *      access token; retorna pending_session_id + requires_2fa
 *   4. POST /auth/2fa/verify → user envia código; emite access token
 *   5. POST /auth/2fa/recovery → usa um dos recovery codes (consume-once)
 *   6. POST /auth/2fa/disable → exige senha + código atual
 *
 * Secrets criptografados no DB via cast 'encrypted' (APP_KEY).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('two_factor_secret')->nullable()->after('tokens_invalidated_at');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
            ]);
        });
    }
};
