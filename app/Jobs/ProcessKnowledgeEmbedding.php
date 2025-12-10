<?php

namespace App\Jobs;

use App\Models\SdrAgent;
use App\Models\SdrFaq;
use App\Models\SdrKnowledgeEntry;
use App\Services\EmbeddingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Job para processar embeddings de FAQs e Knowledge Entries.
 * 
 * Este job:
 * 1. Recebe um FAQ ou Knowledge Entry
 * 2. Gera embedding do conteúdo via OpenAI
 * 3. Salva na tabela sdr_knowledge_embeddings
 */
class ProcessKnowledgeEmbedding implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    protected string $type;
    protected string $id;
    protected string $tenantId;
    protected string $agentId;
    protected string $content;
    protected string $source;
    protected array $metadata;

    /**
     * Cria uma nova instância do job.
     */
    public function __construct(
        string $type,
        string $id,
        string $tenantId,
        string $agentId,
        string $content,
        string $source = 'unknown',
        array $metadata = []
    ) {
        $this->type = $type;
        $this->id = $id;
        $this->tenantId = $tenantId;
        $this->agentId = $agentId;
        $this->content = $content;
        $this->source = $source;
        $this->metadata = $metadata;
    }

    /**
     * Factory method para FAQ.
     */
    public static function forFaq(SdrFaq $faq): self
    {
        $agent = $faq->agent;
        
        // Combina pergunta + resposta para melhor embedding
        $content = "Pergunta: {$faq->question}\nResposta: {$faq->answer}";
        
        return new self(
            type: 'faq',
            id: $faq->id,
            tenantId: $agent->tenant_id,
            agentId: $agent->id,
            content: $content,
            source: 'faq',
            metadata: [
                'question' => $faq->question,
                'keywords' => $faq->keywords ?? [],
                'priority' => $faq->priority ?? 0,
            ]
        );
    }

    /**
     * Factory method para Knowledge Entry.
     */
    public static function forKnowledge(SdrKnowledgeEntry $entry): self
    {
        $agent = $entry->agent;
        
        // Combina título + conteúdo
        $content = "Título: {$entry->title}\n\n{$entry->content}";
        
        return new self(
            type: 'knowledge',
            id: $entry->id,
            tenantId: $agent->tenant_id,
            agentId: $agent->id,
            content: $content,
            source: 'knowledge_entry',
            metadata: [
                'title' => $entry->title,
                'category' => $entry->category,
                'tags' => $entry->tags ?? [],
            ]
        );
    }

    /**
     * Factory method para documento (chunk).
     */
    public static function forDocumentChunk(
        string $documentId,
        string $tenantId,
        string $agentId,
        string $content,
        int $chunkIndex,
        string $documentName
    ): self {
        return new self(
            type: 'document_chunk',
            id: $documentId . '_' . $chunkIndex,
            tenantId: $tenantId,
            agentId: $agentId,
            content: $content,
            source: 'document',
            metadata: [
                'document_id' => $documentId,
                'document_name' => $documentName,
                'chunk_index' => $chunkIndex,
            ]
        );
    }

    /**
     * Executa o job.
     */
    public function handle(EmbeddingService $embeddingService): void
    {
        Log::info('Processing knowledge embedding', [
            'type' => $this->type,
            'id' => $this->id,
            'content_length' => strlen($this->content),
        ]);

        try {
            // Gera o embedding
            $embedding = $embeddingService->generateEmbedding($this->content);

            if (!$embedding) {
                Log::warning('Failed to generate embedding', [
                    'type' => $this->type,
                    'id' => $this->id,
                ]);
                return;
            }

            // Remove embedding anterior do mesmo item (se existir)
            DB::table('sdr_knowledge_embeddings')
                ->where('source_type', $this->type)
                ->where('source_id', $this->id)
                ->delete();

            // Salva o novo embedding
            DB::table('sdr_knowledge_embeddings')->insert([
                'id' => Str::uuid(),
                'tenant_id' => $this->tenantId,
                'sdr_agent_id' => $this->agentId,
                'source_type' => $this->type,
                'source_id' => $this->id,
                'content' => $this->content,
                'embedding' => json_encode($embedding), // Converte para JSON
                'source' => $this->source,
                'metadata' => json_encode($this->metadata),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('Knowledge embedding saved', [
                'type' => $this->type,
                'id' => $this->id,
                'embedding_size' => count($embedding),
            ]);

        } catch (\Exception $e) {
            Log::error('Knowledge embedding failed', [
                'type' => $this->type,
                'id' => $this->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}

