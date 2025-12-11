<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Feedback do marketer sobre campanhas e ações do agente.
     * Usado para aprendizado contínuo.
     */
    public function up(): void
    {
        Schema::create('ad_agent_feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignUuid('user_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Referência ao item avaliado
            $table->string('feedback_type'); // 'campaign', 'creative', 'copy', 'suggestion', 'action'
            $table->uuid('reference_id')->nullable(); // ID da campanha, criativo, etc.
            
            // Avaliação
            $table->string('rating'); // 'positive', 'negative', 'neutral'
            $table->integer('score')->nullable(); // 1-5 se aplicável
            
            // Conteúdo do feedback
            $table->text('original_content')->nullable(); // O que o agente fez/sugeriu
            $table->text('corrected_content')->nullable(); // Correção do marketer
            $table->text('comment')->nullable(); // Comentário adicional
            
            // Contexto
            $table->string('action_type')->nullable(); // 'create_campaign', 'generate_copy', etc.
            $table->json('context_data')->nullable(); // Dados de contexto
            
            // Status de processamento
            $table->boolean('is_processed')->default(false);
            $table->timestamp('processed_at')->nullable();
            $table->json('learning_result')->nullable(); // Resultado do aprendizado
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'feedback_type']);
            $table->index(['tenant_id', 'rating']);
            $table->index(['tenant_id', 'is_processed']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_agent_feedback');
    }
};

