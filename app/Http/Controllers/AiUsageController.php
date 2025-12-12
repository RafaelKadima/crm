<?php

namespace App\Http\Controllers;

use App\Models\AiPackagePurchase;
use App\Models\AiUsageLog;
use App\Models\TenantQuota;
use App\Services\AiUnitsService;
use App\Services\UsageTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiUsageController extends Controller
{
    public function __construct(
        protected UsageTrackingService $usageService,
        protected AiUnitsService $aiUnitsService
    ) {}

    /**
     * Retorna resumo de uso do tenant atual
     */
    public function summary(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        $summary = $this->usageService->getTenantUsageSummary($tenantId);

        return response()->json($summary);
    }

    /**
     * Retorna histórico de uso por dia
     */
    public function dailyUsage(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $days = $request->integer('days', 30);

        $usage = AiUsageLog::getDailyUsage($tenantId, $days);

        return response()->json([
            'tenant_id' => $tenantId,
            'days' => $days,
            'usage' => $usage,
        ]);
    }

    /**
     * Retorna uso por modelo
     */
    public function usageByModel(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        
        $usage = AiUsageLog::getUsageByModel(
            $tenantId,
            $request->input('start_date'),
            $request->input('end_date')
        );

        return response()->json([
            'tenant_id' => $tenantId,
            'usage_by_model' => $usage,
        ]);
    }

    /**
     * Retorna todos os pacotes disponíveis para compra
     */
    public function availablePackages(): JsonResponse
    {
        $packages = $this->aiUnitsService->getAvailablePackages();

        return response()->json([
            'packages' => $packages,
            'overage_price_per_1k' => AiUnitsService::OVERAGE_PRICE_PER_1K,
        ]);
    }

    /**
     * Inicia compra de um pacote
     */
    public function purchasePackage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'package_type' => 'required|string|in:ai_units,rag,audio,image',
            'package_id' => 'required|string',
        ]);

        $tenantId = $request->user()->tenant_id;
        $userId = $request->user()->id;

        // Verifica se o pacote existe
        $packageInfo = $this->aiUnitsService->getPackage(
            $validated['package_type'],
            $validated['package_id']
        );

        if (!$packageInfo) {
            return response()->json([
                'error' => 'Pacote não encontrado',
            ], 404);
        }

        // Cria a compra (pendente de pagamento)
        $purchase = AiPackagePurchase::purchase(
            $tenantId,
            $validated['package_type'],
            $validated['package_id'],
            $userId
        );

        if (!$purchase) {
            return response()->json([
                'error' => 'Erro ao criar compra',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'purchase' => [
                'id' => $purchase->id,
                'package_type' => $purchase->package_type,
                'package_id' => $purchase->package_id,
                'quantity' => $purchase->quantity,
                'price_brl' => $purchase->price_brl,
                'status' => $purchase->status,
                'expires_at' => $purchase->expires_at,
            ],
            'package_info' => $packageInfo,
            'message' => 'Compra criada. Aguardando pagamento.',
        ]);
    }

    /**
     * Confirma pagamento de um pacote (webhook ou manual)
     */
    public function confirmPayment(Request $request, string $purchaseId): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $purchase = AiPackagePurchase::where('id', $purchaseId)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$purchase) {
            return response()->json(['error' => 'Compra não encontrada'], 404);
        }

        if ($purchase->status !== AiPackagePurchase::STATUS_PENDING) {
            return response()->json([
                'error' => 'Compra não está pendente',
                'current_status' => $purchase->status,
            ], 400);
        }

        $paymentRef = $request->input('payment_reference');
        $success = $purchase->confirmPayment($paymentRef);

        if (!$success) {
            return response()->json(['error' => 'Erro ao confirmar pagamento'], 500);
        }

        return response()->json([
            'success' => true,
            'purchase' => $purchase->fresh(),
            'message' => 'Pagamento confirmado! Pacote ativado.',
        ]);
    }

    /**
     * Lista compras do tenant
     */
    public function purchases(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $status = $request->input('status');

        $query = AiPackagePurchase::where('tenant_id', $tenantId)
            ->orderByDesc('created_at');

        if ($status) {
            $query->where('status', $status);
        }

        $purchases = $query->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'package_type' => $p->package_type,
                'package_id' => $p->package_id,
                'quantity' => $p->quantity,
                'consumed' => $p->consumed,
                'remaining' => $p->remaining,
                'price_brl' => $p->price_brl,
                'status' => $p->status,
                'is_active' => $p->isActive(),
                'expires_at' => $p->expires_at,
                'created_at' => $p->created_at,
            ];
        });

        return response()->json([
            'purchases' => $purchases,
        ]);
    }

    /**
     * Retorna estimativa de uso baseado em parâmetros
     */
    public function estimate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'leads_per_month' => 'required|integer|min:1',
            'messages_per_lead' => 'integer|min:1|max:100',
            'premium_percentage' => 'numeric|min:0|max:1',
        ]);

        $estimate = $this->aiUnitsService->estimateMonthlyUsage(
            $validated['leads_per_month'],
            $validated['messages_per_lead'] ?? 10,
            'gpt-4o-mini',
            $validated['premium_percentage'] ?? 0.1
        );

        return response()->json($estimate);
    }

    /**
     * Verifica limites atuais do tenant
     */
    public function checkLimits(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $limits = $this->usageService->checkAllLimits($tenantId);
        $aiAccess = $this->usageService->canUseAi($tenantId);

        return response()->json([
            'limits' => $limits,
            'ai_access' => $aiAccess,
        ]);
    }

    /**
     * Retorna detalhes dos planos disponíveis
     */
    public function plans(): JsonResponse
    {
        $plans = [];
        
        foreach (\App\Enums\PlanEnum::availableForSale() as $plan) {
            $plans[] = $plan->details();
        }

        return response()->json([
            'plans' => $plans,
            'current_plan' => auth()->user()->tenant->plan->details(),
        ]);
    }

    /**
     * Calcula custo de excedente atual
     */
    public function overageCost(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;

        $overage = $this->usageService->calculateOverageCost($tenantId);

        return response()->json($overage);
    }
}

