<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Tabela para armazenar logs de ações dos agentes com explicações.
     * Permite explainability e auditoria das decisões da IA.
     */
    public function up(): void
    {
        Schema::create('agent_action_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('agent_type', 50); // 'sdr' ou 'ads'
            $table->uuid('entity_id')->nullable(); // lead_id ou campaign_id
            $table->string('entity_type', 50)->nullable(); // 'lead', 'campaign', 'adset', etc.
            $table->string('action', 50);
            $table->jsonb('state_snapshot')->nullable(); // Estado no momento da ação
            $table->text('explanation')->nullable(); // Explicação em linguagem natural
            $table->string('policy_mode', 20)->nullable(); // RULE_BASED, BANDIT, DQN
            $table->float('confidence')->nullable(); // Confiança na decisão (0-1)
            $table->jsonb('contributing_factors')->nullable(); // Fatores que influenciaram
            $table->boolean('was_overridden')->default(false); // Usuário sobrescreveu?
            $table->text('override_reason')->nullable(); // Motivo da sobrescrita
            $table->uuid('overridden_by')->nullable(); // User que sobrescreveu
            $table->string('outcome')->nullable(); // Resultado da ação (success, failed, pending)
            $table->float('outcome_reward')->nullable(); // Reward calculado
            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'agent_type', 'created_at']);
            $table->index(['tenant_id', 'entity_id']);
            $table->index(['tenant_id', 'was_overridden']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_action_logs');
    }
};
