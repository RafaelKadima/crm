<?php

namespace App\Http\Controllers;

use App\Models\SupportActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportActivityController extends Controller
{
    /**
     * Lista todas as atividades de suporte
     */
    public function index(Request $request): JsonResponse
    {
        $query = SupportActivityLog::with(['agent', 'ticket', 'lead'])
            ->orderBy('created_at', 'desc');

        // Filtros
        if ($request->filled('agent_id')) {
            $query->forAgent($request->agent_id);
        }

        if ($request->filled('ticket_id')) {
            $query->forTicket($request->ticket_id);
        }

        if ($request->filled('action_type')) {
            $query->where('action_type', $request->action_type);
        }

        if ($request->filled('tool_used')) {
            $query->where('tool_used', $request->tool_used);
        }

        if ($request->filled('error_found')) {
            $query->where('error_found', $request->boolean('error_found'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->input('per_page', 20);
        $activities = $query->paginate($perPage);

        return response()->json($activities);
    }

    /**
     * Detalhes de uma atividade específica
     */
    public function show(string $id): JsonResponse
    {
        $activity = SupportActivityLog::with(['agent', 'ticket', 'lead'])
            ->findOrFail($id);

        return response()->json($activity);
    }

    /**
     * Atividades de um ticket específico
     */
    public function byTicket(string $ticketId): JsonResponse
    {
        $activities = SupportActivityLog::with(['agent'])
            ->forTicket($ticketId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($activities);
    }

    /**
     * Estatísticas gerais do suporte
     */
    public function stats(Request $request): JsonResponse
    {
        $dateFrom = $request->input('date_from', now()->subDays(30)->toDateString());
        $dateTo = $request->input('date_to', now()->toDateString());

        $baseQuery = SupportActivityLog::whereBetween('created_at', [$dateFrom, $dateTo . ' 23:59:59']);

        // Total de atendimentos (respostas enviadas)
        $totalResponses = (clone $baseQuery)->responses()->count();

        // Total de diagnósticos (ferramentas usadas)
        $totalDiagnostics = (clone $baseQuery)->diagnostics()->count();

        // Bugs identificados
        $bugsFound = (clone $baseQuery)->withErrors()->count();

        // Resoluções fornecidas
        $resolutions = (clone $baseQuery)->withResolutions()->count();

        // Transferências para humano
        $transfers = (clone $baseQuery)->transfers()->count();

        // Tempo médio de execução de ferramentas
        $avgExecutionTime = (clone $baseQuery)
            ->diagnostics()
            ->whereNotNull('execution_time_ms')
            ->avg('execution_time_ms');

        // Tokens consumidos
        $totalTokens = (clone $baseQuery)
            ->whereNotNull('tokens_used')
            ->sum('tokens_used');

        // Ferramentas mais usadas
        $topTools = (clone $baseQuery)
            ->diagnostics()
            ->whereNotNull('tool_used')
            ->selectRaw('tool_used, COUNT(*) as count')
            ->groupBy('tool_used')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        // Taxa de resolução autônoma
        $autonomousResolutionRate = $totalResponses > 0
            ? round(($resolutions / $totalResponses) * 100, 2)
            : 0;

        // Atividade por dia (últimos 7 dias)
        $dailyActivity = SupportActivityLog::whereBetween('created_at', [now()->subDays(7), now()])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return response()->json([
            'period' => [
                'from' => $dateFrom,
                'to' => $dateTo,
            ],
            'totals' => [
                'responses' => $totalResponses,
                'diagnostics' => $totalDiagnostics,
                'bugs_found' => $bugsFound,
                'resolutions' => $resolutions,
                'transfers' => $transfers,
            ],
            'metrics' => [
                'avg_execution_time_ms' => round($avgExecutionTime ?? 0),
                'total_tokens' => $totalTokens,
                'autonomous_resolution_rate' => $autonomousResolutionRate,
            ],
            'top_tools' => $topTools,
            'daily_activity' => $dailyActivity,
        ]);
    }

    /**
     * Endpoint para o Python registrar atividades
     */
    public function logActivity(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid',
            'agent_id' => 'required|uuid',
            'ticket_id' => 'nullable|uuid',
            'lead_id' => 'nullable|uuid',
            'action_type' => 'required|string|in:diagnostic,response,transfer,resolution',
            'tool_used' => 'nullable|string|max:50',
            'tool_arguments' => 'nullable|array',
            'tool_result' => 'nullable|string',
            'user_message' => 'nullable|string',
            'agent_response' => 'nullable|string',
            'error_found' => 'nullable|boolean',
            'error_details' => 'nullable|array',
            'resolution_provided' => 'nullable|boolean',
            'resolution_summary' => 'nullable|string',
            'execution_time_ms' => 'nullable|integer',
            'tokens_used' => 'nullable|integer',
        ]);

        $activity = SupportActivityLog::create($validated);

        return response()->json([
            'success' => true,
            'id' => $activity->id,
        ], 201);
    }
}
