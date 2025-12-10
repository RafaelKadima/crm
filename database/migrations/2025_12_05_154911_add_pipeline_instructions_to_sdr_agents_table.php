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
        // Adicionar campo de instruções de fluxo no agente
        Schema::table('sdr_agents', function (Blueprint $table) {
            // Instruções gerais de como o agente deve gerenciar o pipeline
            $table->text('pipeline_instructions')->nullable()->after('knowledge_instructions');
            
            // Configuração JSON com regras específicas por estágio
            // Exemplo: {"stage_id": {"trigger": "cliente agendou visita", "action": "mover para este estágio"}}
            $table->json('stage_rules')->nullable()->after('pipeline_instructions');
            
            // Se o agente pode mover leads automaticamente
            $table->boolean('can_move_leads')->default(true)->after('stage_rules');
        });

        // Criar tabela pivot para relacionar agentes com pipelines
        Schema::create('sdr_agent_pipeline', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sdr_agent_id')->constrained('sdr_agents')->onDelete('cascade');
            $table->foreignUuid('pipeline_id')->constrained('pipelines')->onDelete('cascade');
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->boolean('is_primary')->default(false); // Pipeline principal do agente
            $table->timestamps();

            $table->unique(['sdr_agent_id', 'pipeline_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sdr_agent_pipeline');
        
        Schema::table('sdr_agents', function (Blueprint $table) {
            $table->dropColumn(['pipeline_instructions', 'stage_rules', 'can_move_leads']);
        });
    }
};
