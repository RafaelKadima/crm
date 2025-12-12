<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adiciona índices otimizados para busca vetorial com pgvector.
     */
    public function up(): void
    {
        // Verifica se a extensão pgvector está instalada
        $hasPgvector = DB::select("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
        
        if (empty($hasPgvector)) {
            // Tenta criar a extensão (requer permissões)
            try {
                DB::statement('CREATE EXTENSION IF NOT EXISTS vector');
            } catch (\Exception $e) {
                // Se não conseguir criar, apenas loga e continua
                \Log::warning('Could not create pgvector extension: ' . $e->getMessage());
                return;
            }
        }

        // Índice IVFFlat para knowledge_base (se a coluna embedding existir)
        $hasEmbeddingColumn = DB::select("
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'knowledge_base' AND column_name = 'embedding'
        ");
        
        if (!empty($hasEmbeddingColumn)) {
            try {
                // Converte coluna para tipo vector se necessário
                DB::statement("
                    DO $$
                    BEGIN
                        -- Cria índice IVFFlat para busca vetorial rápida
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_indexes 
                            WHERE indexname = 'idx_knowledge_embedding_ivfflat'
                        ) THEN
                            -- Primeiro, garante que há dados suficientes para criar o índice
                            IF (SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL) >= 100 THEN
                                CREATE INDEX idx_knowledge_embedding_ivfflat 
                                ON knowledge_base 
                                USING ivfflat (embedding vector_l2_ops)
                                WITH (lists = 100);
                            END IF;
                        END IF;
                    EXCEPTION
                        WHEN OTHERS THEN
                            RAISE NOTICE 'Could not create IVFFlat index: %', SQLERRM;
                    END $$;
                ");
            } catch (\Exception $e) {
                \Log::warning('Could not create knowledge_base IVFFlat index: ' . $e->getMessage());
            }
        }

        // Índice para sdr_knowledge_embeddings
        $hasSdrTable = DB::select("
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'sdr_knowledge_embeddings'
        ");
        
        if (!empty($hasSdrTable)) {
            try {
                DB::statement("
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_indexes 
                            WHERE indexname = 'idx_sdr_knowledge_embedding_ivfflat'
                        ) THEN
                            IF (SELECT COUNT(*) FROM sdr_knowledge_embeddings WHERE embedding IS NOT NULL) >= 100 THEN
                                CREATE INDEX idx_sdr_knowledge_embedding_ivfflat 
                                ON sdr_knowledge_embeddings 
                                USING ivfflat (embedding vector_l2_ops)
                                WITH (lists = 100);
                            END IF;
                        END IF;
                    EXCEPTION
                        WHEN OTHERS THEN
                            RAISE NOTICE 'Could not create SDR IVFFlat index: %', SQLERRM;
                    END $$;
                ");
            } catch (\Exception $e) {
                \Log::warning('Could not create sdr_knowledge_embeddings IVFFlat index: ' . $e->getMessage());
            }
        }

        // Índices compostos para queries frequentes no knowledge_base
        try {
            DB::statement("
                CREATE INDEX IF NOT EXISTS idx_knowledge_tenant_context_active 
                ON knowledge_base (tenant_id, context, is_active)
            ");
        } catch (\Exception $e) {
            \Log::warning('Could not create composite index: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement('DROP INDEX IF EXISTS idx_knowledge_embedding_ivfflat');
            DB::statement('DROP INDEX IF EXISTS idx_sdr_knowledge_embedding_ivfflat');
            DB::statement('DROP INDEX IF EXISTS idx_knowledge_tenant_context_active');
        } catch (\Exception $e) {
            \Log::warning('Could not drop indexes: ' . $e->getMessage());
        }
    }
};

