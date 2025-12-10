<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Horários de disponibilidade dos funcionários
        Schema::create('user_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            
            // Dia da semana (0 = domingo, 6 = sábado)
            $table->tinyInteger('day_of_week'); // 0-6
            
            // Horários de trabalho
            $table->time('start_time'); // ex: 08:00
            $table->time('end_time');   // ex: 18:00
            
            // Intervalo de almoço (opcional)
            $table->time('break_start')->nullable(); // ex: 12:00
            $table->time('break_end')->nullable();   // ex: 13:00
            
            // Duração padrão de cada slot (em minutos)
            $table->integer('slot_duration')->default(30);
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->unique(['user_id', 'day_of_week']);
            $table->index(['tenant_id', 'user_id', 'day_of_week']);
        });

        // Exceções de disponibilidade (férias, feriados, etc)
        Schema::create('user_schedule_exceptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id');
            
            $table->date('exception_date');
            $table->enum('type', ['unavailable', 'custom_hours']);
            
            // Se custom_hours, pode ter horários alternativos
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->unique(['user_id', 'exception_date']);
        });

        // Agendamentos
        Schema::create('appointments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('lead_id');
            $table->uuid('contact_id');
            $table->uuid('user_id'); // Vendedor/Responsável
            $table->uuid('scheduled_by')->nullable(); // Quem agendou (user_id ou null se foi IA)
            
            // Tipo de agendamento
            $table->enum('type', [
                'meeting',      // Reunião online/call
                'visit',        // Visita à loja
                'demo',         // Demonstração
                'follow_up',    // Follow-up
                'other'
            ])->default('meeting');
            
            // Data e hora
            $table->dateTime('scheduled_at');
            $table->dateTime('ends_at')->nullable();
            $table->integer('duration_minutes')->default(30);
            
            // Status
            $table->enum('status', [
                'scheduled',    // Agendado
                'confirmed',    // Confirmado pelo lead
                'completed',    // Realizado
                'cancelled',    // Cancelado
                'no_show',      // Lead não compareceu
                'rescheduled'   // Reagendado
            ])->default('scheduled');
            
            // Detalhes
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('location')->nullable(); // Endereço, link de reunião, etc
            $table->string('meeting_link')->nullable(); // Link do Google Meet, Zoom, etc
            
            // Lembretes
            $table->boolean('reminder_sent')->default(false);
            $table->dateTime('reminder_sent_at')->nullable();
            $table->boolean('confirmation_received')->default(false);
            $table->dateTime('confirmed_at')->nullable();
            
            // Notas e resultado
            $table->text('notes')->nullable();
            $table->text('outcome')->nullable(); // Resultado após a reunião
            
            // Se foi reagendado, referência ao original
            $table->uuid('rescheduled_from')->nullable();
            
            // Metadados
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('cascade');
            $table->foreign('contact_id')->references('id')->on('contacts')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('scheduled_by')->references('id')->on('users')->onDelete('set null');
            
            $table->index(['tenant_id', 'status', 'scheduled_at']);
            $table->index(['user_id', 'scheduled_at']);
            $table->index(['lead_id', 'scheduled_at']);
            $table->index(['scheduled_at', 'reminder_sent']);
        });

        // Adiciona foreign key auto-referencial depois de criar a tabela
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreign('rescheduled_from')->references('id')->on('appointments')->onDelete('set null');
        });

        // Tarefas de lembrete/follow-up automáticas
        Schema::create('scheduled_tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('lead_id')->nullable();
            $table->uuid('appointment_id')->nullable();
            $table->uuid('ticket_id')->nullable();
            
            // Tipo de tarefa
            $table->enum('type', [
                'appointment_reminder',     // Lembrete de agendamento
                'appointment_confirmation', // Pedir confirmação
                'follow_up',               // Follow-up geral
                'custom_message'           // Mensagem personalizada
            ]);
            
            // Quando executar
            $table->dateTime('scheduled_for');
            
            // Mensagem a enviar
            $table->text('message');
            
            // Canal de envio
            $table->enum('channel', ['whatsapp', 'email', 'sms'])->default('whatsapp');
            
            // Status
            $table->enum('status', [
                'pending',
                'processing',
                'sent',
                'failed',
                'cancelled'
            ])->default('pending');
            
            $table->dateTime('sent_at')->nullable();
            $table->text('error_message')->nullable();
            $table->integer('retry_count')->default(0);
            
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('cascade');
            $table->foreign('appointment_id')->references('id')->on('appointments')->onDelete('cascade');
            
            $table->index(['status', 'scheduled_for']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_tasks');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('user_schedule_exceptions');
        Schema::dropIfExists('user_schedules');
    }
};

