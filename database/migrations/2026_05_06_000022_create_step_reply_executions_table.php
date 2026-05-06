<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Instância de execução de um step_reply num ticket. Estado vivo da
 * máquina — current_step + context (vars acumuladas) + status.
 *
 * Status:
 *   running       — em execução, aguardando inbound (wait_input/branch)
 *                    ou processando (entre steps automáticos)
 *   completed     — chegou em `end` step
 *   handed_off    — chegou em `handoff_human` (ticket vai pra fila)
 *   timed_out     — wait_input excedeu timeout_seconds
 *   cancelled     — atendente/sistema cancelou
 *
 * Index `(ticket_id, status)` permite checar rápido "esse ticket tem
 * execução ativa?" no fluxo do webhook.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('step_reply_executions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('ticket_id');
            $table->uuid('step_reply_id');
            $table->uuid('current_step_id')->nullable();
            $table->jsonb('context')->nullable();
            $table->string('status', 32)->default('running');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('last_advanced_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();

            $table->foreign('ticket_id')->references('id')->on('tickets')->cascadeOnDelete();
            $table->foreign('step_reply_id')->references('id')->on('step_replies')->cascadeOnDelete();
            $table->foreign('current_step_id')->references('id')->on('step_reply_steps')->nullOnDelete();

            $table->index(['ticket_id', 'status'], 'step_reply_executions_ticket_status_idx');
            $table->index(['status', 'last_advanced_at'], 'step_reply_executions_timeout_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('step_reply_executions');
    }
};
