<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiService
{
    protected string $apiKey;
    protected string $baseUrl;
    protected string $defaultModel;

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key', '');
        $this->baseUrl = config('services.openai.base_url', 'https://api.openai.com/v1');
        $this->defaultModel = config('services.openai.default_model', 'gpt-4o-mini');
    }

    /**
     * Gera uma resposta de chat.
     */
    public function chat(
        array $messages,
        ?string $systemPrompt = null,
        ?string $model = null,
        float $temperature = 0.7,
        int $maxTokens = 1000
    ): ?array {
        if (empty($this->apiKey)) {
            Log::error('OpenAI API key not configured');
            return null;
        }

        try {
            $payload = [
                'model' => $model ?? $this->defaultModel,
                'temperature' => $temperature,
                'max_tokens' => $maxTokens,
                'messages' => [],
            ];

            // Adiciona system prompt se fornecido
            if ($systemPrompt) {
                $payload['messages'][] = [
                    'role' => 'system',
                    'content' => $systemPrompt,
                ];
            }

            // Adiciona mensagens
            foreach ($messages as $msg) {
                $payload['messages'][] = $msg;
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(60)->post($this->baseUrl . '/chat/completions', $payload);

            if ($response->successful()) {
                $data = $response->json();
                
                return [
                    'content' => $data['choices'][0]['message']['content'] ?? '',
                    'model' => $data['model'] ?? $model,
                    'tokens' => [
                        'input' => $data['usage']['prompt_tokens'] ?? 0,
                        'output' => $data['usage']['completion_tokens'] ?? 0,
                        'total' => $data['usage']['total_tokens'] ?? 0,
                    ],
                    'finish_reason' => $data['choices'][0]['finish_reason'] ?? 'unknown',
                ];
            }

            Log::error('OpenAI chat error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;

        } catch (\Exception $e) {
            Log::error('OpenAI chat exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Gera resposta com contexto RAG.
     */
    public function chatWithContext(
        string $userMessage,
        string $systemPrompt,
        array $context,
        ?string $model = null,
        float $temperature = 0.7
    ): ?array {
        // Monta o contexto como parte do sistema
        $contextText = $this->formatContext($context);
        
        $fullSystemPrompt = $systemPrompt;
        
        if (!empty($contextText)) {
            $fullSystemPrompt .= "\n\n## Base de Conhecimento\n\n" . $contextText;
        }

        $messages = [
            ['role' => 'user', 'content' => $userMessage],
        ];

        return $this->chat($messages, $fullSystemPrompt, $model, $temperature);
    }

    /**
     * Chat com suporte a imagens (Vision).
     */
    public function chatWithVision(
        string $userMessage,
        array $imageUrls,
        ?string $systemPrompt = null,
        ?string $model = null,
        float $temperature = 0.7
    ): ?array {
        if (empty($this->apiKey)) {
            Log::error('OpenAI API key not configured');
            return null;
        }

        try {
            // Monta conteúdo com imagens
            $content = [
                ['type' => 'text', 'text' => $userMessage],
            ];

            foreach ($imageUrls as $url) {
                $content[] = [
                    'type' => 'image_url',
                    'image_url' => [
                        'url' => $url,
                        'detail' => 'auto', // low, high, auto
                    ],
                ];
            }

            $messages = [
                ['role' => 'user', 'content' => $content],
            ];

            // Para vision, usar modelo com suporte
            $visionModel = $model ?? 'gpt-4o';

            return $this->chat($messages, $systemPrompt, $visionModel, $temperature);

        } catch (\Exception $e) {
            Log::error('OpenAI vision exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Formata o contexto RAG para inclusão no prompt.
     */
    protected function formatContext(array $context): string
    {
        $parts = [];

        // FAQs
        if (!empty($context['faqs'])) {
            $parts[] = "### Perguntas Frequentes\n";
            foreach ($context['faqs'] as $faq) {
                $parts[] = "**P:** {$faq['question']}\n**R:** {$faq['answer']}\n";
            }
        }

        // Knowledge entries
        if (!empty($context['knowledge'])) {
            $parts[] = "\n### Informações Relevantes\n";
            foreach ($context['knowledge'] as $entry) {
                $title = $entry['title'] ?? 'Info';
                $parts[] = "**{$title}:**\n{$entry['content']}\n";
            }
        }

        // Documents
        if (!empty($context['documents'])) {
            $parts[] = "\n### Documentos\n";
            foreach ($context['documents'] as $doc) {
                $name = $doc['document_name'] ?? 'Documento';
                $parts[] = "**{$name}:**\n{$doc['content']}\n";
            }
        }

        return implode("\n", $parts);
    }

    /**
     * Estima custo de uma chamada.
     */
    public function estimateCost(int $inputTokens, int $outputTokens, string $model = 'gpt-4o-mini'): float
    {
        // Preços por 1M tokens (atualizar conforme necessário)
        $prices = [
            'gpt-4o-mini' => ['input' => 0.15, 'output' => 0.60],
            'gpt-4o' => ['input' => 2.50, 'output' => 10.00],
            'gpt-4-turbo' => ['input' => 10.00, 'output' => 30.00],
        ];

        $modelPrices = $prices[$model] ?? $prices['gpt-4o-mini'];

        $inputCost = ($inputTokens / 1_000_000) * $modelPrices['input'];
        $outputCost = ($outputTokens / 1_000_000) * $modelPrices['output'];

        return round($inputCost + $outputCost, 6);
    }

    /**
     * Verifica se a API está configurada.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }
}

