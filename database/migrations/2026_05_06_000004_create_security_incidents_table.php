<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabela de incidentes de segurança — append-only, dispara alerta no
 * Sentry pra severidade high/critical.
 *
 * Casos cobertos:
 *   - HMAC do webhook Meta inválido
 *   - Brute force em login (5+ falhas no mesmo email/IP)
 *   - 2FA com código inválido 3+ vezes
 *   - Token revogado sendo usado
 *   - Tentativa de escalação de permissão
 *   - Super admin bypassando policy (audit-only, severity LOW)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_incidents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->uuid('actor_id')->nullable();
            $table->string('actor_email', 255)->nullable();

            $table->string('type', 64);                // ver SecurityIncidentTypeEnum
            $table->string('severity', 16);            // low/medium/high/critical
            $table->string('ip', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('path', 500)->nullable();   // request path em que aconteceu
            $table->jsonb('metadata')->nullable();

            // Append-only — sem updated_at
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'type', 'created_at'], 'security_incidents_lookup_idx');
            $table->index(['severity', 'created_at'], 'security_incidents_severity_idx');
            $table->index(['ip', 'created_at'], 'security_incidents_ip_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_incidents');
    }
};
