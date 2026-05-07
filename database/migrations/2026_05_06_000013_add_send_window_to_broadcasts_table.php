<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Janela de envio em broadcasts — não dispara fora do horário
 * configurado. Compliance LGPD/Meta (não enviar marketing às 3h
 * da manhã).
 *
 * `send_window_start/end` — TIME (HH:MM:SS); null = sem restrição
 * `send_window_timezone`  — IANA timezone (default America/Sao_Paulo)
 * `respect_business_hours`— se true, ProcessBroadcastJob também
 *                           checa Queue::isOpen() do canal antes
 *                           de cada batch (combinação AND com
 *                           send_window).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcasts', function (Blueprint $table) {
            $table->time('send_window_start')->nullable()->after('scheduled_at');
            $table->time('send_window_end')->nullable()->after('send_window_start');
            $table->string('send_window_timezone', 64)->default('America/Sao_Paulo')->after('send_window_end');
            $table->boolean('respect_business_hours')->default(false)->after('send_window_timezone');
        });
    }

    public function down(): void
    {
        Schema::table('broadcasts', function (Blueprint $table) {
            $table->dropColumn([
                'send_window_start',
                'send_window_end',
                'send_window_timezone',
                'respect_business_hours',
            ]);
        });
    }
};
