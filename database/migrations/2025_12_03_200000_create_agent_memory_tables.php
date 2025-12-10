<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabelas para memória dos agentes SDR.
     */
    public function up(): void
    {
        // Memória de curto prazo - contexto por lead
        Schema::create('lead_agent_context', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('lead_id')->unique();
            $table->string('last_intent')->nullable();
            $table->string('last_action')->nullable();
            $table->text('context_summary')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('lead_id')
                ->references('id')
                ->on('leads')
                ->onDelete('cascade');

            $table->index('lead_id');
        });

        // Memória de longo prazo - perfil consolidado do lead
        Schema::create('lead_long_term_memory', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('lead_id')->unique();
            $table->uuid('tenant_id');
            $table->json('behavior_patterns')->default('[]');
            $table->json('preferences')->default('{}');
            $table->json('purchase_history')->default('[]');
            $table->string('interaction_style')->default('unknown');
            $table->json('key_insights')->default('[]');
            $table->timestamps();

            $table->foreign('lead_id')
                ->references('id')
                ->on('leads')
                ->onDelete('cascade');

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'lead_id']);
        });

        // Embeddings de conhecimento (para RAG local com pgvector)
        Schema::create('sdr_knowledge_embeddings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sdr_agent_id')->nullable();
            $table->text('content');
            $table->string('source')->default('document'); // document, faq, product, lead_memory
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('sdr_agent_id')
                ->references('id')
                ->on('sdr_agents')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'sdr_agent_id']);
            $table->index(['tenant_id', 'source']);
        });

        // Adiciona coluna de embedding (vetor) se pgvector estiver disponível
        // Executar manualmente se necessário:
        // ALTER TABLE sdr_knowledge_embeddings ADD COLUMN embedding vector(1536);
        // CREATE INDEX ON sdr_knowledge_embeddings USING ivfflat (embedding vector_cosine_ops);

        // Log de interações do agente (para ML e analytics)
        Schema::create('agent_interaction_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sdr_agent_id');
            $table->uuid('lead_id');
            $table->uuid('ticket_id')->nullable();
            $table->uuid('message_id')->nullable();
            
            // Input
            $table->text('user_message');
            $table->string('detected_intent')->nullable();
            $table->float('intent_confidence')->nullable();
            
            // Output
            $table->string('action_taken');
            $table->text('agent_response')->nullable();
            $table->float('action_confidence')->nullable();
            
            // Qualificação
            $table->string('lead_temperature')->nullable();
            $table->float('lead_score')->nullable();
            $table->json('qualification_data')->nullable();
            
            // Contexto usado
            $table->integer('rag_chunks_used')->default(0);
            $table->integer('history_messages_used')->default(0);
            
            // Métricas
            $table->integer('response_time_ms')->nullable();
            $table->integer('tokens_used')->nullable();
            $table->float('estimated_cost')->nullable();
            
            // Feedback (para treino futuro)
            $table->boolean('was_helpful')->nullable();
            $table->string('feedback_type')->nullable();
            $table->text('feedback_notes')->nullable();
            
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('sdr_agent_id')
                ->references('id')
                ->on('sdr_agents')
                ->onDelete('cascade');

            $table->foreign('lead_id')
                ->references('id')
                ->on('leads')
                ->onDelete('cascade');

            $table->index(['tenant_id', 'created_at']);
            $table->index(['sdr_agent_id', 'created_at']);
            $table->index(['lead_id', 'created_at']);
            $table->index(['action_taken', 'created_at']);
            $table->index(['lead_temperature', 'created_at']);
        });

        // Follow-ups agendados pelo agente
        Schema::create('agent_follow_ups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('sdr_agent_id');
            $table->uuid('lead_id');
            $table->uuid('ticket_id')->nullable();
            
            $table->text('message');
            $table->timestamp('scheduled_for');
            $table->string('status')->default('pending'); // pending, sent, cancelled
            $table->timestamp('sent_at')->nullable();
            
            $table->timestamps();

            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('sdr_agent_id')
                ->references('id')
                ->on('sdr_agents')
                ->onDelete('cascade');

            $table->foreign('lead_id')
                ->references('id')
                ->on('leads')
                ->onDelete('cascade');

            $table->index(['status', 'scheduled_for']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_follow_ups');
        Schema::dropIfExists('agent_interaction_logs');
        Schema::dropIfExists('sdr_knowledge_embeddings');
        Schema::dropIfExists('lead_long_term_memory');
        Schema::dropIfExists('lead_agent_context');
    }
};

