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
        Schema::table('tenant_usage_stats', function (Blueprint $table) {
            // Total de Unidades de IA consumidas no mês
            $table->decimal('ai_units_used', 12, 2)->default(0)->after('ai_cost_brl');
            
            // Breakdown por modelo
            $table->decimal('ai_units_4o_mini', 12, 2)->default(0)->after('ai_units_used');
            $table->decimal('ai_units_4o', 12, 2)->default(0)->after('ai_units_4o_mini');
            
            // Documentos RAG processados no mês
            $table->integer('rag_documents_processed')->default(0)->after('ai_units_4o');
            
            // Minutos de áudio transcritos no mês
            $table->integer('audio_minutes_used')->default(0)->after('rag_documents_processed');
            
            // Análises de imagem realizadas no mês
            $table->integer('image_analyses_used')->default(0)->after('audio_minutes_used');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_usage_stats', function (Blueprint $table) {
            $table->dropColumn([
                'ai_units_used',
                'ai_units_4o_mini',
                'ai_units_4o',
                'rag_documents_processed',
                'audio_minutes_used',
                'image_analyses_used',
            ]);
        });
    }
};

