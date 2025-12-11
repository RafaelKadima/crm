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
        Schema::create('ad_campaign_feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Campanha avaliada
            $table->foreignUuid('ad_campaign_id')->constrained('ad_campaigns')->onDelete('cascade');
            
            // Usuário que deu feedback
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            
            // Avaliação
            $table->string('rating'); // positive, negative, neutral
            $table->integer('score')->nullable(); // 1-5 stars
            
            // Feedback textual
            $table->text('feedback')->nullable();
            
            // Categorias do feedback
            $table->json('categories')->nullable(); // ['creative', 'copy', 'targeting', 'budget']
            
            // O que foi aprendido (gerado por IA)
            $table->text('learned_insight')->nullable();
            
            // Se já foi processado pelo sistema de aprendizado
            $table->boolean('is_processed')->default(false);
            $table->timestamp('processed_at')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'ad_campaign_id']);
            $table->index(['tenant_id', 'rating', 'is_processed']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_campaign_feedback');
    }
};

