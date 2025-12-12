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
        Schema::table('tenant_quotas', function (Blueprint $table) {
            // Franquia de Unidades de IA por mês
            $table->integer('max_ai_units_month')->default(0)->after('max_ai_cost_month');
            
            // Unidades bônus (compradas via pacotes)
            $table->integer('bonus_ai_units')->default(0)->after('max_ai_units_month');
            
            // Limite de documentos RAG por mês
            $table->integer('max_rag_documents_month')->default(0)->after('bonus_ai_units');
            
            // Limite de minutos de áudio por mês
            $table->integer('max_audio_minutes_month')->default(0)->after('max_rag_documents_month');
            
            // Limite de análises de imagem por mês
            $table->integer('max_image_analyses_month')->default(0)->after('max_audio_minutes_month');
            
            // Se pode usar GPT-4o (modelo premium)
            $table->boolean('gpt4o_enabled')->default(false)->after('max_image_analyses_month');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_quotas', function (Blueprint $table) {
            $table->dropColumn([
                'max_ai_units_month',
                'bonus_ai_units',
                'max_rag_documents_month',
                'max_audio_minutes_month',
                'max_image_analyses_month',
                'gpt4o_enabled',
            ]);
        });
    }
};

