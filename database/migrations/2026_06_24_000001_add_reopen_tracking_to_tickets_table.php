<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rastreamento de reaberturas de ticket — base para a métrica
     * "taxa de reabertura" no Relatório de Atendimento. Aditiva: tickets
     * existentes ficam com reopen_count = 0 (contagem passa a valer a partir
     * daqui; não há histórico de reaberturas anteriores no schema).
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->unsignedInteger('reopen_count')->default(0)->after('closed_at');
            $table->timestamp('reopened_at')->nullable()->after('reopen_count');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['reopen_count', 'reopened_at']);
        });
    }
};
