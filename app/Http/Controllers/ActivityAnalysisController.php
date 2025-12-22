<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\User;
use App\Services\ActivityAnalysisService;
use App\Services\ActivityEffectivenessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityAnalysisController extends Controller
{
    public function __construct(
        protected ActivityAnalysisService $analysisService,
        protected ActivityEffectivenessService $effectivenessService
    ) {}

    /**
     * Análise de contribuição de atividades do usuário logado.
     */
    public function myContribution(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $startDate = $validated['start_date'] ?? now()->startOfMonth()->format('Y-m-d');
        $endDate = $validated['end_date'] ?? now()->format('Y-m-d');

        $analysis = $this->analysisService->analyzeUserContribution(
            auth()->user(),
            $startDate,
            $endDate
        );

        return response()->json($analysis);
    }

    /**
     * Análise de contribuição de um usuário específico.
     */
    public function userContribution(Request $request, User $user): JsonResponse
    {
        // Verifica se tem acesso
        if ($user->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        // Vendedor só pode ver sua própria análise
        if (auth()->user()->role->value === 'vendedor' && auth()->id() !== $user->id) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $startDate = $validated['start_date'] ?? now()->startOfMonth()->format('Y-m-d');
        $endDate = $validated['end_date'] ?? now()->format('Y-m-d');

        $analysis = $this->analysisService->analyzeUserContribution(
            $user,
            $startDate,
            $endDate
        );

        return response()->json($analysis);
    }

    /**
     * Análise da jornada de um lead.
     */
    public function leadJourney(Lead $lead): JsonResponse
    {
        // Verifica se tem acesso ao lead
        if ($lead->tenant_id !== auth()->user()->tenant_id) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $analysis = $this->analysisService->analyzeLeadJourney($lead->id);

        return response()->json($analysis);
    }

    /**
     * Comparação entre vendedores.
     */
    public function compare(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_ids' => 'required|array|min:2|max:10',
            'user_ids.*' => 'uuid|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $startDate = $validated['start_date'] ?? now()->startOfMonth()->format('Y-m-d');
        $endDate = $validated['end_date'] ?? now()->format('Y-m-d');

        // Verifica se todos os usuários são do mesmo tenant
        $tenantId = auth()->user()->tenant_id;
        $users = User::whereIn('id', $validated['user_ids'])->get();

        foreach ($users as $user) {
            if ($user->tenant_id !== $tenantId) {
                return response()->json(['message' => 'Acesso negado.'], 403);
            }
        }

        $comparison = $this->analysisService->compareUsers(
            $validated['user_ids'],
            $startDate,
            $endDate
        );

        return response()->json([
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'comparison' => $comparison,
        ]);
    }

    /**
     * Insights gerais do tenant.
     */
    public function tenantInsights(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $startDate = $validated['start_date'] ?? now()->startOfMonth()->format('Y-m-d');
        $endDate = $validated['end_date'] ?? now()->format('Y-m-d');

        // Busca todos os vendedores ativos
        $users = User::where('tenant_id', $tenantId)
            ->where('role', 'vendedor')
            ->where('is_active', true)
            ->get();

        $userIds = $users->pluck('id')->toArray();

        if (empty($userIds)) {
            return response()->json([
                'message' => 'Nenhum vendedor encontrado.',
                'insights' => [],
            ]);
        }

        $comparison = $this->analysisService->compareUsers($userIds, $startDate, $endDate);

        // Calcula métricas agregadas
        $totalActivities = array_sum(array_column(array_column($comparison, 'metrics'), 'total_activities'));
        $totalSales = array_sum(array_column(array_column($comparison, 'metrics'), 'total_sales'));
        $totalRevenue = array_sum(array_column(array_column($comparison, 'metrics'), 'total_revenue'));

        return response()->json([
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'summary' => [
                'total_sellers' => count($userIds),
                'total_activities' => $totalActivities,
                'total_sales' => $totalSales,
                'total_revenue' => $totalRevenue,
                'avg_activities_per_seller' => count($userIds) > 0
                    ? round($totalActivities / count($userIds), 1)
                    : 0,
                'avg_sales_per_seller' => count($userIds) > 0
                    ? round($totalSales / count($userIds), 1)
                    : 0,
            ],
            'top_performers' => array_slice($comparison, 0, 5),
        ]);
    }

    /**
     * Relatório de efetividade de atividades.
     * Mostra quais atividades mais contribuem para conversão.
     */
    public function effectiveness(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'pipeline_id' => 'nullable|uuid|exists:pipeline_stages,pipeline_id',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $startDate = $validated['start_date'] ?? now()->subMonths(3)->format('Y-m-d');
        $endDate = $validated['end_date'] ?? now()->format('Y-m-d');
        $dateRange = [$startDate . ' 00:00:00', $endDate . ' 23:59:59'];
        $pipelineId = $validated['pipeline_id'] ?? null;

        $effectiveness = $this->effectivenessService->analyzeActivityEffectiveness(
            $tenantId,
            $dateRange,
            $pipelineId
        );

        $overallLift = $this->effectivenessService->calculateOverallEffectiveness(
            $tenantId,
            $dateRange
        );

        $topPerforming = $this->effectivenessService->getTopPerformingActivities(
            $tenantId,
            $dateRange,
            5
        );

        $needsImprovement = $this->effectivenessService->getActivitiesNeedingImprovement(
            $tenantId,
            $dateRange
        );

        return response()->json([
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'summary' => [
                'overall_lift' => $overallLift,
                'total_activities_analyzed' => count($effectiveness),
                'high_impact_count' => count(array_filter($effectiveness, fn($e) => $e['is_high_impact'])),
                'critical_count' => count(array_filter($effectiveness, fn($e) => $e['is_critical'])),
            ],
            'all_activities' => $effectiveness,
            'top_performing' => $topPerforming,
            'needs_improvement' => $needsImprovement,
        ]);
    }

    /**
     * Análise de sequência de atividades (won vs lost).
     */
    public function sequenceAnalysis(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $startDate = $validated['start_date'] ?? now()->subMonths(3)->format('Y-m-d');
        $endDate = $validated['end_date'] ?? now()->format('Y-m-d');
        $dateRange = [$startDate . ' 00:00:00', $endDate . ' 23:59:59'];

        $analysis = $this->effectivenessService->analyzeActivitySequence(
            $tenantId,
            $dateRange
        );

        return response()->json([
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            ...$analysis,
        ]);
    }

    /**
     * Efetividade de atividades por vendedor.
     */
    public function effectivenessByUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $startDate = $validated['start_date'] ?? now()->subMonths(1)->format('Y-m-d');
        $endDate = $validated['end_date'] ?? now()->format('Y-m-d');
        $dateRange = [$startDate . ' 00:00:00', $endDate . ' 23:59:59'];

        $analysis = $this->effectivenessService->analyzeByUser(
            $tenantId,
            $dateRange
        );

        return response()->json([
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'users' => $analysis,
        ]);
    }
}
