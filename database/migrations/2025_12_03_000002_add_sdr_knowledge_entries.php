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
        // Entradas de conhecimento em texto (RAG)
        Schema::create('sdr_knowledge_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sdr_agent_id')->constrained()->cascadeOnDelete();
            
            $table->string('title'); // Título/categoria do conhecimento
            $table->longText('content'); // Conteúdo do conhecimento
            $table->string('category')->nullable(); // Categoria (produtos, preços, políticas, etc)
            $table->json('tags')->nullable(); // Tags para busca
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['sdr_agent_id', 'is_active']);
            $table->index(['category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sdr_knowledge_entries');
    }
};

