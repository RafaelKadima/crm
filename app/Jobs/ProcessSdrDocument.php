<?php

namespace App\Jobs;

use App\Models\SdrDocument;
use App\Services\SemanticSearchService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;

class ProcessSdrDocument implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 120;

    public function __construct(
        public SdrDocument $document
    ) {}

    public function handle(): void
    {
        $this->document->markAsProcessing();

        try {
            $content = $this->extractContent();
            
            if (empty($content)) {
                throw new \Exception('Não foi possível extrair conteúdo do documento.');
            }

            // Divide em chunks para RAG
            $chunks = $this->createChunks($content);

            $this->document->markAsCompleted($content, $chunks);

            Log::info('SDR Document processed successfully', [
                'document_id' => $this->document->id,
                'chunks_count' => count($chunks),
            ]);

            // Gera embeddings para os chunks (em segundo plano)
            $this->generateEmbeddings();

        } catch (\Exception $e) {
            Log::error('SDR Document processing failed', [
                'document_id' => $this->document->id,
                'error' => $e->getMessage(),
            ]);

            $this->document->markAsFailed($e->getMessage());
        }
    }

    /**
     * Gera embeddings para os chunks do documento.
     */
    protected function generateEmbeddings(): void
    {
        try {
            $semanticService = app(SemanticSearchService::class);
            $success = $semanticService->embedDocumentChunks($this->document);

            if ($success) {
                Log::info('Document embeddings generated', [
                    'document_id' => $this->document->id,
                ]);
            } else {
                Log::warning('Document embeddings generation skipped (no API key?)', [
                    'document_id' => $this->document->id,
                ]);
            }
        } catch (\Exception $e) {
            // Não falha o job por erro de embedding
            Log::warning('Document embedding failed (non-critical)', [
                'document_id' => $this->document->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Extrai conteúdo do documento baseado no tipo.
     */
    protected function extractContent(): string
    {
        $filePath = Storage::path($this->document->file_path);
        
        if (!file_exists($filePath)) {
            throw new \Exception('Arquivo não encontrado.');
        }

        return match ($this->document->file_type) {
            'pdf' => $this->extractFromPdf($filePath),
            'txt', 'md' => $this->extractFromText($filePath),
            'doc', 'docx' => $this->extractFromWord($filePath),
            default => throw new \Exception("Tipo de arquivo não suportado: {$this->document->file_type}"),
        };
    }

    /**
     * Extrai texto de PDF.
     */
    protected function extractFromPdf(string $filePath): string
    {
        try {
            $parser = new PdfParser();
            $pdf = $parser->parseFile($filePath);
            return $pdf->getText();
        } catch (\Exception $e) {
            // Fallback: tenta extrair com método alternativo
            Log::warning('PDF parsing failed, trying alternative method', [
                'document_id' => $this->document->id,
                'error' => $e->getMessage(),
            ]);
            
            // Pode implementar OCR ou outro método aqui
            throw new \Exception('Não foi possível extrair texto do PDF: ' . $e->getMessage());
        }
    }

    /**
     * Extrai texto de arquivo TXT/MD.
     */
    protected function extractFromText(string $filePath): string
    {
        return file_get_contents($filePath);
    }

    /**
     * Extrai texto de arquivo Word.
     */
    protected function extractFromWord(string $filePath): string
    {
        // Para DOCX, podemos usar PhpWord ou extrair o XML diretamente
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        
        if ($extension === 'docx') {
            return $this->extractFromDocx($filePath);
        }
        
        // Para .doc antigo, seria necessário outra biblioteca
        throw new \Exception('Formato .doc não suportado. Use .docx');
    }

    /**
     * Extrai texto de DOCX.
     */
    protected function extractFromDocx(string $filePath): string
    {
        $content = '';
        
        $zip = new \ZipArchive();
        if ($zip->open($filePath) === true) {
            $xml = $zip->getFromName('word/document.xml');
            $zip->close();
            
            if ($xml) {
                // Remove tags XML e mantém texto
                $content = strip_tags(str_replace(['</w:p>', '</w:r>'], ["\n", ' '], $xml));
                $content = preg_replace('/\s+/', ' ', $content);
                $content = trim($content);
            }
        }
        
        return $content;
    }

    /**
     * Divide o conteúdo em chunks para RAG.
     */
    protected function createChunks(string $content, int $chunkSize = 1000, int $overlap = 200): array
    {
        $chunks = [];
        $content = $this->normalizeText($content);
        
        // Divide por parágrafos primeiro
        $paragraphs = preg_split('/\n\s*\n/', $content);
        
        $currentChunk = '';
        $chunkIndex = 0;
        
        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);
            if (empty($paragraph)) continue;
            
            // Se adicionar este parágrafo exceder o tamanho, salva o chunk atual
            if (strlen($currentChunk) + strlen($paragraph) > $chunkSize && !empty($currentChunk)) {
                $chunks[] = [
                    'index' => $chunkIndex++,
                    'content' => trim($currentChunk),
                    'char_count' => strlen($currentChunk),
                ];
                
                // Overlap: mantém parte do chunk anterior
                $words = explode(' ', $currentChunk);
                $overlapWords = array_slice($words, -intval($overlap / 5)); // ~5 chars por palavra
                $currentChunk = implode(' ', $overlapWords) . "\n\n";
            }
            
            $currentChunk .= $paragraph . "\n\n";
        }
        
        // Adiciona o último chunk
        if (!empty(trim($currentChunk))) {
            $chunks[] = [
                'index' => $chunkIndex,
                'content' => trim($currentChunk),
                'char_count' => strlen($currentChunk),
            ];
        }
        
        return $chunks;
    }

    /**
     * Normaliza o texto.
     */
    protected function normalizeText(string $text): string
    {
        // Remove caracteres especiais problemáticos
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        
        // Normaliza quebras de linha
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        
        // Remove espaços múltiplos
        $text = preg_replace('/[ \t]+/', ' ', $text);
        
        // Remove linhas vazias múltiplas
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        
        return trim($text);
    }

    /**
     * Handle job failure.
     */
    public function failed(\Throwable $exception): void
    {
        $this->document->markAsFailed($exception->getMessage());
    }
}

