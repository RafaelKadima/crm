<?php

namespace App\Http\Controllers;

use App\Models\AiUsageLog;
use App\Models\BillingRecord;
use App\Models\CostAlert;
use App\Models\Tenant;
use App\Models\TenantQuota;
use App\Models\TenantUsageStats;
use App\Services\UsageTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SuperAdminCostController extends Controller
{
    public function __construct(
        protected UsageTrackingService $usageService
    ) {}

    /**
     * Dashboard de custos (visão geral)
     */
    public function dashboard(): JsonResponse
    {
        $currentMonth = now()->format('Y-m');
        
        // Custos totais do mês atual
        $totalCosts = TenantUsageStats::where('year', now()->year)
            ->where('month', now()->month)
            ->selectRaw('
                SUM(ai_cost_brl) as total_ai_cost,
                SUM(ai_messages_sent) as total_ai_messages,
                SUM(ai_total_tokens) as total_tokens,
                SUM(leads_created) as total_leads,
                SUM(tickets_created) as total_tickets,
                SUM(messages_inbound + messages_outbound) as total_messages
            ')
            ->first();

        // Top 10 tenants por custo
        $topTenantsByCost = TenantUsageStats::with('tenant:id,name,plan')
            ->where('year', now()->year)
            ->where('month', now()->month)
            ->orderByDesc('ai_cost_brl')
            ->take(10)
            ->get(['tenant_id', 'ai_cost_brl', 'ai_messages_sent', 'leads_created']);

        // Alertas ativos
        $activeAlerts = CostAlert::with('tenant:id,name')
            ->active()
            ->orderByDesc('created_at')
            ->take(20)
            ->get();

        // Custos por plano
        $costsByPlan = DB::table('tenant_usage_stats')
            ->join('tenants', 'tenant_usage_stats.tenant_id', '=', 'tenants.id')
            ->where('tenant_usage_stats.year', now()->year)
            ->where('tenant_usage_stats.month', now()->month)
            ->selectRaw('tenants.plan, SUM(ai_cost_brl) as total_cost, COUNT(DISTINCT tenants.id) as tenant_count')
            ->groupBy('tenants.plan')
            ->get();

        // Evolução dos últimos 6 meses
        $monthlyTrend = TenantUsageStats::selectRaw('
                year, month,
                SUM(ai_cost_brl) as total_cost,
                SUM(leads_created) as total_leads,
                SUM(ai_messages_sent) as total_messages
            ')
            ->where(function ($query) {
                $query->where('year', '>', now()->subMonths(6)->year)
                    ->orWhere(function ($q) {
                        $q->where('year', now()->subMonths(6)->year)
                            ->where('month', '>=', now()->subMonths(6)->month);
                    });
            })
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get();

        // Estimativa de custo mensal
        $dayOfMonth = now()->day;
        $daysInMonth = now()->daysInMonth;
        $estimatedMonthCost = $dayOfMonth > 0 
            ? (($totalCosts->total_ai_cost ?? 0) / $dayOfMonth) * $daysInMonth 
            : 0;

        return response()->json([
            'current_month' => $currentMonth,
            'totals' => [
                'ai_cost_brl' => round($totalCosts->total_ai_cost ?? 0, 2),
                'ai_messages' => $totalCosts->total_ai_messages ?? 0,
                'tokens' => $totalCosts->total_tokens ?? 0,
                'leads' => $totalCosts->total_leads ?? 0,
                'tickets' => $totalCosts->total_tickets ?? 0,
                'messages' => $totalCosts->total_messages ?? 0,
            ],
            'estimated_month_cost' => round($estimatedMonthCost, 2),
            'top_tenants' => $topTenantsByCost,
            'active_alerts_count' => CostAlert::active()->count(),
            'alerts' => $activeAlerts,
            'costs_by_plan' => $costsByPlan,
            'monthly_trend' => $monthlyTrend,
        ]);
    }

    /**
     * Lista todos os tenants com uso
     */
    public function listTenantsUsage(Request $request): JsonResponse
    {
        $year = $request->get('year', now()->year);
        $month = $request->get('month', now()->month);

        $query = Tenant::with(['quota'])
            ->withCount(['users', 'channels', 'leads']);

        // Filtros
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        if ($request->has('plan')) {
            $query->where('plan', $request->plan);
        }

        $tenants = $query->get();

        // Adiciona estatísticas de uso
        $stats = TenantUsageStats::where('year', $year)
            ->where('month', $month)
            ->get()
            ->keyBy('tenant_id');

        $result = $tenants->map(function ($tenant) use ($stats) {
            $tenantStats = $stats->get($tenant->id);
            
            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'plan' => $tenant->plan->value,
                'is_active' => $tenant->is_active,
                'users_count' => $tenant->users_count,
                'channels_count' => $tenant->channels_count,
                'leads_count' => $tenant->leads_count,
                'quota' => $tenant->quota ? [
                    'max_leads_month' => $tenant->quota->max_leads_month,
                    'max_ai_cost_month' => $tenant->quota->max_ai_cost_month,
                ] : null,
                'usage' => $tenantStats ? [
                    'leads_created' => $tenantStats->leads_created,
                    'ai_messages' => $tenantStats->ai_messages_sent,
                    'ai_cost_brl' => round($tenantStats->ai_cost_brl, 2),
                ] : null,
            ];
        });

        return response()->json([
            'period' => ['year' => $year, 'month' => $month],
            'data' => $result,
        ]);
    }

    /**
     * Detalhes de custo de um tenant específico
     */
    public function tenantCostDetails(Tenant $tenant, Request $request): JsonResponse
    {
        $year = $request->get('year', now()->year);
        $month = $request->get('month', now()->month);

        // Estatísticas do mês
        $stats = TenantUsageStats::getForPeriod($tenant->id, $year, $month);

        // Quotas
        $quota = TenantQuota::getForTenant($tenant->id);

        // Logs de IA do mês (últimos 100)
        $aiLogs = AiUsageLog::where('tenant_id', $tenant->id)
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->orderByDesc('created_at')
            ->take(100)
            ->get();

        // Custo diário
        $dailyCosts = AiUsageLog::where('tenant_id', $tenant->id)
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->selectRaw('DATE(created_at) as date, SUM(cost_brl) as cost, SUM(total_tokens) as tokens, COUNT(*) as calls')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Custo por modelo
        $costsByModel = AiUsageLog::where('tenant_id', $tenant->id)
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->selectRaw('model, SUM(cost_brl) as cost, SUM(total_tokens) as tokens, COUNT(*) as calls')
            ->groupBy('model')
            ->get();

        // Custo por ação
        $costsByAction = AiUsageLog::where('tenant_id', $tenant->id)
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->whereNotNull('action_type')
            ->selectRaw('action_type, SUM(cost_brl) as cost, COUNT(*) as calls')
            ->groupBy('action_type')
            ->get();

        // Histórico dos últimos 12 meses
        $history = TenantUsageStats::getHistory($tenant->id, 12);

        // Alertas do tenant
        $alerts = CostAlert::where('tenant_id', $tenant->id)
            ->orderByDesc('created_at')
            ->take(20)
            ->get();

        return response()->json([
            'tenant' => $tenant->only(['id', 'name', 'plan', 'ia_enabled', 'is_active']),
            'period' => ['year' => $year, 'month' => $month],
            'stats' => $stats,
            'quota' => $quota,
            'usage_summary' => $this->usageService->getTenantUsageSummary($tenant->id),
            'limits_check' => $this->usageService->checkAllLimits($tenant->id),
            'ai_logs' => $aiLogs,
            'daily_costs' => $dailyCosts,
            'costs_by_model' => $costsByModel,
            'costs_by_action' => $costsByAction,
            'history' => $history,
            'alerts' => $alerts,
        ]);
    }

    /**
     * Atualiza quotas de um tenant
     */
    public function updateTenantQuota(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'max_leads_month' => 'sometimes|integer|min:0',
            'max_users' => 'sometimes|integer|min:1',
            'max_channels' => 'sometimes|integer|min:1',
            'max_ai_messages_month' => 'sometimes|integer|min:0',
            'max_ai_cost_month' => 'sometimes|numeric|min:0',
            'max_storage_mb' => 'sometimes|integer|min:100',
            'enforce_limits' => 'sometimes|boolean',
        ]);

        $quota = TenantQuota::updateOrCreate(
            ['tenant_id' => $tenant->id],
            $validated
        );

        return response()->json([
            'message' => 'Quotas atualizadas com sucesso!',
            'quota' => $quota,
        ]);
    }

    /**
     * Reseta quotas para o padrão do plano
     */
    public function resetTenantQuota(Tenant $tenant): JsonResponse
    {
        TenantQuota::updateForPlan($tenant, $tenant->plan);
        $quota = TenantQuota::getForTenant($tenant->id);

        return response()->json([
            'message' => 'Quotas resetadas para o padrão do plano!',
            'quota' => $quota,
        ]);
    }

    /**
     * Lista todos os alertas
     */
    public function listAlerts(Request $request): JsonResponse
    {
        $query = CostAlert::with('tenant:id,name,plan');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('resource')) {
            $query->where('resource', $request->resource);
        }

        $alerts = $query->orderByDesc('created_at')
            ->paginate($request->get('per_page', 50));

        return response()->json($alerts);
    }

    /**
     * Reconhece um alerta
     */
    public function acknowledgeAlert(CostAlert $alert): JsonResponse
    {
        $alert->acknowledge(auth()->id());

        return response()->json([
            'message' => 'Alerta reconhecido!',
            'alert' => $alert->fresh(),
        ]);
    }

    /**
     * Resolve um alerta
     */
    public function resolveAlert(CostAlert $alert): JsonResponse
    {
        $alert->resolve();

        return response()->json([
            'message' => 'Alerta resolvido!',
            'alert' => $alert->fresh(),
        ]);
    }

    /**
     * Gera faturamento para um tenant
     */
    public function generateBilling(Request $request, Tenant $tenant): JsonResponse
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2024',
            'month' => 'required|integer|min:1|max:12',
        ]);

        $billing = BillingRecord::generateForTenant(
            $tenant,
            $validated['year'],
            $validated['month']
        );

        return response()->json([
            'message' => 'Faturamento gerado com sucesso!',
            'billing' => $billing,
        ]);
    }

    /**
     * Lista registros de faturamento
     */
    public function listBillingRecords(Request $request): JsonResponse
    {
        $query = BillingRecord::with('tenant:id,name,plan');

        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('year')) {
            $query->where('year', $request->year);
        }

        if ($request->has('month')) {
            $query->where('month', $request->month);
        }

        $records = $query->orderByDesc('year')
            ->orderByDesc('month')
            ->paginate($request->get('per_page', 50));

        return response()->json($records);
    }

    /**
     * Marca faturamento como pago
     */
    public function markBillingPaid(BillingRecord $billing): JsonResponse
    {
        $billing->markAsPaid();

        return response()->json([
            'message' => 'Faturamento marcado como pago!',
            'billing' => $billing->fresh(),
        ]);
    }

    /**
     * Exporta relatório de custos
     */
    public function exportReport(Request $request): JsonResponse
    {
        $year = $request->get('year', now()->year);
        $month = $request->get('month', now()->month);

        $data = TenantUsageStats::with('tenant:id,name,plan')
            ->where('year', $year)
            ->where('month', $month)
            ->get()
            ->map(function ($stat) {
                return [
                    'tenant_id' => $stat->tenant_id,
                    'tenant_name' => $stat->tenant?->name,
                    'plan' => $stat->tenant?->plan->value,
                    'leads_created' => $stat->leads_created,
                    'leads_qualified' => $stat->leads_qualified,
                    'leads_converted' => $stat->leads_converted,
                    'ai_messages' => $stat->ai_messages_sent,
                    'ai_tokens' => $stat->ai_total_tokens,
                    'ai_cost_brl' => round($stat->ai_cost_brl, 2),
                    'tickets_created' => $stat->tickets_created,
                    'tickets_closed' => $stat->tickets_closed,
                    'messages_total' => $stat->messages_inbound + $stat->messages_outbound,
                ];
            });

        $summary = [
            'total_tenants' => $data->count(),
            'total_leads' => $data->sum('leads_created'),
            'total_ai_messages' => $data->sum('ai_messages'),
            'total_ai_cost' => round($data->sum('ai_cost_brl'), 2),
            'total_tickets' => $data->sum('tickets_created'),
        ];

        return response()->json([
            'period' => sprintf('%04d-%02d', $year, $month),
            'generated_at' => now()->toIso8601String(),
            'data' => $data,
            'summary' => $summary,
        ]);
    }

    /**
     * Resumo de preços dos planos
     */
    public function getPlanPricing(): JsonResponse
    {
        return response()->json([
            'plans' => [
                'basic' => [
                    'name' => 'Básico',
                    'price' => TenantQuota::PLAN_PRICES['basic'],
                    'limits' => TenantQuota::PLAN_DEFAULTS['basic'],
                ],
                'ia_sdr' => [
                    'name' => 'IA SDR',
                    'price' => TenantQuota::PLAN_PRICES['ia_sdr'],
                    'limits' => TenantQuota::PLAN_DEFAULTS['ia_sdr'],
                ],
                'enterprise' => [
                    'name' => 'Enterprise',
                    'price' => TenantQuota::PLAN_PRICES['enterprise'],
                    'limits' => TenantQuota::PLAN_DEFAULTS['enterprise'],
                ],
            ],
            'extras' => TenantQuota::EXTRA_PRICES,
            'ai_models' => AiUsageLog::MODEL_PRICES,
        ]);
    }
}

