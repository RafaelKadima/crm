<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Posição visível na fila + tempo médio estimado.
 *
 * `queue_position`         — 1-based, posição atual na fila do ticket
 * `queue_position_message` — string pronta pra exibição ("Você é o 3º
 *                            na fila — ~12min")
 * `queue_entered_at`       — quando entrou na fila (pra calcular SLA
 *                            de espera)
 *
 * Job RecalculateQueuePositionsJob roda no scheduler a cada 60s e
 * atualiza essas colunas + dispara Reverb pra UI atualizar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->unsignedInteger('queue_position')->nullable()->after('paused_by');
            $table->string('queue_position_message', 200)->nullable()->after('queue_position');
            $table->timestamp('queue_entered_at')->nullable()->after('queue_position_message');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['queue_position', 'queue_position_message', 'queue_entered_at']);
        });
    }
};
