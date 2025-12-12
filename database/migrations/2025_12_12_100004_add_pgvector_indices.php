<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adiciona indices pgvector para busca vetorial otimizada.
     */
    public function up(): void
    {
        // Verifica se a extensão vector existe antes de criar indices
        $hasVector = DB::select("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
        
        if (!empty($hasVector)) {
            // Indice para knowledge_base (se a coluna embedding existir como vector)
            DB::statement("
                CREATE INDEX IF NOT EXISTS idx_knowledge_embedding 
                ON knowledge_base 
                USING ivfflat (embedding vector_l2_ops)
                WITH (lists = 100)
            ");
            
            // Indice para sdr_knowledge_embeddings
            DB::statement("
                CREATE INDEX IF NOT EXISTS idx_sdr_knowledge_embedding 
                ON sdr_knowledge_embeddings 
                USING ivfflat (embedding vector_l2_ops)
                WITH (lists = 100)
            ");
        }
        
        // Indices compostos para filtros comuns (não dependem de pgvector)
        DB::statement("
            CREATE INDEX IF NOT EXISTS idx_knowledge_tenant_context 
            ON knowledge_base (tenant_id, context, is_active)
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("DROP INDEX IF EXISTS idx_knowledge_embedding");
        DB::statement("DROP INDEX IF EXISTS idx_sdr_knowledge_embedding");
        DB::statement("DROP INDEX IF EXISTS idx_knowledge_tenant_context");
    }
};

