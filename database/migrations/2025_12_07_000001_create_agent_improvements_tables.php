<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Logs estruturados de ações do agente
        Schema::create('agent_action_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sdr_agent_id');
            $table->uuid('ticket_id')->nullable();
            $table->uuid('lead_id')->nullable();
            $table->string('action_type', 50); // send_message, move_stage, schedule_meeting, qualify_lead, escalate
            $table->json('action_data')->nullable(); // Detalhes da ação
            $table->text('trigger_message')->nullable(); // Mensagem que disparou
            $table->text('response_text')->nullable(); // Resposta gerada
            $table->string('model_used', 50)->nullable(); // gpt-4o-mini, gpt-4o, etc
            $table->integer('tokens_used')->nullable();
            $table->integer('latency_ms')->nullable();
            $table->boolean('success')->default(true);
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sdr_agent_id')->references('id')->on('sdr_agents')->onDelete('cascade');
            $table->foreign('ticket_id')->references('id')->on('tickets')->onDelete('set null');
            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('set null');

            $table->index(['tenant_id', 'created_at']);
            $table->index(['sdr_agent_id', 'action_type']);
            $table->index(['lead_id', 'created_at']);
        });

        // 2. Regras de estágio do agente (externalizado do JSON)
        Schema::create('agent_stage_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sdr_agent_id');
            $table->uuid('pipeline_stage_id'); // FK real para o estágio
            $table->string('trigger_condition')->nullable(); // "cliente agendou visita", "mostrou interesse"
            $table->text('action_template')->nullable(); // Ação a tomar
            $table->uuid('auto_move_to')->nullable(); // Estágio de destino automático
            $table->boolean('notify_human')->default(false);
            $table->string('notification_channel')->nullable(); // email, whatsapp, slack
            $table->integer('priority')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sdr_agent_id')->references('id')->on('sdr_agents')->onDelete('cascade');
            $table->foreign('pipeline_stage_id')->references('id')->on('pipeline_stages')->onDelete('cascade');
            $table->foreign('auto_move_to')->references('id')->on('pipeline_stages')->onDelete('set null');

            $table->index(['sdr_agent_id', 'pipeline_stage_id']);
            $table->unique(['sdr_agent_id', 'pipeline_stage_id', 'trigger_condition'], 'unique_stage_rule');
        });

        // 3. Regras de escalação para humano
        Schema::create('agent_escalation_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sdr_agent_id');
            $table->string('condition_type', 50); // keyword, sentiment, time_in_stage, explicit_request, message_count
            $table->string('condition_value'); // "falar com humano", "negative", "24h", "5"
            $table->string('action', 50); // pause_agent, notify_owner, transfer_ticket, create_task
            $table->text('notification_template')->nullable();
            $table->uuid('assign_to_user_id')->nullable(); // Usuário específico para atribuir
            $table->integer('priority')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sdr_agent_id')->references('id')->on('sdr_agents')->onDelete('cascade');
            $table->foreign('assign_to_user_id')->references('id')->on('users')->onDelete('set null');

            $table->index(['sdr_agent_id', 'condition_type']);
        });

        // 4. Templates de agentes pré-configurados
        Schema::create('agent_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('category', 50); // sales, support, onboarding, post_sales
            $table->string('description')->nullable();
            $table->text('system_prompt');
            $table->text('personality')->nullable();
            $table->text('objectives')->nullable();
            $table->text('restrictions')->nullable();
            $table->text('pipeline_instructions')->nullable();
            $table->json('recommended_stages')->nullable(); // Estrutura sugerida de pipeline
            $table->json('example_rules')->nullable(); // Regras de exemplo
            $table->json('settings')->nullable(); // Configurações recomendadas
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('category');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_escalation_rules');
        Schema::dropIfExists('agent_stage_rules');
        Schema::dropIfExists('agent_action_logs');
        Schema::dropIfExists('agent_templates');
    }
};



