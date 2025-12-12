<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Tabela para armazenar experiências de Reinforcement Learning.
     * Armazena (state, action, reward, next_state) para treinamento de políticas.
     */
    public function up(): void
    {
        Schema::create('rl_experiences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('agent_type', 50); // 'sdr' ou 'ads'
            $table->string('entity_id')->nullable(); // lead_id ou campaign_id
            $table->jsonb('state'); // Estado atual
            $table->string('action', 50); // Ação tomada
            $table->float('reward')->nullable(); // Recompensa (pode vir depois)
            $table->jsonb('next_state')->nullable(); // Próximo estado
            $table->boolean('is_terminal')->default(false); // Se é estado final
            $table->boolean('reward_received')->default(false); // Se já recebeu reward
            $table->string('policy_mode', 20)->nullable(); // RULE_BASED, BANDIT, DQN
            $table->float('action_confidence')->nullable(); // Confiança na ação
            $table->timestamps();

            // Índices para queries frequentes
            $table->index(['tenant_id', 'agent_type']);
            $table->index(['tenant_id', 'agent_type', 'reward_received']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rl_experiences');
    }
};
