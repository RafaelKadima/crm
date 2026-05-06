<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pause/resume de tickets — atendente pode pausar uma conversa
 * (aguardando cliente / aguardando estoque / aguardando 3rd party)
 * sem fechar o ticket.
 *
 * `paused_at != null` indica ticket pausado em qualquer status.
 * Histórico fica em `ticket_pause_logs` (tabela separada, audit trail).
 *
 * Padrão inspirado no ZPRO (`add-pauseReason`, `create-ticket-pause-logs`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->timestamp('paused_at')->nullable()->after('closed_at');
            $table->string('pause_reason', 255)->nullable()->after('paused_at');
            $table->uuid('paused_by')->nullable()->after('pause_reason');

            $table->index(['tenant_id', 'paused_at'], 'tickets_paused_idx');
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('tickets_paused_idx');
            $table->dropColumn(['paused_at', 'pause_reason', 'paused_by']);
        });
    }
};
