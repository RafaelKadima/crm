<?php

namespace App\Services;

/**
 * Serviço responsável pela conversão de tokens em Unidades de IA.
 * 
 * 1 Unidade de IA = 1.000 tokens no GPT-4o-mini
 * GPT-4o usa peso 12x (1.000 tokens = 12 Unidades)
 * 
 * Isso permite cobrar de forma justa independente do modelo usado.
 */
class AiUnitsService
{
    /**
     * Peso por modelo (multiplicador de tokens -> unidades)
     * 1k tokens no modelo = X unidades
     */
    public const MODEL_WEIGHTS = [
        'gpt-4o-mini' => 1,           // 1k tokens = 1 Unidade (base)
        'gpt-4o' => 12,               // 1k tokens = 12 Unidades
        'gpt-4-turbo' => 20,          // 1k tokens = 20 Unidades
        'gpt-3.5-turbo' => 0.5,       // 1k tokens = 0.5 Unidades (mais barato)
        'text-embedding-3-small' => 0.1,
        'text-embedding-3-large' => 0.5,
    ];

    /**
     * Preço do excedente por 1.000 Unidades (BRL)
     */
    public const OVERAGE_PRICE_PER_1K = 29.00;

    /**
     * Pacotes de Unidades disponíveis para compra
     */
    public const PACKAGES = [
        'pack_10k' => [
            'units' => 10000,
            'price' => 229.00,
            'label' => 'Pack 10k Unidades',
            'description' => '10.000 Unidades de IA',
        ],
        'pack_30k' => [
            'units' => 30000,
            'price' => 599.00,
            'label' => 'Pack 30k Unidades',
            'description' => '30.000 Unidades de IA (economia de 31%)',
        ],
        'pack_80k' => [
            'units' => 80000,
            'price' => 1399.00,
            'label' => 'Pack 80k Unidades',
            'description' => '80.000 Unidades de IA (economia de 24%)',
        ],
    ];

    /**
     * Pacotes de RAG (documentos)
     */
    public const RAG_PACKAGES = [
        'rag_20' => [
            'documents' => 20,
            'price' => 179.00,
            'label' => '+20 documentos/mês',
        ],
    ];

    /**
     * Pacotes de Áudio
     */
    public const AUDIO_PACKAGES = [
        'audio_200' => [
            'minutes' => 200,
            'price' => 249.00,
            'label' => '+200 minutos/mês',
        ],
    ];

    /**
     * Pacotes de Imagem
     */
    public const IMAGE_PACKAGES = [
        'image_200' => [
            'analyses' => 200,
            'price' => 199.00,
            'label' => '+200 análises/mês',
        ],
    ];

    /**
     * Converte tokens para Unidades de IA baseado no modelo.
     * 
     * @param int $tokens Número total de tokens
     * @param string $model Nome do modelo usado
     * @return float Unidades de IA consumidas
     */
    public function tokensToUnits(int $tokens, string $model = 'gpt-4o-mini'): float
    {
        $weight = self::MODEL_WEIGHTS[$model] ?? self::MODEL_WEIGHTS['gpt-4o-mini'];
        
        // 1 Unidade = 1.000 tokens no modelo base
        // Então: unidades = (tokens / 1000) * peso_do_modelo
        $units = ($tokens / 1000) * $weight;
        
        return round($units, 2);
    }

    /**
     * Converte Unidades de IA para tokens equivalentes no modelo base (4o-mini).
     * 
     * @param float $units Unidades de IA
     * @return int Tokens equivalentes em 4o-mini
     */
    public function unitsToTokens(float $units): int
    {
        return (int) ($units * 1000);
    }

    /**
     * Retorna o peso de um modelo específico.
     */
    public function getModelWeight(string $model): float
    {
        return self::MODEL_WEIGHTS[$model] ?? 1;
    }

