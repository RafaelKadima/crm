<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class VisionService
{
    protected AiService $aiService;

    public function __construct(AiService $aiService)
    {
        $this->aiService = $aiService;
    }

    /**
     * Analisa uma imagem e retorna descrição.
     */
    public function analyzeImage(
        string $imageUrl,
        ?string $question = null,
        ?string $context = null
    ): ?array {
        $prompt = $question ?? 'Descreva detalhadamente o que você vê nesta imagem.';
        
        if ($context) {
            $prompt = "Contexto: {$context}\n\n{$prompt}";
        }

        return $this->aiService->chatWithVision(
            $prompt,
            [$imageUrl],
            'Você é um assistente que analisa imagens com precisão. Responda em português.'
        );
    }

    /**
     * Analisa múltiplas imagens.
     */
    public function analyzeMultipleImages(
        array $imageUrls,
        ?string $question = null
    ): ?array {
        $prompt = $question ?? 'Descreva o que você vê nestas imagens.';

        return $this->aiService->chatWithVision(
            $prompt,
            $imageUrls,
            'Você é um assistente que analisa imagens com precisão. Responda em português.'
        );
    }

    /**
     * Extrai texto de uma imagem (OCR).
     */
    public function extractText(string $imageUrl): ?string
    {
        $result = $this->aiService->chatWithVision(
            'Extraia todo o texto visível nesta imagem. Retorne apenas o texto, sem explicações.',
            [$imageUrl],
            'Você é um OCR preciso. Extraia apenas o texto, mantendo a formatação original quando possível.'
        );

        return $result['content'] ?? null;
    }

    /**
     * Identifica produtos em uma imagem.
     */
    public function identifyProducts(string $imageUrl): ?array
    {
        $result = $this->aiService->chatWithVision(
            'Identifique todos os produtos visíveis nesta imagem. Liste cada produto com nome e descrição breve. Formato JSON.',
            [$imageUrl],
            'Você é um especialista em identificação de produtos. Responda em JSON com array de objetos {name, description}.'
        );

        if (!$result) {
            return null;
        }

        // Tenta parsear JSON
        try {
            $content = $result['content'];
            // Remove markdown code blocks se existir
            $content = preg_replace('/```json\s*|\s*```/', '', $content);
            return json_decode($content, true);
        } catch (\Exception $e) {
            return ['raw' => $result['content']];
        }
    }

    /**
     * Analisa imagem no contexto de atendimento SDR.
     */
    public function analyzeForSdr(
        string $imageUrl,
        string $conversationContext,
        ?string $agentInstructions = null
    ): ?array {
        $systemPrompt = "Você é um SDR (Sales Development Representative) analisando uma imagem enviada por um lead.
        
Contexto da conversa: {$conversationContext}

" . ($agentInstructions ?? '') . "

Analise a imagem e forneça uma resposta útil e relevante para o contexto de vendas.
Se for um produto, identifique e sugira como pode ajudar.
Se for um documento, extraia as informações relevantes.
Se for uma screenshot de erro, ajude a resolver.
Seja sempre prestativo e profissional.";

        $result = $this->aiService->chatWithVision(
            'Analise esta imagem no contexto da nossa conversa e me ajude.',
            [$imageUrl],
            $systemPrompt
        );

        return $result;
    }

    /**
     * Converte imagem local para base64 URL.
     */
    public function imageToBase64Url(string $filePath): ?string
    {
        try {
            if (Storage::exists($filePath)) {
                $content = Storage::get($filePath);
                $mimeType = Storage::mimeType($filePath);
            } elseif (file_exists($filePath)) {
                $content = file_get_contents($filePath);
                $mimeType = mime_content_type($filePath);
            } else {
                return null;
            }

            $base64 = base64_encode($content);
            return "data:{$mimeType};base64,{$base64}";

        } catch (\Exception $e) {
            Log::error('Failed to convert image to base64', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Verifica se URL é uma imagem válida.
     */
    public function isValidImageUrl(string $url): bool
    {
        // Verifica extensão
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        $extension = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
        
        if (in_array($extension, $imageExtensions)) {
            return true;
        }

        // Verifica content-type via HEAD request
        try {
            $response = Http::timeout(5)->head($url);
            $contentType = $response->header('Content-Type');
            return str_starts_with($contentType, 'image/');
        } catch (\Exception $e) {
            return false;
        }
    }
}

