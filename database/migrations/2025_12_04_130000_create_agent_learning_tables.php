<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabelas para Sistema de Aprendizado do Agente IA
 * 
 * 1. Feedback Loop - Avaliação de respostas
 * 2. FAQs Automáticas - Perguntas detectadas
 * 3. Memória Longa - Preferências do lead
 * 4. Padrões de Sucesso - Análise de conversas
 */
return new class extends Migration
{
    public function up(): void
    {
        // =====================================================
        // 1. FEEDBACK LOOP - Avaliação de respostas do agente
        // =====================================================
        Schema::create('agent_message_feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('message_id');  // Mensagem avaliada
            $table->uuid('ticket_id');
            $table->uuid('lead_id');
            $table->uuid('agent_id');    // SDR Agent que respondeu
            $table->uuid('evaluated_by')->nullable(); // Usuário que avaliou
            
            // Avaliação
            $table->enum('rating', ['positive', 'negative', 'neutral'])->default('neutral');
            $table->text('original_response');     // Resposta original do agente
            $table->text('corrected_response')->nullable(); // Resposta corrigida (se negativo)
            $table->string('feedback_reason')->nullable();  // Motivo do feedback
            $table->json('tags')->nullable();      // Tags: "tom_errado", "info_incorreta", etc
            
            // Contexto para aprendizado
            $table->text('lead_message');          // Mensagem que gerou a resposta
            $table->string('detected_intent')->nullable();
            $table->json('context_snapshot')->nullable(); // Snapshot do contexto usado
            
            // Status de aprendizado
            $table->boolean('processed_for_learning')->default(false);
            $table->timestamp('processed_at')->nullable();
            
            $table->timestamps();
            
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['agent_id', 'rating']);
            $table->index(['tenant_id', 'processed_for_learning']);
        });

        // =====================================================
        // 2. FAQs AUTOMÁTICAS - Perguntas detectadas
        // =====================================================
        Schema::create('agent_detected_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('agent_id');
            
            // Pergunta detectada
            $table->text('question');              // Pergunta normalizada
            $table->text('question_embedding')->nullable(); // Embedding para similaridade
            $table->integer('occurrence_count')->default(1);
            $table->json('variations')->nullable(); // Variações da pergunta
            
            // Resposta sugerida
            $table->text('suggested_answer')->nullable();
            $table->float('answer_confidence')->default(0);
            
            // Status de aprovação
            $table->enum('status', ['pending', 'approved', 'rejected', 'converted'])->default('pending');
            $table->uuid('approved_by')->nullable();
            $table->uuid('converted_to_faq_id')->nullable(); // ID do FAQ criado
            
            // Métricas
            $table->timestamp('first_seen_at');
            $table->timestamp('last_seen_at');
            $table->json('ticket_ids')->nullable(); // Tickets onde apareceu
            
            $table->timestamps();
            
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['agent_id', 'status']);
            $table->index(['tenant_id', 'occurrence_count']);
        });

        // =====================================================
        // 3. MEMÓRIA LONGA - Preferências e histórico do lead
        // =====================================================
        Schema::create('lead_memory', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('lead_id');
            
            // Preferências detectadas
            $table->json('preferences')->nullable();       // {"horario_contato": "tarde", "canal_preferido": "whatsapp"}
            $table->json('interests')->nullable();         // ["produto_x", "desconto", "financiamento"]
            $table->json('pain_points')->nullable();       // ["preço alto", "prazo entrega"]
            $table->json('objections_history')->nullable(); // Objeções levantadas
            
            // Comportamento
            $table->string('communication_style')->nullable(); // formal, informal, direto, detalhista
            $table->string('decision_pattern')->nullable();    // rapido, pesquisador, consulta_outros
            $table->float('response_time_avg')->nullable();    // Tempo médio de resposta em minutos
            $table->json('active_hours')->nullable();          // Horários que costuma responder
            
            // Histórico consolidado
            $table->integer('total_interactions')->default(0);
            $table->integer('positive_interactions')->default(0);
            $table->integer('meetings_scheduled')->default(0);
            $table->integer('meetings_attended')->default(0);
            $table->integer('purchases')->default(0);
            $table->decimal('total_purchased', 12, 2)->default(0);
            
            // Insights do ML
            $table->json('ml_insights')->nullable();       // Insights gerados pelo ML
            $table->float('conversion_probability')->nullable();
            $table->string('recommended_approach')->nullable();
            
            // Embedding para busca semântica
            $table->text('summary_embedding')->nullable();
            
            $table->timestamp('last_interaction_at')->nullable();
            $table->timestamps();
            
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('lead_id')->references('id')->on('leads')->onDelete('cascade');
            $table->unique(['tenant_id', 'lead_id']);
        });

        // =====================================================
        // 4. PADRÕES DE SUCESSO - Análise de conversas
        // =====================================================
        Schema::create('conversation_patterns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('agent_id');
            
            // Padrão identificado
            $table->string('pattern_type');        // "abertura", "objecao", "fechamento", "follow_up"
            $table->string('pattern_name');        // Nome descritivo
            $table->text('pattern_description');
            
            // Dados do padrão
            $table->json('trigger_phrases')->nullable();    // Frases que ativam o padrão
            $table->json('successful_responses')->nullable(); // Respostas que funcionaram
            $table->json('context_conditions')->nullable();   // Condições para aplicar
            
            // Métricas de sucesso
            $table->integer('times_used')->default(0);
            $table->integer('times_successful')->default(0);
            $table->float('success_rate')->default(0);
            $table->float('avg_conversion_impact')->default(0);
            
            // Status
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0);
            
            $table->timestamps();
            
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['agent_id', 'pattern_type', 'is_active']);
        });

        // =====================================================
        // 5. LOGS DE APRENDIZADO - Histórico de melhorias
        // =====================================================
        Schema::create('agent_learning_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('agent_id');
            
            $table->string('learning_type');       // "feedback", "faq_generated", "pattern_detected", "memory_updated"
            $table->string('learning_source');     // "user_feedback", "conversation_analysis", "ml_detection"
            $table->text('description');
            $table->json('data')->nullable();      // Dados específicos do aprendizado
            
            // Impacto
            $table->float('confidence_before')->nullable();
            $table->float('confidence_after')->nullable();
            
            $table->timestamps();
            
            $table->index(['agent_id', 'learning_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_learning_logs');
        Schema::dropIfExists('conversation_patterns');
        Schema::dropIfExists('lead_memory');
        Schema::dropIfExists('agent_detected_questions');
        Schema::dropIfExists('agent_message_feedback');
    }
};