    /**
     * Verifica se o modelo é premium (peso > 1).
     */
    public function isPremiumModel(string $model): bool
    {
        return (self::MODEL_WEIGHTS[$model] ?? 1) > 1;
    }

    /**
     * Calcula o custo de excedente em BRL.
     * 
     * @param float $overageUnits Unidades excedentes
     * @return float Custo em BRL
     */
    public function calculateOverageCost(float $overageUnits): float
    {
        if ($overageUnits <= 0) {
            return 0;
        }

        // Cobra por cada 1.000 Unidades (arredonda para cima)
        $blocks = ceil($overageUnits / 1000);
        
        return $blocks * self::OVERAGE_PRICE_PER_1K;
    }

    /**
     * Retorna todos os pacotes disponíveis.
     */
    public function getAvailablePackages(): array
    {
        return [
            'ai_units' => self::PACKAGES,
            'rag' => self::RAG_PACKAGES,
            'audio' => self::AUDIO_PACKAGES,
            'image' => self::IMAGE_PACKAGES,
        ];
    }

    /**
     * Retorna informações de um pacote específico.
     */
    public function getPackage(string $type, string $packageId): ?array
    {
        return match ($type) {
            'ai_units' => self::PACKAGES[$packageId] ?? null,
            'rag' => self::RAG_PACKAGES[$packageId] ?? null,
            'audio' => self::AUDIO_PACKAGES[$packageId] ?? null,
            'image' => self::IMAGE_PACKAGES[$packageId] ?? null,
            default => null,
        };
    }

    /**
     * Calcula estimativa de uso baseado em leads e mensagens.
     * 
     * @param int $leadsPerMonth Leads esperados por mês
     * @param int $messagesPerLead Mensagens médias por lead
     * @param string $primaryModel Modelo principal usado
     * @param float $premiumPercentage % de mensagens em modelo premium
     * @return array Estimativa detalhada
     */
    public function estimateMonthlyUsage(
        int $leadsPerMonth,
        int $messagesPerLead = 10,
        string $primaryModel = 'gpt-4o-mini',
        float $premiumPercentage = 0.1
    ): array {
        // Média de tokens por mensagem (entrada + saída)
        $avgTokensPerMessage = 2500; // ~2k entrada + ~500 saída
        
        $totalMessages = $leadsPerMonth * $messagesPerLead;
        $totalTokens = $totalMessages * $avgTokensPerMessage;
        
        // Divide entre modelo base e premium
        $baseTokens = $totalTokens * (1 - $premiumPercentage);
        $premiumTokens = $totalTokens * $premiumPercentage;
        
        $baseUnits = $this->tokensToUnits((int) $baseTokens, 'gpt-4o-mini');
        $premiumUnits = $this->tokensToUnits((int) $premiumTokens, 'gpt-4o');
        
        $totalUnits = $baseUnits + $premiumUnits;
        
        return [
            'leads' => $leadsPerMonth,
            'messages' => $totalMessages,
            'total_tokens' => $totalTokens,
            'base_model' => [
                'tokens' => (int) $baseTokens,
                'units' => $baseUnits,
            ],
            'premium_model' => [
                'tokens' => (int) $premiumTokens,
                'units' => $premiumUnits,
            ],
            'total_units' => $totalUnits,
            'recommended_plan' => $this->recommendPlan($totalUnits),
        ];
    }

    /**
     * Recomenda um plano baseado no uso estimado de Unidades.
     */
    public function recommendPlan(float $estimatedUnits): string
    {
        if ($estimatedUnits <= 0) {
            return 'essencial';
        }
        
        if ($estimatedUnits <= 2500) {
            return 'performance';
        }
        
        if ($estimatedUnits <= 4500) {
            return 'growth';
        }
        
        // Acima de 4.500, recomenda Growth + pacotes
        $overage = $estimatedUnits - 4500;
        $packagesNeeded = ceil($overage / 10000);
        
        return "growth + {$packagesNeeded}x pack_10k";
    }
}

