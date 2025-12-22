<?php

namespace App\Http\Controllers;

use App\Models\Kpi;
use App\Models\Team;
use App\Models\User;
use App\Services\KpiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KpiController extends Controller
{
    public function __construct(
        protected KpiService $kpiService
    ) {}

    /**
     * Lista todos os KPIs do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Kpi::where('tenant_id', auth()->user()->tenant_id);

        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        $kpis = $query->ordered()->get();

        return response()->json([
            'kpis' => $kpis,
        ]);
    }

    /**
     * Cria um novo KPI customizado.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'key' => 'required|string|max:100|alpha_dash',
            'description' => 'nullable|string',
            'formula_type' => 'required|in:ratio,sum,average,count,custom',
            'source' => 'required|in:leads,activities,stages,custom',
            'formula_config' => 'nullable|array',
            'unit' => 'nullable|string|max:20',
            'target_value' => 'nullable|numeric',
            'weight' => 'nullable|integer|min:0|max:100',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $tenantId = auth()->user()->tenant_id;

        // Verifica se já existe com essa key
        if (Kpi::where('tenant_id', $tenantId)->where('key', $validated['key'])->exists()) {
            return response()->json([
                'message' => 'Já existe um KPI com essa chave.',
            ], 422);
        }

        $validated['tenant_id'] = $tenantId;
        $validated['is_system'] = false;

        $kpi = Kpi::create($validated);

        return response()->json([
            'message' => 'KPI criado com sucesso.',
            'kpi' => $kpi,
        ], 201);
    }

    /**
     * Exibe um KPI específico.
     */
    public function show(Kpi $kpi): JsonResponse
    {
        return response()->json([
            'kpi' => $kpi,
            'current_value' => $kpi->current_value,
            'latest_value' => $kpi->latest_value,
        ]);
    }

    /**
     * Atualiza um KPI.
     */
    public function update(Request $request, Kpi $kpi): JsonResponse
    {
        if ($kpi->is_system) {
            return response()->json([
                'message' => 'KPIs do sistema não podem ser editados.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'target_value' => 'nullable|numeric',
            'weight' => 'nullable|integer|min:0|max:100',
            'is_active' => 'sometimes|boolean',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $kpi->update($validated);

        return response()->json([
            'message' => 'KPI atualizado com sucesso.',
            'kpi' => $kpi,
        ]);
    }

    /**
     * Remove um KPI customizado.
     */
    public function destroy(Kpi $kpi): JsonResponse
    {
        if ($kpi->is_system) {
            return response()->json([
                'message' => 'KPIs do sistema não podem ser removidos.',
            ], 422);
        }

        $kpi->delete();

        return response()->json([
            'message' => 'KPI removido com sucesso.',
        ]);
    }

    /**
     * Calcula todos os KPIs para um período.
     */
    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'nullable|string', // 2025-01
            'period_type' => 'nullable|in:daily,weekly,monthly,quarterly,yearly',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $period = $validated['period'] ?? now()->format('Y-m');
        $periodType = $validated['period_type'] ?? 'monthly';

        $values = $this->kpiService->calculateAll($tenantId, $period, $periodType);

        return response()->json([
            'period' => $period,
            'period_type' => $periodType,
            'values' => $values,
        ]);
    }

    /**
     * Dashboard de KPIs.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'nullable|string',
            'user_id' => 'nullable|uuid|exists:users,id',
            'team_id' => 'nullable|uuid|exists:teams,id',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $period = $validated['period'] ?? now()->format('Y-m');

        $user = isset($validated['user_id']) ? User::find($validated['user_id']) : null;
        $team = isset($validated['team_id']) ? Team::find($validated['team_id']) : null;

        // Se for vendedor, força mostrar apenas seus próprios KPIs
        if (auth()->user()->role->value === 'vendedor') {
            $user = auth()->user();
        }

        $dashboard = $this->kpiService->getDashboard($tenantId, $period, $user, $team);

        return response()->json($dashboard);
    }

    /**
     * KPIs de um usuário específico.
     */
    public function userKpis(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'nullable|string',
        ]);

        $tenantId = auth()->user()->tenant_id;

        // Verifica se tem acesso
        if ($user->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $period = $validated['period'] ?? now()->format('Y-m');

        $dashboard = $this->kpiService->getDashboard($tenantId, $period, $user);

        return response()->json($dashboard);
    }

    /**
     * KPIs de uma equipe.
     */
    public function teamKpis(Request $request, Team $team): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'nullable|string',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $period = $validated['period'] ?? now()->format('Y-m');

        $dashboard = $this->kpiService->getDashboard($tenantId, $period, null, $team);

        return response()->json($dashboard);
    }

    /**
     * Tendência histórica de um KPI.
     */
    public function trend(Request $request, Kpi $kpi): JsonResponse
    {
        $validated = $request->validate([
            'periods' => 'nullable|integer|min:2|max:12',
            'period_type' => 'nullable|in:daily,weekly,monthly,quarterly',
            'user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $periods = $validated['periods'] ?? 6;
        $periodType = $validated['period_type'] ?? 'monthly';
        $user = isset($validated['user_id']) ? User::find($validated['user_id']) : null;

        $trend = $this->kpiService->getTrend($kpi->id, $periods, $periodType, $user);

        return response()->json($trend);
    }

    /**
     * Inicializa os KPIs padrão do sistema.
     */
    public function initializeDefaults(): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;

        $this->kpiService->initializeDefaultKpis($tenantId);

        $kpis = Kpi::where('tenant_id', $tenantId)
            ->where('is_system', true)
            ->ordered()
            ->get();

        return response()->json([
            'message' => 'KPIs padrão inicializados com sucesso.',
            'kpis' => $kpis,
        ]);
    }

    /**
     * Meus KPIs (para vendedor).
     */
    public function myKpis(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => 'nullable|string',
        ]);

        $user = auth()->user();
        $period = $validated['period'] ?? now()->format('Y-m');

        $dashboard = $this->kpiService->getDashboard($user->tenant_id, $period, $user);

        return response()->json($dashboard);
    }
}
