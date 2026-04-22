<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Flag opt-in por tenant para ativação do auto-fechamento de tickets/leads parados.
 *
 * Default false: os commands tickets:auto-close e leads:auto-disqualify só agem
 * em tenants que explicitamente ativarem. Proteção contra fechamento em massa
 * não intencional antes da validação do comportamento em produção (sub-fase 3c).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->boolean('auto_close_stale_enabled')->default(false);
            $table->index('auto_close_stale_enabled', 'idx_tenants_auto_close');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex('idx_tenants_auto_close');
            $table->dropColumn('auto_close_stale_enabled');
        });
    }
};
