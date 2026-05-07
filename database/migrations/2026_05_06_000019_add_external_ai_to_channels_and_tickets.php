<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * External AI handoff — permite encaminhar mensagens pra Dialogflow,
 * Dify ou outro provider externo. Útil pra clientes que já têm bot
 * treinado em outra plataforma e querem manter, ou pra escalation
 * (depois de X minutos sem resposta humana, encaminha pra IA externa).
 *
 * `channels.external_ai_config` — JSON com provider + credentials:
 *   {
 *     "provider": "dialogflow" | "dify" | "none",
 *     "api_key": "...",
 *     "project_id": "...",
 *     "agent_id": "...",
 *     "trigger": "manual" | "auto_after_minutes" | "keyword",
 *     "trigger_minutes": 5
 *   }
 *
 * `tickets.external_ai_*` — instância ativa por ticket:
 *   - provider: copiado do channel no momento do handoff
 *   - session_id: persistente entre mensagens (Dialogflow + Dify usam)
 *   - handoff_at: timestamp do início (pra calcular timeout/SLA)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->jsonb('external_ai_config')->nullable()->after('config');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->string('external_ai_provider', 32)->nullable()->after('transfer_reason');
            $table->string('external_ai_session_id', 100)->nullable()->after('external_ai_provider');
            $table->timestamp('external_ai_handoff_at')->nullable()->after('external_ai_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            $table->dropColumn('external_ai_config');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn([
                'external_ai_provider',
                'external_ai_session_id',
                'external_ai_handoff_at',
            ]);
        });
    }
};
