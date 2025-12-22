<?php

namespace App\Http\Controllers;

use App\Models\DealStageActivity;
use App\Models\Lead;
use App\Services\StageActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DealStageActivityController extends Controller
{
    public function __construct(
        protected StageActivityService $stageActivityService
    ) {}

    /**
     * Lista atividades da etapa atual do lead.
     */
    public function index(Lead $lead): JsonResponse
    {
        $activities = $this->stageActivityService->getActivitiesForCurrentStage($lead);

        return response()->json($activities);
    }

    /**
     * Retorna o progresso das atividades da etapa atual.
     */
    public function progress(Lead $lead): JsonResponse
    {
        $progress = $this->stageActivityService->getStageProgress($lead);

        return response()->json($progress);
    }

    /**
     * Retorna todas as atividades do lead (todas as etapas).
     */
    public function all(Lead $lead): JsonResponse
    {
        $activities = $this->stageActivityService->getAllActivitiesForLead($lead);

        return response()->json($activities);
    }

    /**
     * Marca uma atividade como completa.
     */
    public function complete(Lead $lead, DealStageActivity $activity): JsonResponse
    {
        $user = auth()->user();

        // Verifica se a atividade pertence ao lead
        if ($activity->lead_id !== $lead->id) {
            return response()->json(['error' => 'Atividade não pertence a este lead.'], 400);
        }

        // Verifica se já está completa
        if ($activity->isCompleted()) {
            return response()->json(['error' => 'Atividade já está completa.'], 400);
        }

        $activity = $this->stageActivityService->completeActivity($activity, $user);

        return response()->json([
            'message' => 'Atividade completada com sucesso.',
            'activity' => $activity->load(['template', 'completedByUser']),
            'points_earned' => $activity->points_earned,
        ]);
    }

    /**
     * Pula uma atividade (somente não obrigatórias).
     */
    public function skip(Lead $lead, DealStageActivity $activity): JsonResponse
    {
        // Verifica se a atividade pertence ao lead
        if ($activity->lead_id !== $lead->id) {
            return response()->json(['error' => 'Atividade não pertence a este lead.'], 400);
        }

        // Verifica se é obrigatória
        if ($activity->isRequired()) {
            return response()->json(['error' => 'Não é possível pular atividades obrigatórias.'], 400);
        }

        // Verifica se já está processada
        if (!$activity->isPending()) {
            return response()->json(['error' => 'Atividade já foi processada.'], 400);
        }

        $activity = $this->stageActivityService->skipActivity($activity);

        return response()->json([
            'message' => 'Atividade pulada.',
            'activity' => $activity->load('template'),
        ]);
    }

    /**
     * Verifica se o lead pode avançar de etapa.
     */
    public function canAdvance(Lead $lead): JsonResponse
    {
        $result = $this->stageActivityService->canAdvanceStage($lead);

        return response()->json($result);
    }

    // =============================================
    // ADMIN: Dashboard de Atividades
    // =============================================

    /**
     * Dashboard geral de atividades para o admin.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;
        $filterUserId = $request->get('user_id');

        // Funcao para aplicar filtro de usuario
        $applyUserFilter = function ($query) use ($filterUserId) {
            if ($filterUserId) {
                $query->whereHas('lead', function ($q) use ($filterUserId) {
                    $q->where('user_id', $filterUserId);
                });
            }
            return $query;
        };

        // Contadores
        $overdueCount = $applyUserFilter(
            DealStageActivity::where('tenant_id', $tenantId)->overdue()
        )->count();

        $dueTodayCount = $applyUserFilter(
            DealStageActivity::where('tenant_id', $tenantId)->dueToday()
        )->count();

        $dueSoonCount = $applyUserFilter(
            DealStageActivity::where('tenant_id', $tenantId)->dueSoon(3)
        )->count();

        $pendingCount = $applyUserFilter(
            DealStageActivity::where('tenant_id', $tenantId)->pending()
        )->count();

        $completedTodayCount = $applyUserFilter(
            DealStageActivity::where('tenant_id', $tenantId)
                ->completed()
                ->whereDate('completed_at', today())
        )->count();

        // Atividades atrasadas (top 10)
        $overdueActivities = $applyUserFilter(
            DealStageActivity::where('tenant_id', $tenantId)
                ->overdue()
                ->with(['lead', 'template', 'stage'])
        )->orderBy('due_at')
            ->limit(10)
            ->get()
            ->map(fn($activity) => $this->formatActivityForDashboard($activity));

        // Atividades que vencem hoje
        $dueTodayActivities = $applyUserFilter(
            DealStageActivity::where('tenant_id', $tenantId)
                ->dueToday()
                ->with(['lead', 'template', 'stage'])
        )->orderBy('due_at')
            ->limit(10)
            ->get()
            ->map(fn($activity) => $this->formatActivityForDashboard($activity));

        return response()->json([
            'summary' => [
                'overdue' => $overdueCount,
                'due_today' => $dueTodayCount,
                'due_soon' => $dueSoonCount,
                'pending' => $pendingCount,
                'completed_today' => $completedTodayCount,
            ],
            'overdue_activities' => $overdueActivities,
            'due_today_activities' => $dueTodayActivities,
        ]);
    }

    /**
     * Lista todas as atividades atrasadas.
     */
    public function overdue(Request $request): JsonResponse
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;

        $query = DealStageActivity::where('tenant_id', $tenantId)
            ->overdue()
            ->with(['lead', 'template', 'stage']);

        // Filtro por usuario (responsavel pelo lead)
        if ($request->has('user_id')) {
            $query->whereHas('lead', function ($q) use ($request) {
                $q->where('user_id', $request->user_id);
            });
        }

        // Filtro por pipeline
        if ($request->has('pipeline_id')) {
            $query->whereHas('lead', function ($q) use ($request) {
                $q->where('pipeline_id', $request->pipeline_id);
            });
        }

        $activities = $query->orderBy('due_at')
            ->paginate($request->get('per_page', 20));

        $activities->getCollection()->transform(fn($activity) => $this->formatActivityForDashboard($activity));

        return response()->json($activities);
    }

    /**
     * Lista atividades que vencem hoje.
     */
    public function dueToday(Request $request): JsonResponse
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;

        $activities = DealStageActivity::where('tenant_id', $tenantId)
            ->dueToday()
            ->with(['lead', 'template', 'stage'])
            ->orderBy('due_at')
            ->get()
            ->map(fn($activity) => $this->formatActivityForDashboard($activity));

        return response()->json($activities);
    }

    /**
     * Lista atividades que vencem em breve.
     */
    public function dueSoon(Request $request): JsonResponse
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;
        $days = $request->get('days', 3);

        $activities = DealStageActivity::where('tenant_id', $tenantId)
            ->dueSoon($days)
            ->with(['lead', 'template', 'stage'])
            ->orderBy('due_at')
            ->get()
            ->map(fn($activity) => $this->formatActivityForDashboard($activity));

        return response()->json($activities);
    }

    /**
     * Formata uma atividade para exibicao no dashboard.
     */
    protected function formatActivityForDashboard(DealStageActivity $activity): array
    {
        return [
            'id' => $activity->id,
            'status' => $activity->status,
            'due_at' => $activity->due_at?->toIso8601String(),
            'days_overdue' => $activity->days_overdue,
            'days_until_due' => $activity->days_until_due,
            'is_overdue' => $activity->isOverdue(),
            'is_required' => $activity->isRequired(),
            'template' => $activity->template ? [
                'id' => $activity->template->id,
                'title' => $activity->template->title,
                'description' => $activity->template->description,
                'activity_type' => $activity->template->activity_type,
                'icon' => $activity->template->icon,
                'points' => $activity->template->points,
            ] : null,
            'lead' => $activity->lead ? [
                'id' => $activity->lead->id,
                'name' => $activity->lead->name,
                'company' => $activity->lead->company,
                'user_id' => $activity->lead->user_id,
                'user_name' => $activity->lead->user?->name,
            ] : null,
            'stage' => $activity->stage ? [
                'id' => $activity->stage->id,
                'name' => $activity->stage->name,
                'color' => $activity->stage->color,
            ] : null,
        ];
    }
}
