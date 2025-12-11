<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Base de conhecimento unificada para todos os agentes (SDR, Ads, etc.)
     * Utiliza embeddings para busca semântica via RAG.
     */
    public function up(): void
    {
        Schema::create('knowledge_base', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Contexto do conhecimento
            $table->string('context'); // 'sdr', 'ads', 'general', 'products'
            $table->string('category'); // 'rules', 'best_practices', 'performance', 'faq', 'objections'
            
            // Conteúdo
            $table->string('title');
            $table->text('content');
            $table->text('summary')->nullable(); // Resumo para exibição
            
            // Embedding para busca vetorial
            $table->json('embedding')->nullable();
            
            // Metadados adicionais
            $table->json('metadata')->nullable();
            $table->json('tags')->nullable(); // Tags para filtro
            
            // Fonte do conhecimento
            $table->string('source')->nullable(); // 'manual', 'learned', 'feedback', 'performance'
            $table->string('source_reference')->nullable(); // ID da campanha, lead, etc.
            
            // Controle
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false); // Se foi verificado por humano
            $table->integer('usage_count')->default(0); // Quantas vezes foi usado
            $table->float('effectiveness_score')->nullable(); // 0-1, baseado em feedback
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'context', 'is_active']);
            $table->index(['tenant_id', 'category', 'is_active']);
            $table->index(['tenant_id', 'context', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('knowledge_base');
    }
};
