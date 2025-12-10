<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class EmbeddingService
{
    protected string $apiKey;
    protected string $model;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key', '');
        $this->model = config('services.openai.embedding_model', 'text-embedding-3-small');
        $this->baseUrl = config('services.openai.base_url', 'https://api.openai.com/v1');
    }

    /**
     * Gera embedding para um texto.
     */
    public function generateEmbedding(string $text): ?array
    {
        if (empty($this->apiKey)) {
            Log::warning('OpenAI API key not configured for embeddings');
            return null;
        }

        try {
            // Limpa e trunca o texto
            $text = $this->prepareText($text);
            
            if (empty($text)) {
                return null;
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/embeddings', [
                'model' => $this->model,
                'input' => $text,
            ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['data'][0]['embedding'] ?? null;
            }

            Log::error('Embedding API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;

        } catch (\Exception $e) {
            Log::error('Embedding generation failed', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Gera embeddings para múltiplos textos (batch).
     */
    public function generateEmbeddings(array $texts): array
    {
        if (empty($this->apiKey)) {
            Log::warning('OpenAI API key not configured for embeddings');
            return [];
        }

        try {
            // Prepara textos
            $preparedTexts = array_map(fn($t) => $this->prepareText($t), $texts);
            $preparedTexts = array_filter($preparedTexts);
            
            if (empty($preparedTexts)) {
                return [];
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/embeddings', [
                'model' => $this->model,
                'input' => array_values($preparedTexts),
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $embeddings = [];
                
                foreach ($data['data'] as $item) {
                    $embeddings[$item['index']] = $item['embedding'];
                }
                
                return $embeddings;
            }

            Log::error('Batch embedding API error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [];

        } catch (\Exception $e) {
            Log::error('Batch embedding generation failed', [
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Calcula similaridade de cosseno entre dois vetores.
     */
    public function cosineSimilarity(array $vec1, array $vec2): float
    {
        if (count($vec1) !== count($vec2)) {
            return 0.0;
        }

        $dotProduct = 0.0;
        $norm1 = 0.0;
        $norm2 = 0.0;

        for ($i = 0; $i < count($vec1); $i++) {
            $dotProduct += $vec1[$i] * $vec2[$i];
            $norm1 += $vec1[$i] * $vec1[$i];
            $norm2 += $vec2[$i] * $vec2[$i];
        }

        $norm1 = sqrt($norm1);
        $norm2 = sqrt($norm2);

        if ($norm1 == 0 || $norm2 == 0) {
            return 0.0;
        }

        return $dotProduct / ($norm1 * $norm2);
    }

    /**
     * Busca os chunks mais similares a uma query.
     */
    public function findSimilarChunks(string $query, array $chunks, int $topK = 5, float $minSimilarity = 0.3): array
    {
        $queryEmbedding = $this->generateEmbedding($query);
        
        if (!$queryEmbedding) {
            return [];
        }

        $results = [];

        foreach ($chunks as $index => $chunk) {
            if (!isset($chunk['embedding']) || empty($chunk['embedding'])) {
                continue;
            }

            $similarity = $this->cosineSimilarity($queryEmbedding, $chunk['embedding']);
            
            if ($similarity >= $minSimilarity) {
                $results[] = [
                    'index' => $index,
                    'content' => $chunk['content'] ?? '',
                    'title' => $chunk['title'] ?? '',
                    'category' => $chunk['category'] ?? '',
                    'similarity' => $similarity,
                ];
            }
        }

        // Ordena por similaridade (maior primeiro)
        usort($results, fn($a, $b) => $b['similarity'] <=> $a['similarity']);

        // Retorna top K
        return array_slice($results, 0, $topK);
    }

    /**
     * Prepara texto para embedding.
     */
    protected function prepareText(string $text): string
    {
        // Remove caracteres especiais
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        
        // Normaliza espaços
        $text = preg_replace('/\s+/', ' ', $text);
        
        // Trunca para evitar exceder limite de tokens (~8000 tokens = ~32000 chars)
        $maxChars = 30000;
        if (strlen($text) > $maxChars) {
            $text = substr($text, 0, $maxChars);
        }
        
        return trim($text);
    }

    /**
     * Retorna o modelo de embedding usado.
     */
    public function getModel(): string
    {
        return $this->model;
    }

    /**
     * Conta tokens aproximados (estimativa).
     */
    public function estimateTokens(string $text): int
    {
        // Regra aproximada: 1 token ~= 4 caracteres em inglês, ~3 em português
        return (int) ceil(strlen($text) / 3.5);
    }
}

