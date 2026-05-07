<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Histórico de pause/resume de tickets — append-only audit trail.
 * Permite reconstruir cronologia: quem pausou, por quê, quanto tempo
 * ficou pausado, quem resumeu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_pause_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('ticket_id');
            $table->uuid('user_id')->nullable();             // ator (null = sistema)
            $table->string('action', 16);                    // paused / resumed
            $table->string('reason', 255)->nullable();       // só preenchido em pause
            $table->timestamp('created_at')->useCurrent();   // append-only

            $table->foreign('ticket_id')->references('id')->on('tickets')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();

            $table->index(['ticket_id', 'created_at'], 'ticket_pause_logs_ticket_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_pause_logs');
    }
};
