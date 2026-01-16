<?php

namespace App\Http\Controllers;

use App\Enums\LeadStatusEnum;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadAssignmentLog;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    /**
     * Relatório do funil de vendas.
     */
    public function funnel(Request $request): JsonResponse
    {
        $request->validate([
            'pipeline_id' => 'nullable|uuid|exists:pipelines,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $tenantId = auth()->user()->tenant_id;

        // Seleciona o pipeline
        $pipelineId = $request->pipeline_id;
        if (!$pipelineId) {
            $pipeline = Pipeline::where('tenant_id', $tenantId)
                ->where('is_default', true)
                ->first();
            $pipelineId = $pipeline?->id;
        }

        if (!$pipelineId) {
            return response()->json([
                'message' => 'Nenhum pipeline encontrado.',
            ], 404);
        }

        // Query base de leads
        $query = Lead::where('tenant_id', $tenantId)
            ->where('pipeline_id', $pipelineId);

        if ($request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Leads por estágio
        $leadsByStage = (clone $query)
            ->select('stage_id', DB::raw('COUNT(*) as count'), DB::raw('SUM(value) as total_value'))
            ->groupBy('stage_id')
            ->get()
            ->keyBy('stage_id');

        // Busca os estágios do pipeline
        $stages = PipelineStage::where('pipeline_id', $pipelineId)
            ->orderBy('order')
            ->get();

        $funnelData = $stages->map(function ($stage) use ($leadsByStage) {
            $data = $leadsByStage->get($stage->id);
            return [
                'stage_id' => $stage->id,
                'stage_name' => $stage->name,
                'stage_order' => $stage->order,
                'color' => $stage->color,
                'leads_count' => $data?->count ?? 0,
                'total_value' => $data?->total_value ?? 0,
            ];
        });

        // Totais
        $totalLeads = $query->count();
        $totalValue = $query->sum('value');

        // Conversão (leads ganhos vs total)
        $wonLeads = (clone $query)->where('status', LeadStatusEnum::WON)->count();
        $lostLeads = (clone $query)->where('status', LeadStatusEnum::LOST)->count();
        $conversionRate = $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 2) : 0;

        return response()->json([
            'pipeline_id' => $pipelineId,
            'funnel' => $funnelData,
            'totals' => [
                'total_leads' => $totalLeads,
                'total_value' => $totalValue,
                'won_leads' => $wonLeads,
                'lost_leads' => $lostLeads,
                'open_leads' => $totalLeads - $wonLeads - $lostLeads,
                'conversion_rate' => $conversionRate,
            ],
        ]);
    }

    /**
     * Relatório do funil de vendas com série temporal.
     */
    public function funnelTimeSeries(Request $request): JsonResponse
    {
        $request->validate([
            'pipeline_id' => 'nullable|uuid|exists:pipelines,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'group_by' => 'nullable|in:day,week,month',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $groupBy = $request->input('group_by', 'day');

        // Seleciona o pipeline
        $pipelineId = $request->pipeline_id;
        if (!$pipelineId) {
            $pipeline = Pipeline::where('tenant_id', $tenantId)
                ->where('is_default', true)
                ->first();
            $pipelineId = $pipeline?->id;
        }

        if (!$pipelineId) {
            return response()->json([
                'message' => 'Nenhum pipeline encontrado.',
            ], 404);
        }

        // Define datas padrão (últimos 30 dias)
        $dateFrom = $request->date_from ?? now()->subDays(30)->toDateString();
        $dateTo = $request->date_to ?? now()->toDateString();

        // Busca os estágios do pipeline
        $stages = PipelineStage::where('pipeline_id', $pipelineId)
            ->orderBy('order')
            ->get();

        // Define o formato de agrupamento baseado no banco (PostgreSQL)
        $dateFormat = match($groupBy) {
            'week' => "TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD')",
            'month' => "TO_CHAR(created_at, 'YYYY-MM')",
            default => "TO_CHAR(created_at, 'YYYY-MM-DD')",
        };

        // Query agrupada por período e estágio
        $data = Lead::where('tenant_id', $tenantId)
            ->where('pipeline_id', $pipelineId)
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->select(
                DB::raw("{$dateFormat} as period"),
                'stage_id',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(value) as total_value')
            )
            ->groupBy('period', 'stage_id')
            ->orderBy('period')
            ->get();

        // Organiza os dados por período
        $series = [];
        $stageMap = $stages->keyBy('id');

        foreach ($data as $row) {
            $period = $row->period;
            $stageName = $stageMap->get($row->stage_id)?->name ?? 'Desconhecido';

            if (!isset($series[$period])) {
                $series[$period] = [
                    'period' => $period,
                    'stages' => [],
                    'total' => 0,
                ];
            }

            $series[$period]['stages'][$stageName] = [
                'count' => $row->count,
                'value' => $row->total_value ?? 0,
            ];
            $series[$period]['total'] += $row->count;
        }

        // Converte para array e adiciona estágios faltantes com zero
        $stageNames = $stages->pluck('name')->toArray();
        $seriesArray = collect($series)->map(function ($item) use ($stageNames) {
            foreach ($stageNames as $stageName) {
                if (!isset($item['stages'][$stageName])) {
                    $item['stages'][$stageName] = ['count' => 0, 'value' => 0];
                }
            }
            return $item;
        })->values()->toArray();

        return response()->json([
            'pipeline_id' => $pipelineId,
            'group_by' => $groupBy,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'stages' => $stageNames,
            'series' => $seriesArray,
        ]);
    }

    /**
     * Relatório de produtividade dos vendedores.
     */
    public function productivity(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'user_id' => 'nullable|uuid|exists:users,id',
        ]);

        $tenantId = auth()->user()->tenant_id;

        // Query de usuários vendedores
        $usersQuery = User::where('tenant_id', $tenantId)
            ->where('role', 'vendedor')
            ->where('is_active', true);

        if ($request->user_id) {
            $usersQuery->where('id', $request->user_id);
        }

        $users = $usersQuery->get();

        $productivity = $users->map(function ($user) use ($request, $tenantId) {
            // Leads atribuídos
            $leadsQuery = Lead::where('tenant_id', $tenantId)
                ->where('owner_id', $user->id);

            if ($request->date_from) {
                $leadsQuery->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->date_to) {
                $leadsQuery->whereDate('created_at', '<=', $request->date_to);
            }

            $totalLeads = $leadsQuery->count();
            $wonLeads = (clone $leadsQuery)->where('status', LeadStatusEnum::WON)->count();
            $lostLeads = (clone $leadsQuery)->where('status', LeadStatusEnum::LOST)->count();
            $totalValue = (clone $leadsQuery)->where('status', LeadStatusEnum::WON)->sum('value');

            // Tickets atendidos
            $ticketsQuery = Ticket::where('tenant_id', $tenantId)
                ->where('assigned_user_id', $user->id);

            if ($request->date_from) {
                $ticketsQuery->whereDate('created_at', '>=', $request->date_from);
            }

            if ($request->date_to) {
                $ticketsQuery->whereDate('created_at', '<=', $request->date_to);
            }

            $totalTickets = $ticketsQuery->count();
            $closedTickets = (clone $ticketsQuery)->where('status', 'closed')->count();

            // Taxa de conversão
            $conversionRate = $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 2) : 0;

            return [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'leads' => [
                    'total' => $totalLeads,
                    'won' => $wonLeads,
                    'lost' => $lostLeads,
                    'open' => $totalLeads - $wonLeads - $lostLeads,
                    'total_value' => $totalValue,
                    'conversion_rate' => $conversionRate,
                ],
                'tickets' => [
                    'total' => $totalTickets,
                    'closed' => $closedTickets,
                    'open' => $totalTickets - $closedTickets,
                ],
            ];
        });

        return response()->json([
            'productivity' => $productivity,
        ]);
    }

    /**
     * Relatório de performance da IA SDR.
     */
    public function ia(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $tenantId = auth()->user()->tenant_id;

        // Leads criados com IA
        $leadsQuery = Lead::where('tenant_id', $tenantId)
            ->whereIn('ia_mode_at_creation', ['ia_sdr', 'enterprise']);

        if ($request->date_from) {
            $leadsQuery->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $leadsQuery->whereDate('created_at', '<=', $request->date_to);
        }

        $totalIaLeads = $leadsQuery->count();
        $wonIaLeads = (clone $leadsQuery)->where('status', LeadStatusEnum::WON)->count();
        $iaConversionRate = $totalIaLeads > 0 ? round(($wonIaLeads / $totalIaLeads) * 100, 2) : 0;

        // Atividades da IA
        $activitiesQuery = LeadActivity::where('tenant_id', $tenantId)
            ->where('source', 'ia');

        if ($request->date_from) {
            $activitiesQuery->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $activitiesQuery->whereDate('created_at', '<=', $request->date_to);
        }

        $iaActivities = $activitiesQuery
            ->select('type', DB::raw('COUNT(*) as count'))
            ->groupBy('type')
            ->get();

        // Leads com última interação da IA
        $lastIaInteractionLeads = Lead::where('tenant_id', $tenantId)
            ->where('last_interaction_source', 'ia')
            ->count();

        return response()->json([
            'ia_performance' => [
                'total_ia_leads' => $totalIaLeads,
                'won_ia_leads' => $wonIaLeads,
                'conversion_rate' => $iaConversionRate,
                'last_ia_interaction_leads' => $lastIaInteractionLeads,
            ],
            'ia_activities' => $iaActivities,
        ]);
    }

    /**
     * Relatório de distribuição Round-Robin.
     */
    public function distribution(Request $request): JsonResponse
    {
        $request->validate([
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        $tenantId = auth()->user()->tenant_id;

        // Query base de leads
        $baseQuery = Lead::where('tenant_id', $tenantId);

        if ($request->date_from) {
            $baseQuery->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->date_to) {
            $baseQuery->whereDate('created_at', '<=', $request->date_to);
        }

        // Leads por canal
        $leadsByChannel = (clone $baseQuery)
            ->select('channel_id', DB::raw('COUNT(*) as leads_count'))
            ->whereNotNull('channel_id')
            ->groupBy('channel_id')
            ->get()
            ->map(function ($item) {
                $channel = \App\Models\Channel::find($item->channel_id);
                return [
                    'channel_id' => $item->channel_id,
                    'channel_name' => $channel->name ?? 'Desconhecido',
                    'channel_type' => $channel->type ?? 'outros',
                    'leads_count' => $item->leads_count,
                ];
            });

        // Leads por vendedor
        $leadsByOwner = (clone $baseQuery)
            ->select('owner_id', DB::raw('COUNT(*) as leads_count'))
            ->whereNotNull('owner_id')
            ->groupBy('owner_id')
            ->get()
            ->map(function ($item) {
                $owner = \App\Models\User::find($item->owner_id);
                return [
                    'user_id' => $item->owner_id,
                    'user_name' => $owner->name ?? 'N/A',
                    'leads_count' => $item->leads_count,
                ];
            });

        // Logs de atribuição Round-Robin
        $logsQuery = LeadAssignmentLog::where('tenant_id', $tenantId)
            ->with('user:id,name', 'channel:id,name');

        if ($request->channel_id) {
            $logsQuery->where('channel_id', $request->channel_id);
        }

        $logs = $logsQuery->get();

        // Distribuição por usuário
        $distributionByUser = $logs->groupBy('user_id')->map(function ($group) {
            $user = $group->first()->user;
            return [
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? 'N/A',
                'channels_count' => $group->count(),
                'last_assigned_at' => $group->max('last_assigned_at'),
            ];
        })->values();

        return response()->json([
            'by_channel' => $leadsByChannel,
            'by_owner' => $leadsByOwner,
            'distribution_logs' => $distributionByUser,
            'leads_by_owner' => $leadsByOwner, // Mantém por compatibilidade
        ]);
    }
}


