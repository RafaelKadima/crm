<?php

namespace App\Http\Controllers;

use App\Models\AiUsageLog;
use App\Services\UsageTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternalAiUsageController extends Controller
{
    public function __construct(
        protected UsageTrackingService $usageService
    ) {}

    /**
     * Registra uso de IA (chamado pelo microserviço Python)
     */
    public function logUsage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'lead_id' => 'nullable|uuid',
            'ticket_id' => 'nullable|uuid',
            'agent_id' => 'nullable|uuid',
            'model' => 'nullable|string',
            'input_tokens' => 'required|integer|min:0',
            'output_tokens' => 'required|integer|min:0',
            'action_type' => 'nullable|string',
            'response_time_ms' => 'nullable|integer',
            'from_cache' => 'nullable|boolean',
            'metadata' => 'nullable|array',
        ]);

        // Verifica se o tenant pode usar IA
        $canUse = $this->usageService->canUseAi($validated['tenant_id']);
        
        if (!$canUse['allowed']) {
            return response()->json([
                'error' => 'AI usage limit exceeded',
                'message' => $canUse['message'],
            ], 429);
        }

        // Registra o uso
        $log = $this->usageService->trackAiUsage($validated);

        return response()->json([
            'success' => true,
            'log_id' => $log->id,
            'cost_usd' => $log->cost_usd,
            'cost_brl' => $log->cost_brl,
            'total_tokens' => $log->total_tokens,
            'usage_status' => $canUse,
        ]);
    }

    /**
     * Verifica se tenant pode usar IA
     */
    public function checkAiAccess(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
        ]);

        $canUse = $this->usageService->canUseAi($validated['tenant_id']);

        return response()->json($canUse);
    }

    /**
     * Verifica se tenant pode criar mais leads
     */
    public function checkLeadAccess(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
        ]);

        $canCreate = $this->usageService->canCreateLead($validated['tenant_id']);

        return response()->json($canCreate);
    }

    /**
     * Retorna resumo de uso do tenant
     */
    public function getUsageSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
        ]);

        $summary = $this->usageService->getTenantUsageSummary($validated['tenant_id']);

        return response()->json($summary);
    }

    /**
     * Registra criação de lead (incrementa contador)
     */
    public function registerLeadCreation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
        ]);

        $result = $this->usageService->registerLeadCreation($validated['tenant_id']);

        return response()->json($result);
    }
}

