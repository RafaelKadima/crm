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
        // Adiciona embeddings aos documentos
        Schema::table('sdr_documents', function (Blueprint $table) {
            $table->json('embeddings')->nullable()->after('chunks'); // Vetor de embeddings
            $table->string('embedding_model')->nullable()->after('embeddings'); // Modelo usado
        });

        // Adiciona embeddings às entradas de conhecimento
        Schema::table('sdr_knowledge_entries', function (Blueprint $table) {
            $table->json('chunks')->nullable()->after('tags'); // Chunks do texto
            $table->json('embeddings')->nullable()->after('chunks'); // Vetor de embeddings
            $table->string('embedding_model')->nullable()->after('embeddings');
        });

        // Adiciona embeddings às FAQs
        Schema::table('sdr_faqs', function (Blueprint $table) {
            $table->json('embedding')->nullable()->after('keywords'); // Embedding da pergunta
            $table->string('embedding_model')->nullable()->after('embedding');
        });

        // Tabela de cache de contexto
        Schema::create('sdr_context_cache', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sdr_agent_id')->constrained()->cascadeOnDelete();
            
            $table->string('cache_key')->unique(); // Hash do conteúdo
            $table->string('provider'); // openai, anthropic, etc
            $table->string('cache_id')->nullable(); // ID do cache no provider
            $table->text('content_hash'); // Hash do conteúdo cacheado
            $table->integer('token_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_used_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['sdr_agent_id', 'provider']);
            $table->index(['cache_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sdr_context_cache');
        
        Schema::table('sdr_faqs', function (Blueprint $table) {
            $table->dropColumn(['embedding', 'embedding_model']);
        });
        
        Schema::table('sdr_knowledge_entries', function (Blueprint $table) {
            $table->dropColumn(['chunks', 'embeddings', 'embedding_model']);
        });
        
        Schema::table('sdr_documents', function (Blueprint $table) {
            $table->dropColumn(['embeddings', 'embedding_model']);
        });
    }
};

