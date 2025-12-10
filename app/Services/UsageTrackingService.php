<?php

namespace App\Services;

use App\Models\AiUsageLog;
use App\Models\CostAlert;
use App\Models\Tenant;
use App\Models\TenantQuota;
use App\Models\TenantUsageStats;

class UsageTrackingService
{
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
     * Verifica se tenant pode usar IA
     */
    public function canUseAi(string $tenantId): array
    {
        $tenant = Tenant::find($tenantId);
        
        if (!$tenant) {
            return [
                'allowed' => false,
                'message' => 'Tenant não encontrado.',
            ];
        }

        // Verifica se plano permite IA
        if (!$tenant->plan->hasIaSdr()) {
            return [
                'allowed' => false,
                'message' => 'Plano não inclui IA SDR. Faça upgrade para o plano IA SDR ou Enterprise.',
            ];
        }

        $quota = TenantQuota::getForTenant($tenantId);
        $stats = TenantUsageStats::getCurrentMonth($tenantId);

        if (!$quota) {
            return ['allowed' => true, 'message' => null];
        }

        $usedMessages = $stats->ai_messages_sent ?? 0;
        $usedCost = $stats->ai_cost_brl ?? 0;
        $limitMessages = $quota->max_ai_messages_month ?? 0;
        $limitCost = $quota->max_ai_cost_month ?? 0;

        // Verifica alertas de custo
        if ($limitCost > 0) {
            $costPercentage = ($usedCost / $limitCost) * 100;
            $this->checkAndCreateAlert($tenantId, CostAlert::RESOURCE_AI_COST, $usedCost, $limitCost, $costPercentage);
        }

        // Checa limite de mensagens
        if ($quota->enforce_limits && $limitMessages > 0 && $usedMessages >= $limitMessages) {
            return [
                'allowed' => false,
                'message' => "Limite de mensagens IA atingido ({$usedMessages}/{$limitMessages}).",
                'messages_used' => $usedMessages,
                'messages_limit' => $limitMessages,
            ];
        }

        // Checa limite de custo
        if ($quota->enforce_limits && $limitCost > 0 && $usedCost >= $limitCost) {
            return [
                'allowed' => false,
                'message' => "Limite de custo IA atingido (R$ " . number_format($usedCost, 2, ',', '.') . "/R$ " . number_format($limitCost, 2, ',', '.') . ").",
                'cost_used' => $usedCost,
                'cost_limit' => $limitCost,
            ];
        }

        return [
            'allowed' => true,
            'messages_used' => $usedMessages,
            'messages_limit' => $limitMessages,
            'cost_used' => $usedCost,
            'cost_limit' => $limitCost,
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
     * Retorna resumo de uso do tenant
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

        return [
            'tenant_id' => $tenantId,
            'tenant_name' => $tenant->name,
            'plan' => $tenant->plan->value,
            'period' => now()->format('Y-m'),
            'leads' => [
                'used' => $stats->leads_created ?? 0,
                'limit' => $quota->max_leads_month ?? 0,
                'percentage' => $quota && $quota->max_leads_month > 0 
                    ? round(($stats->leads_created ?? 0) / $quota->max_leads_month * 100, 1) 
                    : 0,
            ],
            'ai' => [
                'messages_used' => $stats->ai_messages_sent ?? 0,
                'messages_limit' => $quota->max_ai_messages_month ?? 0,
                'tokens_used' => $stats->ai_total_tokens ?? 0,
                'cost_brl' => round($stats->ai_cost_brl ?? 0, 2),
                'cost_limit' => $quota->max_ai_cost_month ?? 0,
                'cost_percentage' => $quota && $quota->max_ai_cost_month > 0
                    ? round(($stats->ai_cost_brl ?? 0) / $quota->max_ai_cost_month * 100, 1)
                    : 0,
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

        // Verifica custo IA
        if ($quota->max_ai_cost_month > 0) {
            $percentage = ($stats->ai_cost_brl / $quota->max_ai_cost_month) * 100;
            if ($percentage >= 100) {
                $exceeded[] = 'ai_cost';
            } elseif ($percentage >= 80) {
                $warnings[] = 'ai_cost';
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
}

