<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tickets compartilhados — atendimento conjunto onde múltiplos
 * atendentes (supervisor + atendente, mentor + trainee) veem o
 * mesmo ticket em tempo real.
 *
 * `assigned_user_id` continua sendo o titular único do ticket.
 * `ticket_shared_users` adiciona viewers extras que recebem broadcasts
 * e podem mensagens.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_shared_users', function (Blueprint $table) {
            $table->uuid('ticket_id');
            $table->uuid('user_id');
            $table->uuid('shared_by')->nullable();          // user que compartilhou
            $table->timestamp('shared_at')->useCurrent();

            $table->primary(['ticket_id', 'user_id'], 'ticket_shared_users_pk');
            $table->index('user_id', 'ticket_shared_users_user_idx');

            $table->foreign('ticket_id')->references('id')->on('tickets')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('shared_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_shared_users');
    }
};
