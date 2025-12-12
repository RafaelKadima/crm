<?php

namespace App\Services;

use App\Models\AiUsageLog;
use App\Models\CostAlert;
use App\Models\Tenant;
use App\Models\TenantQuota;
use App\Models\TenantUsageStats;

class UsageTrackingService
{
    public function __construct(
        protected AiUnitsService $aiUnitsService
    ) {}

    /**
     * Verifica se tenant pode criar mais leads
     */
    public function canCreateLead(string $tenantId): array
    {
        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);

        if (!$quota) {
            return ['allowed' => true, 'message' => null];
        }

        $used = $stats->leads_created ?? 0;
        $limit = $quota->max_leads_month;
        $percentage = $limit > 0 ? ($used / $limit) * 100 : 0;

        // Gera alertas em 80% e 90%
        $this->checkAndCreateAlert($tenantId, CostAlert::RESOURCE_LEADS, $used, $limit, $percentage);

        if ($quota->enforce_limits && $used >= $limit) {
            return [
                'allowed' => false,
                'message' => "Limite de leads atingido ({$used}/{$limit}). Faça upgrade do plano.",
                'used' => $used,
                'limit' => $limit,
            ];
        }

        return [
            'allowed' => true,
            'used' => $used,
            'limit' => $limit,
            'percentage' => round($percentage, 1),
        ];
    }

    /**
     * Verifica se tenant pode usar IA (baseado em Unidades)
     */
    public function canUseAi(string $tenantId, string $model = 'gpt-4o-mini'): array
    {
        $tenant = Tenant::find($tenantId);
        
        if (!$tenant) {
            return [
                'allowed' => false,
                'message' => 'Tenant não encontrado.',
            ];
        }

        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);

        if (!$quota) {
            return ['allowed' => true, 'message' => null];
        }

        // Permissão de IA:
        // - Planos com IA (Performance/Growth/Enterprise) podem usar normalmente
        // - Plano sem IA (ex.: Essencial) só pode usar se houver bônus/pacote ativo (bonus_ai_units > 0)
        $hasPlanIa = $tenant->plan->hasIaSdr();
        $hasBonusUnits = ($quota->bonus_ai_units ?? 0) > 0;
        $hasAnyIncludedUnits = ($quota->max_ai_units_month ?? 0) > 0;
        $hasAnyUnitsAvailable = ($quota->getTotalAiUnitsAvailable() ?? 0) > 0;

        if (!$hasPlanIa && !$hasBonusUnits && !$hasAnyIncludedUnits && !$hasAnyUnitsAvailable) {
            return [
                'allowed' => false,
                'message' => 'Plano não inclui IA. Compre um pacote de Unidades ou faça upgrade.',
                'can_buy_package' => true,
                'upgrade_required' => 'performance',
            ];
        }

        // Verifica se pode usar modelo premium (GPT-4o)
        if ($this->aiUnitsService->isPremiumModel($model) && !$quota->canUseGpt4o()) {
            return [
                'allowed' => false,
                'message' => 'Modelo GPT-4o não disponível no seu plano. Faça upgrade para o plano Growth.',
                'upgrade_required' => 'growth',
            ];
        }

        // Verifica uso de Unidades de IA
        $usedUnits = $stats->ai_units_used ?? 0;
        $totalAvailable = $quota->getTotalAiUnitsAvailable();

        // Se tem franquia definida, verifica
        if ($totalAvailable > 0) {
            $percentage = ($usedUnits / $totalAvailable) * 100;
            
            // Gera alertas de uso de Unidades
            $this->checkAndCreateAlert(
                $tenantId, 
                CostAlert::RESOURCE_AI_UNITS ?? 'ai_units', 
                $usedUnits, 
                $totalAvailable, 
                $percentage
            );

            // Verifica se atingiu o limite
            if ($quota->enforce_limits && $usedUnits >= $totalAvailable) {
                return [
                    'allowed' => false,
                    'message' => "Limite de Unidades de IA atingido (" . number_format($usedUnits, 0, ',', '.') . "/" . number_format($totalAvailable, 0, ',', '.') . "). Compre um pacote adicional.",
                    'units_used' => round($usedUnits, 2),
                    'units_limit' => $totalAvailable,
                    'can_buy_package' => true,
                ];
            }

            return [
                'allowed' => true,
                'units_used' => round($usedUnits, 2),
                'units_limit' => $totalAvailable,
                'units_remaining' => round($totalAvailable - $usedUnits, 2),
                'percentage' => round($percentage, 1),
                'gpt4o_enabled' => $quota->canUseGpt4o(),
            ];
        }

        // Plano sem franquia de IA - pode usar via pacotes (bonus_ai_units)
        if ($quota->bonus_ai_units > 0) {
            $percentage = ($usedUnits / $quota->bonus_ai_units) * 100;
            
            if ($quota->enforce_limits && $usedUnits >= $quota->bonus_ai_units) {
                return [
                    'allowed' => false,
                    'message' => 'Pacote de Unidades esgotado. Compre um novo pacote.',
                    'can_buy_package' => true,
                ];
            }

            return [
                'allowed' => true,
                'units_used' => round($usedUnits, 2),
                'units_limit' => $quota->bonus_ai_units,
                'from_package' => true,
            ];
        }

        // Sem franquia e sem pacotes (fallback)
        return [
            'allowed' => false,
            'message' => 'Plano não inclui IA. Compre um pacote de Unidades ou faça upgrade.',
            'can_buy_package' => true,
            'upgrade_required' => 'performance',
        ];
    }

    /**
     * Registra uso de IA
     */
    public function trackAiUsage(array $data): AiUsageLog
    {
        return AiUsageLog::logUsage($data);
    }

    /**
     * Verifica se pode processar documento RAG
     */
    public function canProcessRagDocument(string $tenantId): array
    {
        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);

        if (!$quota || $quota->max_rag_documents_month <= 0) {
            return [
                'allowed' => false,
                'message' => 'Plano não inclui processamento de documentos RAG.',
            ];
        }

        $used = $stats->rag_documents_processed ?? 0;
        $limit = $quota->max_rag_documents_month;
        $percentage = ($used / $limit) * 100;

        if ($quota->enforce_limits && $used >= $limit) {
            return [
                'allowed' => false,
                'message' => "Limite de documentos RAG atingido ({$used}/{$limit}). Compre um pacote adicional.",
                'used' => $used,
                'limit' => $limit,
            ];
        }

        return [
            'allowed' => true,
            'used' => $used,
            'limit' => $limit,
            'percentage' => round($percentage, 1),
        ];
    }

    /**
     * Registra processamento de documento RAG
     */
    public function trackRagDocument(string $tenantId): array
    {
        $check = $this->canProcessRagDocument($tenantId);
        
        if ($check['allowed']) {
            TenantUsageStats::incrementRagDocuments($tenantId);
        }

        return $check;
    }

    /**
     * Verifica se pode usar transcrição de áudio
     */
    public function canUseAudio(string $tenantId, int $minutes = 1): array
    {
        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);

        if (!$quota || $quota->max_audio_minutes_month <= 0) {
            return [
                'allowed' => false,
                'message' => 'Plano não inclui transcrição de áudio.',
            ];
        }

        $used = $stats->audio_minutes_used ?? 0;
        $limit = $quota->max_audio_minutes_month;

        if ($quota->enforce_limits && ($used + $minutes) > $limit) {
            return [
                'allowed' => false,
                'message' => "Limite de áudio atingido ({$used}/{$limit} min). Compre um pacote adicional.",
                'used' => $used,
                'limit' => $limit,
            ];
        }

        return [
            'allowed' => true,
            'used' => $used,
            'limit' => $limit,
            'remaining' => $limit - $used,
        ];
    }

    /**
     * Registra uso de transcrição de áudio
     */
    public function trackAudioUsage(string $tenantId, int $minutes): array
    {
        $check = $this->canUseAudio($tenantId, $minutes);
        
        if ($check['allowed']) {
            TenantUsageStats::incrementAudioMinutes($tenantId, $minutes);
        }

        return $check;
    }

    /**
     * Verifica se pode analisar imagem
     */
    public function canAnalyzeImage(string $tenantId): array
    {
        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);

        if (!$quota || $quota->max_image_analyses_month <= 0) {
            return [
                'allowed' => false,
                'message' => 'Plano não inclui análise de imagens.',
            ];
        }

        $used = $stats->image_analyses_used ?? 0;
        $limit = $quota->max_image_analyses_month;

        if ($quota->enforce_limits && $used >= $limit) {
            return [
                'allowed' => false,
                'message' => "Limite de análises de imagem atingido ({$used}/{$limit}). Compre um pacote adicional.",
                'used' => $used,
                'limit' => $limit,
            ];
        }

        return [
            'allowed' => true,
            'used' => $used,
            'limit' => $limit,
        ];
    }

    /**
     * Registra análise de imagem
     */
    public function trackImageAnalysis(string $tenantId): array
    {
        $check = $this->canAnalyzeImage($tenantId);
        
        if ($check['allowed']) {
            TenantUsageStats::incrementImageAnalyses($tenantId);
        }

        return $check;
    }

    /**
     * Verifica e cria alertas se necessário
     */
    protected function checkAndCreateAlert(
        string $tenantId,
        string $resource,
        float $used,
        float $limit,
        float $percentage
    ): void {
        if ($limit <= 0) {
            return;
        }

        $thresholds = [80, 90, 100];
        
        foreach ($thresholds as $threshold) {
            if ($percentage >= $threshold) {
                $type = $threshold >= 100 
                    ? CostAlert::TYPE_QUOTA_EXCEEDED 
                    : CostAlert::TYPE_QUOTA_WARNING;
                
                CostAlert::createIfNotExists(
                    $tenantId,
                    $type,
                    $resource,
                    $threshold,
                    $used,
                    $limit
                );
            }
        }
    }

    /**
     * Retorna resumo de uso do tenant (com Unidades de IA)
     */
    public function getTenantUsageSummary(string $tenantId): array
    {
        $tenant = Tenant::find($tenantId);
        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);

        if (!$tenant) {
            return [];
        }

        $usersCount = $tenant->users()->count();
        $channelsCount = $tenant->channels()->count();

        // Calcula uso de Unidades vs quota
        $unitsUsed = $stats->ai_units_used ?? 0;
        $unitsLimit = $quota ? $quota->getTotalAiUnitsAvailable() : 0;
        $unitsPercentage = $unitsLimit > 0 ? round(($unitsUsed / $unitsLimit) * 100, 1) : 0;

        return [
            'tenant_id' => $tenantId,
            'tenant_name' => $tenant->name,
            'plan' => $tenant->plan->value,
            'plan_label' => $tenant->plan->label(),
            'period' => now()->format('Y-m'),
            
            'leads' => [
                'used' => $stats->leads_created ?? 0,
                'limit' => $quota->max_leads_month ?? 0,
                'percentage' => $quota && $quota->max_leads_month > 0 
                    ? round(($stats->leads_created ?? 0) / $quota->max_leads_month * 100, 1) 
                    : 0,
            ],
            
            // NOVO: Uso de Unidades de IA
            'ai_units' => [
                'used' => round($unitsUsed, 2),
                'limit' => $quota->max_ai_units_month ?? 0,
                'bonus' => $quota->bonus_ai_units ?? 0,
                'total_available' => $unitsLimit,
                'remaining' => max(0, round($unitsLimit - $unitsUsed, 2)),
                'percentage' => min($unitsPercentage, 100),
                'breakdown' => [
                    '4o_mini' => round($stats->ai_units_4o_mini ?? 0, 2),
                    '4o' => round($stats->ai_units_4o ?? 0, 2),
                ],
                'gpt4o_enabled' => $quota->gpt4o_enabled ?? false,
            ],
            
            // Mantém info de custo para relatórios (mas não para limites)
            'ai_cost' => [
                'cost_brl' => round($stats->ai_cost_brl ?? 0, 2),
                'cost_usd' => round($stats->ai_cost_usd ?? 0, 4),
                'messages_sent' => $stats->ai_messages_sent ?? 0,
                'tokens_used' => $stats->ai_total_tokens ?? 0,
            ],
            
            // RAG/Áudio/Imagem
            'rag' => [
                'used' => $stats->rag_documents_processed ?? 0,
                'limit' => $quota->max_rag_documents_month ?? 0,
            ],
            'audio' => [
                'used' => $stats->audio_minutes_used ?? 0,
                'limit' => $quota->max_audio_minutes_month ?? 0,
            ],
            'image' => [
                'used' => $stats->image_analyses_used ?? 0,
                'limit' => $quota->max_image_analyses_month ?? 0,
            ],
            
            'users' => [
                'used' => $usersCount,
                'limit' => $quota->max_users ?? 0,
            ],
            'channels' => [
                'used' => $channelsCount,
                'limit' => $quota->max_channels ?? 0,
            ],
            'tickets' => [
                'created' => $stats->tickets_created ?? 0,
                'closed' => $stats->tickets_closed ?? 0,
            ],
            'messages' => [
                'inbound' => $stats->messages_inbound ?? 0,
                'outbound' => $stats->messages_outbound ?? 0,
            ],
        ];
    }

    /**
     * Verifica todos os limites de um tenant
     */
    public function checkAllLimits(string $tenantId): array
    {
        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);
        $tenant = Tenant::find($tenantId);

        if (!$quota || !$tenant) {
            return ['all_ok' => true, 'warnings' => [], 'exceeded' => []];
        }

        $warnings = [];
        $exceeded = [];

        // Verifica leads
        if ($quota->max_leads_month > 0) {
            $percentage = ($stats->leads_created / $quota->max_leads_month) * 100;
            if ($percentage >= 100) {
                $exceeded[] = 'leads';
            } elseif ($percentage >= 80) {
                $warnings[] = 'leads';
            }
        }

        // Verifica Unidades de IA (NOVO - substitui custo BRL)
        $totalUnitsAvailable = $quota->getTotalAiUnitsAvailable();
        if ($totalUnitsAvailable > 0) {
            $percentage = ($stats->ai_units_used / $totalUnitsAvailable) * 100;
            if ($percentage >= 100) {
                $exceeded[] = 'ai_units';
            } elseif ($percentage >= 80) {
                $warnings[] = 'ai_units';
            }
        }

        // Verifica RAG
        if ($quota->max_rag_documents_month > 0) {
            $percentage = (($stats->rag_documents_processed ?? 0) / $quota->max_rag_documents_month) * 100;
            if ($percentage >= 100) {
                $exceeded[] = 'rag';
            } elseif ($percentage >= 80) {
                $warnings[] = 'rag';
            }
        }

        // Verifica Áudio
        if ($quota->max_audio_minutes_month > 0) {
            $percentage = (($stats->audio_minutes_used ?? 0) / $quota->max_audio_minutes_month) * 100;
            if ($percentage >= 100) {
                $exceeded[] = 'audio';
            } elseif ($percentage >= 80) {
                $warnings[] = 'audio';
            }
        }

        // Verifica Imagem
        if ($quota->max_image_analyses_month > 0) {
            $percentage = (($stats->image_analyses_used ?? 0) / $quota->max_image_analyses_month) * 100;
            if ($percentage >= 100) {
                $exceeded[] = 'image';
            } elseif ($percentage >= 80) {
                $warnings[] = 'image';
            }
        }

        // Verifica usuários
        $usersCount = $tenant->users()->count();
        if ($quota->max_users > 0 && $usersCount >= $quota->max_users) {
            $exceeded[] = 'users';
        }

        // Verifica canais
        $channelsCount = $tenant->channels()->count();
        if ($quota->max_channels > 0 && $channelsCount >= $quota->max_channels) {
            $exceeded[] = 'channels';
        }

        return [
            'all_ok' => empty($warnings) && empty($exceeded),
            'warnings' => $warnings,
            'exceeded' => $exceeded,
        ];
    }

    /**
     * Registra criação de lead e verifica limites
     */
    public function registerLeadCreation(string $tenantId): array
    {
        $check = $this->canCreateLead($tenantId);
        
        if ($check['allowed']) {
            TenantUsageStats::incrementLeads($tenantId);
        }

        return $check;
    }

    /**
     * Calcula custo de excedente de Unidades (para billing)
     */
    public function calculateOverageCost(string $tenantId): array
    {
        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);

        if (!$quota) {
            return ['overage_units' => 0, 'overage_cost' => 0];
        }

        $totalAvailable = $quota->getTotalAiUnitsAvailable();
        $used = $stats->ai_units_used ?? 0;
        
        $overageUnits = max(0, $used - $totalAvailable);
        $overageCost = $this->aiUnitsService->calculateOverageCost($overageUnits);

        return [
            'overage_units' => round($overageUnits, 2),
            'overage_cost' => $overageCost,
        ];
    }
}
