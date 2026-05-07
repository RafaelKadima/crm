<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adiciona métricas e horário comercial nas filas.
 *
 * `avg_response_time_minutes` — média móvel calculada do tempo entre
 *                               queue_entered_at e closed_at dos
 *                               últimos 50 tickets fechados. Atualizada
 *                               por RecalculateQueuePositionsJob.
 *
 * `business_hours`            — JSON {monday: [{start, end}], ...}.
 *                               Vazio ou null = 24/7. Usado pra
 *                               auto-resposta fora do horário e pra
 *                               agendar Broadcasts.
 *
 * `out_of_hours_message`      — texto enviado automaticamente quando
 *                               ticket entra fora do horário comercial.
 *
 * `respect_business_hours`    — flag mestra; se false, fila aceita
 *                               atendimento 24/7 ignorando o JSON.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->unsignedInteger('avg_response_time_minutes')->default(0)->after('close_message');
            $table->jsonb('business_hours')->nullable()->after('avg_response_time_minutes');
            $table->text('out_of_hours_message')->nullable()->after('business_hours');
            $table->boolean('respect_business_hours')->default(false)->after('out_of_hours_message');
        });
    }

    public function down(): void
    {
        Schema::table('queues', function (Blueprint $table) {
            $table->dropColumn([
                'avg_response_time_minutes',
                'business_hours',
                'out_of_hours_message',
                'respect_business_hours',
            ]);
        });
    }
};
