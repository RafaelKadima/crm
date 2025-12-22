<?php

namespace App\Http\Controllers;

use App\Models\Kpr;
use App\Models\KprAssignment;
use App\Models\Team;
use App\Models\User;
use App\Services\KprService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class KprController extends Controller
{
    public function __construct(
        protected KprService $kprService
    ) {}

    /**
     * Lista todas as KPRs do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'nullable|in:draft,active,completed,cancelled',
            'type' => 'nullable|in:revenue,deals,activities,custom',
            'current_period' => 'nullable|boolean',
        ]);

        $query = Kpr::where('tenant_id', auth()->user()->tenant_id)
            ->with(['creator:id,name', 'pipeline:id,name'])
            ->withCount('assignments');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->type) {
            $query->where('type', $request->type);
        }

        if ($request->boolean('current_period')) {
            $query->currentPeriod();
        }

        $kprs = $query->orderByDesc('created_at')->paginate(20);

        return response()->json($kprs);
    }

    /**
     * Cria uma nova KPR.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Kpr::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'required|in:revenue,deals,activities,custom',
            'target_value' => 'required|numeric|min:0',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after:period_start',
            'pipeline_id' => 'nullable|uuid|exists:pipelines,id',
            'product_id' => 'nullable|uuid|exists:products,id',
            'status' => 'nullable|in:draft,active',
            'distributions' => 'nullable|array',
            'distributions.*.type' => 'required_with:distributions|in:team,user',
            'distributions.*.id' => 'required_with:distributions|uuid',
            'distributions.*.percentage' => 'required_with:distributions|numeric|min:0|max:100',
        ]);

        $validated['tenant_id'] = auth()->user()->tenant_id;
        $validated['created_by'] = auth()->id();
        $validated['status'] = $validated['status'] ?? 'draft';

        $kpr = $this->kprService->create($validated);

        return response()->json([
            'message' => 'Meta criada com sucesso.',
            'kpr' => $kpr->load(['creator:id,name', 'assignments.assignable']),
        ], 201);
    }

    /**
     * Exibe uma KPR específica.
     */
    public function show(Kpr $kpr): JsonResponse
    {
        $this->authorize('view', $kpr);

        $kpr->load([
            'creator:id,name',
            'pipeline:id,name',
            'assignments' => function ($q) {
                $q->with('assignable:id,name')
                  ->orderByDesc('current_value');
            },
        ]);

        return response()->json([
            'kpr' => $kpr,
            'stats' => [
                'current_value' => $kpr->current_value,
                'current_progress' => $kpr->current_progress,
                'remaining_value' => $kpr->remaining_value,
                'remaining_days' => $kpr->remaining_days,
                'period_progress' => $kpr->period_progress,
                'projected_value' => $kpr->projected_value,
                'track_status' => $kpr->track_status,
                'is_on_track' => $kpr->isOnTrack(),
            ],
        ]);
    }

    /**
     * Atualiza uma KPR.
     */
    public function update(Request $request, Kpr $kpr): JsonResponse
    {
        $this->authorize('update', $kpr);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'target_value' => 'sometimes|numeric|min:0',
            'period_start' => 'sometimes|date',
            'period_end' => 'sometimes|date|after:period_start',
            'status' => 'sometimes|in:draft,active,completed,cancelled',
            'pipeline_id' => 'nullable|uuid|exists:pipelines,id',
            'product_id' => 'nullable|uuid|exists:products,id',
        ]);

        $oldTargetValue = $kpr->target_value;
        $kpr->update($validated);

        // Se o valor alvo mudou, recalcula as distribuições
        if (isset($validated['target_value']) && $validated['target_value'] != $oldTargetValue) {
            $this->kprService->recalculateDistributions($kpr);
        }

        return response()->json([
            'message' => 'Meta atualizada com sucesso.',
            'kpr' => $kpr->fresh(['creator:id,name', 'assignments.assignable']),
        ]);
    }

    /**
     * Remove uma KPR.
     */
    public function destroy(Kpr $kpr): JsonResponse
    {
        $this->authorize('delete', $kpr);

        $kpr->delete();

        return response()->json([
            'message' => 'Meta removida com sucesso.',
        ]);
    }

    /**
     * Distribui a meta entre equipes/usuários.
     */
    public function distribute(Request $request, Kpr $kpr): JsonResponse
    {
        $this->authorize('update', $kpr);

        $validated = $request->validate([
            'distributions' => 'required|array|min:1',
            'distributions.*.type' => 'required|in:team,user',
            'distributions.*.id' => 'required|uuid',
            'distributions.*.percentage' => 'required|numeric|min:0|max:100',
            'distributions.*.parent_id' => 'nullable|uuid|exists:kpr_assignments,id',
        ]);

        $this->kprService->distribute($kpr, $validated['distributions']);

        return response()->json([
            'message' => 'Meta distribuída com sucesso.',
            'kpr' => $kpr->fresh(['assignments.assignable']),
        ]);
    }

    /**
     * Distribui igualmente para membros de uma equipe.
     */
    public function distributeToTeam(Request $request, Kpr $kpr): JsonResponse
    {
        $this->authorize('update', $kpr);

        $validated = $request->validate([
            'team_id' => 'required|uuid|exists:teams,id',
            'method' => 'nullable|in:equal,performance',
        ]);

        $team = Team::findOrFail($validated['team_id']);
        $method = $validated['method'] ?? 'equal';

        if ($method === 'performance') {
            $this->kprService->distributeByPerformance($kpr, $team);
        } else {
            $this->kprService->distributeEquallyToTeamMembers($kpr, $team);
        }

        return response()->json([
            'message' => 'Meta distribuída para a equipe com sucesso.',
            'kpr' => $kpr->fresh(['assignments.assignable']),
        ]);
    }

    /**
     * Retorna o progresso de uma KPR.
     */
    public function progress(Kpr $kpr): JsonResponse
    {
        $this->authorize('view', $kpr);

        // Recalcula o progresso
        $this->kprService->recalculateProgress($kpr);

        $kpr->load(['assignments' => function ($q) {
            $q->with('assignable:id,name')
              ->orderByDesc('progress_percentage');
        }]);

        return response()->json([
            'kpr' => [
                'id' => $kpr->id,
                'name' => $kpr->name,
                'type' => $kpr->type,
                'target_value' => $kpr->target_value,
                'current_value' => $kpr->current_value,
                'progress_percentage' => $kpr->current_progress,
                'remaining_value' => $kpr->remaining_value,
                'remaining_days' => $kpr->remaining_days,
                'track_status' => $kpr->track_status,
            ],
            'assignments' => $kpr->assignments->map(function ($assignment) {
                return [
                    'id' => $assignment->id,
                    'assignee' => [
                        'id' => $assignment->assignable_id,
                        'name' => $assignment->assignee_name,
                        'type' => $assignment->isUserAssignment() ? 'user' : 'team',
                    ],
                    'target_value' => $assignment->target_value,
                    'current_value' => $assignment->current_value,
                    'progress_percentage' => $assignment->progress_percentage,
                    'remaining_value' => $assignment->remaining_value,
                ];
            }),
        ]);
    }

    /**
     * Retorna o progresso das metas do usuário logado.
     */
    public function myProgress(): JsonResponse
    {
        $user = auth()->user();
        $dashboard = $this->kprService->getUserDashboard($user);

        return response()->json($dashboard);
    }

    /**
     * Retorna o dashboard de metas (visão admin/gestor).
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;

        // Recalcula todas as metas ativas
        $this->kprService->recalculateAllActive($tenantId);

        // Busca metas ativas do período atual
        $kprs = Kpr::where('tenant_id', $tenantId)
            ->active()
            ->currentPeriod()
            ->with(['assignments' => function ($q) {
                $q->with('assignable:id,name')
                  ->orderByDesc('current_value');
            }])
            ->get();

        $summary = [
            'total_kprs' => $kprs->count(),
            'total_target' => $kprs->sum('target_value'),
            'total_current' => $kprs->sum(fn($k) => $k->current_value),
            'overall_progress' => $kprs->sum('target_value') > 0
                ? round(($kprs->sum(fn($k) => $k->current_value) / $kprs->sum('target_value')) * 100, 2)
                : 0,
            'on_track' => $kprs->filter(fn($k) => $k->isOnTrack())->count(),
            'behind' => $kprs->filter(fn($k) => !$k->isOnTrack())->count(),
        ];

        return response()->json([
            'summary' => $summary,
            'kprs' => $kprs->map(function ($kpr) {
                return [
                    'id' => $kpr->id,
                    'name' => $kpr->name,
                    'type' => $kpr->type,
                    'target_value' => $kpr->target_value,
                    'current_value' => $kpr->current_value,
                    'progress_percentage' => $kpr->current_progress,
                    'remaining_days' => $kpr->remaining_days,
                    'track_status' => $kpr->track_status,
                    'top_performers' => $kpr->assignments
                        ->take(3)
                        ->map(fn($a) => [
                            'name' => $a->assignee_name,
                            'value' => $a->current_value,
                            'progress' => $a->progress_percentage,
                        ]),
                ];
            }),
        ]);
    }

    /**
     * Retorna o ranking de uma KPR.
     */
    public function ranking(Kpr $kpr): JsonResponse
    {
        $this->authorize('view', $kpr);

        $ranking = $this->kprService->getRanking($kpr);

        return response()->json([
            'kpr' => [
                'id' => $kpr->id,
                'name' => $kpr->name,
            ],
            'ranking' => $ranking,
        ]);
    }

    /**
     * Ativa uma KPR.
     */
    public function activate(Kpr $kpr): JsonResponse
    {
        $this->authorize('update', $kpr);

        if ($kpr->status !== 'draft') {
            return response()->json([
                'message' => 'Apenas metas em rascunho podem ser ativadas.',
            ], 422);
        }

        $kpr->activate();

        return response()->json([
            'message' => 'Meta ativada com sucesso.',
            'kpr' => $kpr,
        ]);
    }

    /**
     * Completa uma KPR.
     */
    public function complete(Kpr $kpr): JsonResponse
    {
        $this->authorize('update', $kpr);

        $kpr->complete();

        return response()->json([
            'message' => 'Meta marcada como concluída.',
            'kpr' => $kpr,
        ]);
    }
}
