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
        // Agentes SDR de cada tenant
        Schema::create('sdr_agents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('channel_id')->nullable()->constrained()->nullOnDelete();
            
            $table->string('name'); // Nome do agente (ex: "SDR Vendas", "SDR Suporte")
            $table->string('avatar')->nullable(); // URL do avatar
            $table->text('description')->nullable(); // Descrição do agente
            
            // Configurações do prompt
            $table->text('system_prompt'); // Prompt base do sistema
            $table->text('personality')->nullable(); // Personalidade (ex: "amigável, profissional")
            $table->text('objectives')->nullable(); // Objetivos (ex: "qualificar leads, agendar reuniões")
            $table->text('restrictions')->nullable(); // Restrições (ex: "não falar de preços, não prometer prazos")
            $table->text('knowledge_instructions')->nullable(); // Instruções sobre como usar a base de conhecimento
            
            // Configurações de comportamento
            $table->json('settings')->nullable(); // Configurações adicionais
            $table->string('language')->default('pt-BR');
            $table->string('tone')->default('professional'); // professional, friendly, formal, casual
            
            // Configuração do n8n/IA
            $table->string('webhook_url')->nullable(); // URL do webhook n8n específico
            $table->string('ai_model')->default('gpt-4o-mini'); // Modelo de IA a usar
            $table->decimal('temperature', 3, 2)->default(0.7); // Temperatura do modelo
            
            // Status
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['tenant_id', 'is_active']);
        });

        // Documentos da base de conhecimento do SDR (RAG)
        Schema::create('sdr_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sdr_agent_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->string('name'); // Nome do documento
            $table->string('original_filename'); // Nome original do arquivo
            $table->string('file_path'); // Caminho do arquivo
            $table->string('file_type'); // pdf, txt, docx, etc
            $table->unsignedBigInteger('file_size'); // Tamanho em bytes
            
            // Conteúdo processado para RAG
            $table->longText('content')->nullable(); // Texto extraído do documento
            $table->json('chunks')->nullable(); // Chunks para embedding
            $table->json('embeddings_metadata')->nullable(); // Metadados dos embeddings
            
            // Status do processamento
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamp('processed_at')->nullable();
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['sdr_agent_id', 'is_active']);
            $table->index(['status']);
        });

        // FAQs e respostas prontas do SDR
        Schema::create('sdr_faqs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sdr_agent_id')->constrained()->cascadeOnDelete();
            
            $table->string('question'); // Pergunta
            $table->text('answer'); // Resposta padrão
            $table->json('keywords')->nullable(); // Palavras-chave para matching
            $table->integer('priority')->default(0); // Prioridade de matching
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['sdr_agent_id', 'is_active']);
        });

        // Log de interações do SDR para análise
        Schema::create('sdr_interactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sdr_agent_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('lead_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('ticket_id')->nullable()->constrained()->nullOnDelete();
            
            $table->text('user_message'); // Mensagem do usuário
            $table->text('agent_response'); // Resposta do SDR
            $table->json('context_used')->nullable(); // Documentos/FAQs usados na resposta
            
            $table->integer('tokens_input')->nullable();
            $table->integer('tokens_output')->nullable();
            $table->decimal('cost', 10, 6)->nullable(); // Custo da interação
            
            $table->integer('response_time_ms')->nullable(); // Tempo de resposta
            $table->enum('feedback', ['positive', 'negative', 'neutral'])->nullable();
            
            $table->timestamps();
            
            $table->index(['sdr_agent_id', 'created_at']);
            $table->index(['lead_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sdr_interactions');
        Schema::dropIfExists('sdr_faqs');
        Schema::dropIfExists('sdr_documents');
        Schema::dropIfExists('sdr_agents');
    }
};

