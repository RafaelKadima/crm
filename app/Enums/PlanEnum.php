<?php

namespace App\Enums;

enum PlanEnum: string
{
    // Planos antigos (mantidos para compatibilidade)
    case BASIC = 'basic';
    case IA_SDR = 'ia_sdr';
    case ENTERPRISE = 'enterprise';
    
    // NOVOS PLANOS (documento PLANOS_E_PRECIFICACAO_IA.md)
    case ESSENCIAL = 'essencial';       // R$ 800/mês
    case PERFORMANCE = 'performance';   // R$ 1.399/mês
    case GROWTH = 'growth';             // R$ 1.899/mês

    /**
     * Label amigável do plano
     */
    public function label(): string
    {
        return match ($this) {
            // Antigos
            self::BASIC => 'Básico',
            self::IA_SDR => 'IA SDR',
            self::ENTERPRISE => 'Enterprise',
            // Novos
            self::ESSENCIAL => 'Essencial',
            self::PERFORMANCE => 'Performance',
            self::GROWTH => 'Growth',
        };
    }

    /**
     * Descrição do plano
     */
    public function description(): string
    {
        return match ($this) {
            self::BASIC => 'CRM básico para pequenas equipes',
            self::IA_SDR => 'CRM com IA SDR para vendas',
            self::ENTERPRISE => 'Solução completa para grandes empresas',
            self::ESSENCIAL => 'CRM + atendimento organizado',
            self::PERFORMANCE => 'SDR com IA para vender mais',
            self::GROWTH => 'IA + Ads Intelligence (escala)',
        };
    }

    /**
     * Preço mensal (BRL)
     */
    public function price(): float
    {
        return match ($this) {
            self::BASIC => 147.00,
            self::IA_SDR => 497.00,
            self::ENTERPRISE => 1297.00,
            self::ESSENCIAL => 800.00,
            self::PERFORMANCE => 1399.00,
            self::GROWTH => 1899.00,
        };
    }

    /**
     * Verifica se o plano tem IA SDR
     */
    public function hasIaSdr(): bool
    {
        return in_array($this, [
            self::IA_SDR, 
            self::ENTERPRISE, 
            self::PERFORMANCE, 
            self::GROWTH
        ]);
    }

    /**
     * Verifica se o plano tem IA Vendedor (mais avançado)
     */
    public function hasIaVendedor(): bool
    {
        return in_array($this, [
            self::ENTERPRISE, 
            self::GROWTH
        ]);
    }

    /**
     * Verifica se o plano tem Ads Intelligence
     */
    public function hasAdsIntelligence(): bool
    {
        return in_array($this, [
            self::ENTERPRISE, 
            self::GROWTH
        ]);
    }

    /**
     * Verifica se o plano tem acesso a campanhas de ads
     */
    public function hasCampaigns(): bool
    {
        return in_array($this, [
            self::ENTERPRISE, 
            self::GROWTH
        ]);
    }

    /**
     * Verifica se pode usar GPT-4o (modelo premium)
     */
    public function hasGpt4o(): bool
    {
        return in_array($this, [
            self::ENTERPRISE, 
            self::GROWTH
        ]);
    }

    /**
     * Retorna franquia de Unidades de IA do plano
     */
    public function aiUnitsQuota(): int
    {
        return match ($this) {
            self::BASIC => 0,
            self::IA_SDR => 2500,
            self::ENTERPRISE => 10000,
            self::ESSENCIAL => 0,       // Sem IA inclusa (add-on)
            self::PERFORMANCE => 2500,  // 2.500 Unidades/mês
            self::GROWTH => 4500,       // 4.500 Unidades/mês
        };
    }

    /**
     * Retorna limite de usuários do plano
     */
    public function maxUsers(): int
    {
        return match ($this) {
            self::BASIC => 3,
            self::IA_SDR => 10,
            self::ENTERPRISE => 999,
            self::ESSENCIAL => 3,
            self::PERFORMANCE => 6,
            self::GROWTH => 10,
        };
    }

    /**
     * Retorna limite de documentos RAG/mês
     */
    public function ragDocumentsQuota(): int
    {
        return match ($this) {
            self::BASIC, self::ESSENCIAL => 0,
            self::IA_SDR, self::PERFORMANCE => 10,
            self::GROWTH => 30,
            self::ENTERPRISE => 100,
        };
    }

    /**
     * Retorna limite de minutos de áudio/mês
     */
    public function audioMinutesQuota(): int
    {
        return match ($this) {
            self::BASIC, self::ESSENCIAL => 0,
            self::IA_SDR, self::PERFORMANCE => 120,
            self::GROWTH => 300,
            self::ENTERPRISE => 500,
        };
    }

    /**
     * Retorna limite de análises de imagem/mês
     */
    public function imageAnalysesQuota(): int
    {
        return match ($this) {
            self::BASIC, self::ESSENCIAL => 0,
            self::IA_SDR, self::PERFORMANCE => 50,
            self::GROWTH => 150,
            self::ENTERPRISE => 300,
        };
    }

    /**
     * Verifica se é um plano novo (pós PLANOS_E_PRECIFICACAO_IA.md)
     */
    public function isNewPlan(): bool
    {
        return in_array($this, [
            self::ESSENCIAL, 
            self::PERFORMANCE, 
            self::GROWTH
        ]);
    }

    /**
     * Retorna todos os planos disponíveis para venda (novos)
     */
    public static function availableForSale(): array
    {
        return [
            self::ESSENCIAL,
            self::PERFORMANCE,
            self::GROWTH,
        ];
    }

    /**
     * Retorna detalhes completos do plano para exibição
     */
    public function details(): array
    {
        return [
            'value' => $this->value,
            'label' => $this->label(),
            'description' => $this->description(),
            'price' => $this->price(),
            'max_users' => $this->maxUsers(),
            'ai_units_quota' => $this->aiUnitsQuota(),
            'has_ia_sdr' => $this->hasIaSdr(),
            'has_gpt4o' => $this->hasGpt4o(),
            'has_ads_intelligence' => $this->hasAdsIntelligence(),
            'rag_documents' => $this->ragDocumentsQuota(),
            'audio_minutes' => $this->audioMinutesQuota(),
            'image_analyses' => $this->imageAnalysesQuota(),
            'is_new_plan' => $this->isNewPlan(),
        ];
    }
}
