<?php

namespace App\Services;

use App\Models\SdrAgent;
use App\Models\SdrDocument;
use App\Models\SdrFaq;
use App\Models\SdrKnowledgeEntry;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class SemanticSearchService
{
    protected EmbeddingService $embeddingService;

    public function __construct(EmbeddingService $embeddingService)
    {
        $this->embeddingService = $embeddingService;
    }

    /**
     * Busca contexto relevante para uma mensagem.
     */
    public function searchRelevantContext(
        SdrAgent $agent,
        string $query,
        int $maxChunks = 5,
        int $maxTokens = 2000
    ): array {
        $results = [
            'knowledge' => [],
            'faqs' => [],
            'documents' => [],
            'total_tokens' => 0,
        ];

        // Gera embedding da query
        $queryEmbedding = $this->embeddingService->generateEmbedding($query);
        
        if (!$queryEmbedding) {
            // Fallback: retorna conteúdo sem filtro semântico (limitado)
            return $this->getFallbackContext($agent, $maxTokens);
        }

        $allChunks = [];

        // 1. Busca nas entradas de conhecimento
        $knowledgeEntries = $agent->activeKnowledgeEntries()->get();
        foreach ($knowledgeEntries as $entry) {
            if (!empty($entry->embeddings)) {
                // Se tem embeddings por chunk
                foreach ($entry->embeddings as $i => $embedding) {
                    $chunkContent = $entry->chunks[$i]['content'] ?? $entry->content;
                    $allChunks[] = [
                        'type' => 'knowledge',
                        'id' => $entry->id,
                        'title' => $entry->title,
                        'category' => $entry->category,
                        'content' => $chunkContent,
                        'embedding' => $embedding,
                    ];
                }
            } elseif (!empty($entry->embedding)) {
                // Embedding único para todo o conteúdo
                $allChunks[] = [
                    'type' => 'knowledge',
                    'id' => $entry->id,
                    'title' => $entry->title,
                    'category' => $entry->category,
                    'content' => $entry->content,
                    'embedding' => $entry->embedding,
                ];
            }
        }

        // 2. Busca nas FAQs
        $faqs = $agent->activeFaqs()->get();
        foreach ($faqs as $faq) {
            if (!empty($faq->embedding)) {
                $allChunks[] = [
                    'type' => 'faq',
                    'id' => $faq->id,
                    'question' => $faq->question,
                    'answer' => $faq->answer,
                    'content' => $faq->question . "\n" . $faq->answer,
                    'embedding' => $faq->embedding,
                ];
            }
        }

        // 3. Busca nos documentos processados
        $documents = $agent->activeDocuments()->get();
        foreach ($documents as $doc) {
            if (!empty($doc->embeddings) && !empty($doc->chunks)) {
                foreach ($doc->embeddings as $i => $embedding) {
                    $chunkContent = $doc->chunks[$i]['content'] ?? '';
                    if (!empty($chunkContent)) {
                        $allChunks[] = [
                            'type' => 'document',
                            'id' => $doc->id,
                            'name' => $doc->name,
                            'content' => $chunkContent,
                            'embedding' => $embedding,
                        ];
                    }
                }
            }
        }

        // 4. Calcula similaridade e ordena
        $rankedChunks = [];
        foreach ($allChunks as $chunk) {
            $similarity = $this->embeddingService->cosineSimilarity(
                $queryEmbedding,
                $chunk['embedding']
            );
            
            if ($similarity >= 0.25) { // Threshold mínimo
                $chunk['similarity'] = $similarity;
                $rankedChunks[] = $chunk;
            }
        }

        // Ordena por similaridade
        usort($rankedChunks, fn($a, $b) => $b['similarity'] <=> $a['similarity']);

        // 5. Seleciona chunks respeitando limite de tokens
        $currentTokens = 0;
        $selectedCount = 0;

        foreach ($rankedChunks as $chunk) {
            if ($selectedCount >= $maxChunks) {
                break;
            }

            $chunkTokens = $this->embeddingService->estimateTokens($chunk['content']);
            
            if ($currentTokens + $chunkTokens > $maxTokens) {
                continue; // Pula se exceder limite
            }

            $currentTokens += $chunkTokens;
            $selectedCount++;

            // Adiciona ao resultado apropriado
            $cleanChunk = [
                'content' => $chunk['content'],
                'similarity' => round($chunk['similarity'], 3),
            ];

            switch ($chunk['type']) {
                case 'knowledge':
                    $cleanChunk['title'] = $chunk['title'];
                    $cleanChunk['category'] = $chunk['category'] ?? null;
                    $results['knowledge'][] = $cleanChunk;
                    break;
                    
                case 'faq':
                    $results['faqs'][] = [
                        'question' => $chunk['question'],
                        'answer' => $chunk['answer'],
                        'similarity' => round($chunk['similarity'], 3),
                    ];
                    break;
                    
                case 'document':
                    $cleanChunk['document_name'] = $chunk['name'];
                    $results['documents'][] = $cleanChunk;
                    break;
            }
        }

        $results['total_tokens'] = $currentTokens;
        $results['chunks_found'] = count($rankedChunks);
        $results['chunks_selected'] = $selectedCount;

        return $results;
    }

    /**
     * Fallback quando embeddings não estão disponíveis.
     */
    protected function getFallbackContext(SdrAgent $agent, int $maxTokens): array
    {
        $results = [
            'knowledge' => [],
            'faqs' => [],
            'documents' => [],
            'total_tokens' => 0,
            'fallback' => true,
        ];

        $currentTokens = 0;

        // Pega FAQs primeiro (geralmente mais úteis)
        $faqs = $agent->activeFaqs()->limit(5)->get();
        foreach ($faqs as $faq) {
            $content = $faq->question . "\n" . $faq->answer;
            $tokens = $this->embeddingService->estimateTokens($content);
            
            if ($currentTokens + $tokens > $maxTokens) break;
            
            $results['faqs'][] = [
                'question' => $faq->question,
                'answer' => $faq->answer,
            ];
            $currentTokens += $tokens;
        }

        // Pega knowledge entries
        $entries = $agent->activeKnowledgeEntries()->limit(3)->get();
        foreach ($entries as $entry) {
            $tokens = $this->embeddingService->estimateTokens($entry->content);
            
            if ($currentTokens + $tokens > $maxTokens) {
                // Trunca conteúdo
                $maxChars = ($maxTokens - $currentTokens) * 3;
                $content = substr($entry->content, 0, $maxChars);
            } else {
                $content = $entry->content;
            }
            
            $results['knowledge'][] = [
                'title' => $entry->title,
                'category' => $entry->category,
                'content' => $content,
            ];
            $currentTokens += $this->embeddingService->estimateTokens($content);
            
            if ($currentTokens >= $maxTokens) break;
        }

        $results['total_tokens'] = $currentTokens;

        return $results;
    }

    /**
     * Gera embeddings para uma entrada de conhecimento.
     */
    public function embedKnowledgeEntry(SdrKnowledgeEntry $entry): bool
    {
        try {
            // Para textos pequenos, gera um embedding único
            if (strlen($entry->content) < 2000) {
                $embedding = $this->embeddingService->generateEmbedding($entry->content);
                
                if ($embedding) {
                    $entry->update([
                        'embeddings' => [$embedding],
                        'chunks' => [['content' => $entry->content]],
                        'embedding_model' => $this->embeddingService->getModel(),
                    ]);
                    return true;
                }
            } else {
                // Para textos grandes, divide em chunks
                $chunks = $this->createChunks($entry->content);
                $texts = array_column($chunks, 'content');
                $embeddings = $this->embeddingService->generateEmbeddings($texts);
                
                if (!empty($embeddings)) {
                    $entry->update([
                        'embeddings' => array_values($embeddings),
                        'chunks' => $chunks,
                        'embedding_model' => $this->embeddingService->getModel(),
                    ]);
                    return true;
                }
            }

            return false;

        } catch (\Exception $e) {
            Log::error('Failed to embed knowledge entry', [
                'entry_id' => $entry->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Gera embedding para uma FAQ.
     */
    public function embedFaq(SdrFaq $faq): bool
    {
        try {
            // Combina pergunta e resposta para o embedding
            $text = $faq->question . "\n" . $faq->answer;
            $embedding = $this->embeddingService->generateEmbedding($text);
            
            if ($embedding) {
                $faq->update([
                    'embedding' => $embedding,
                    'embedding_model' => $this->embeddingService->getModel(),
                ]);
                return true;
            }

            return false;

        } catch (\Exception $e) {
            Log::error('Failed to embed FAQ', [
                'faq_id' => $faq->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Gera embeddings para chunks de um documento.
     */
    public function embedDocumentChunks(SdrDocument $document): bool
    {
        try {
            if (empty($document->chunks)) {
                return false;
            }

            $texts = array_column($document->chunks, 'content');
            $embeddings = $this->embeddingService->generateEmbeddings($texts);
            
            if (!empty($embeddings)) {
                $document->update([
                    'embeddings' => array_values($embeddings),
                    'embedding_model' => $this->embeddingService->getModel(),
                ]);
                return true;
            }

            return false;

        } catch (\Exception $e) {
            Log::error('Failed to embed document chunks', [
                'document_id' => $document->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Divide texto em chunks.
     */
    protected function createChunks(string $content, int $chunkSize = 1000, int $overlap = 200): array
    {
        $chunks = [];
        $paragraphs = preg_split('/\n\s*\n/', $content);
        
        $currentChunk = '';
        $chunkIndex = 0;
        
        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);
            if (empty($paragraph)) continue;
            
            if (strlen($currentChunk) + strlen($paragraph) > $chunkSize && !empty($currentChunk)) {
                $chunks[] = [
                    'index' => $chunkIndex++,
                    'content' => trim($currentChunk),
                ];
                
                // Overlap
                $words = explode(' ', $currentChunk);
                $overlapWords = array_slice($words, -intval($overlap / 5));
                $currentChunk = implode(' ', $overlapWords) . "\n\n";
            }
            
            $currentChunk .= $paragraph . "\n\n";
        }
        
        if (!empty(trim($currentChunk))) {
            $chunks[] = [
                'index' => $chunkIndex,
                'content' => trim($currentChunk),
            ];
        }
        
        return $chunks;
    }
}

