<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sdr_knowledge_embeddings', function (Blueprint $table) {
            // Adiciona colunas para rastrear origem
            if (!Schema::hasColumn('sdr_knowledge_embeddings', 'source_type')) {
                $table->string('source_type')->nullable()->after('source'); // faq, knowledge, document_chunk
            }
            if (!Schema::hasColumn('sdr_knowledge_embeddings', 'source_id')) {
                $table->string('source_id')->nullable()->after('source_type');
            }
            if (!Schema::hasColumn('sdr_knowledge_embeddings', 'embedding')) {
                // Armazena como JSON (array de floats)
                // Para PostgreSQL com pgvector, seria: $table->vector('embedding', 1536);
                $table->json('embedding')->nullable()->after('content');
            }
        });

        // Adiciona índice composto
        Schema::table('sdr_knowledge_embeddings', function (Blueprint $table) {
            $table->index(['source_type', 'source_id'], 'idx_knowledge_source');
        });
    }

    public function down(): void
    {
        Schema::table('sdr_knowledge_embeddings', function (Blueprint $table) {
            $table->dropIndex('idx_knowledge_source');
            $table->dropColumn(['source_type', 'source_id', 'embedding']);
        });
    }
};

