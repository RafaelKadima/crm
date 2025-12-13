<?php

namespace App\Http\Controllers\BI;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Ticket;
use App\Models\Stage;
use App\Models\Pipeline;
use App\Models\AdCampaign;
use App\Models\AdAccount;
use App\Models\AgentActionLog;
use App\Models\BiSuggestedAction;
use App\Models\BiGeneratedKnowledge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Controller interno para o AI Service acessar métricas do BI.
 * 
 * Autenticação via middleware 'internal.api' (X-Internal-Key header).
 */
class InternalBIController extends Controller
{
    /**
     * Métricas de vendas.
     */
    public function salesMetrics(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $period = $request->input('period', '30d');
        $days = $this->parsePeriod($period);
        $startDate = Carbon::now()->subDays($days);

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        // Total de leads
        $totalLeads = Lead::where('tenant_id', $tenantId)->count();
        
        // Leads no período
        $leadsInPeriod = Lead::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->count();

        // Leads por estágio
        $leadsByStage = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->select('stages.name as stage_name', DB::raw('COUNT(leads.id) as count'))
            ->groupBy('stages.name')
            ->get()
            ->pluck('count', 'stage_name')
            ->toArray();

        // Leads fechados (won)
        $closedLeads = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->where('stages.is_won', true)
            ->count();

        // Valor total das vendas
        $totalValue = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->where('stages.is_won', true)
            ->sum('leads.value') ?? 0;

        // Leads fechados no período
        $closedInPeriod = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->where('stages.is_won', true)
            ->where('leads.updated_at', '>=', $startDate)
            ->count();

        // Valor no período
        $valueInPeriod = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->where('stages.is_won', true)
            ->where('leads.updated_at', '>=', $startDate)
            ->sum('leads.value') ?? 0;

        // Taxa de conversão
        $conversionRate = $totalLeads > 0 ? ($closedLeads / $totalLeads) : 0;
        $avgDealSize = $closedLeads > 0 ? ($totalValue / $closedLeads) : 0;

        // Leads por canal
        $leadsByChannel = Lead::where('tenant_id', $tenantId)
            ->whereNotNull('channel')
            ->select('channel', DB::raw('COUNT(*) as count'))
            ->groupBy('channel')
            ->get()
            ->pluck('count', 'channel')
            ->toArray();

        // Tempo médio para fechar (em dias)
        $avgTimeToClose = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->where('stages.is_won', true)
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (leads.updated_at - leads.created_at)) / 86400) as avg_days')
            ->value('avg_days') ?? 0;

        return response()->json([
            'success' => true,
            'period' => $period,
            'total_leads' => $totalLeads,
            'leads_in_period' => $leadsInPeriod,
            'leads_by_stage' => $leadsByStage,
            'leads_by_channel' => $leadsByChannel,
            'closed_leads' => $closedLeads,
            'closed_in_period' => $closedInPeriod,
            'total_value' => (float) $totalValue,
            'value_in_period' => (float) $valueInPeriod,
            'conversion_rate' => round($conversionRate, 4),
            'avg_deal_size' => round($avgDealSize, 2),
            'avg_time_to_close_days' => round((float) $avgTimeToClose, 1),
        ]);
    }

    /**
     * Métricas de suporte.
     */
    public function supportMetrics(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $period = $request->input('period', '30d');
        $days = $this->parsePeriod($period);
        $startDate = Carbon::now()->subDays($days);

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        // Total de tickets
        $totalTickets = Ticket::where('tenant_id', $tenantId)->count();
        
        // Tickets no período
        $ticketsInPeriod = Ticket::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->count();

        // Tickets abertos
        $openTickets = Ticket::where('tenant_id', $tenantId)
            ->whereIn('status', ['aberto', 'em_atendimento'])
            ->count();

        // Tickets por status
        $byStatus = Ticket::where('tenant_id', $tenantId)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status')
            ->toArray();

        // Tickets por canal
        $byChannel = Ticket::where('tickets.tenant_id', $tenantId)
            ->join('channels', 'tickets.channel_id', '=', 'channels.id')
            ->select('channels.type as channel', DB::raw('COUNT(tickets.id) as count'))
            ->groupBy('channels.type')
            ->get()
            ->pluck('count', 'channel')
            ->toArray();

        // Tempo médio de resposta (primeira resposta em minutos)
        // TODO: Implementar quando tivermos timestamps de resposta

        // Tickets resolvidos no período
        $resolvedInPeriod = Ticket::where('tenant_id', $tenantId)
            ->where('status', 'finalizado')
            ->where('updated_at', '>=', $startDate)
            ->count();

        return response()->json([
            'success' => true,
            'period' => $period,
            'total_tickets' => $totalTickets,
            'tickets_in_period' => $ticketsInPeriod,
            'open_tickets' => $openTickets,
            'resolved_in_period' => $resolvedInPeriod,
            'by_status' => $byStatus,
            'by_channel' => $byChannel,
            'avg_response_time_minutes' => 0, // TODO
            'avg_resolution_time_hours' => 0, // TODO
            'satisfaction_score' => null, // TODO
        ]);
    }

    /**
     * Métricas de marketing.
     */
    public function marketingMetrics(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $period = $request->input('period', '30d');
        $adAccountId = $request->input('ad_account_id');

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $query = AdCampaign::where('tenant_id', $tenantId);
        
        if ($adAccountId) {
            $query->where('ad_account_id', $adAccountId);
        }

        $campaigns = $query->get();

        // Totais
        $totalSpend = $campaigns->sum('spend');
        $totalImpressions = $campaigns->sum('impressions');
        $totalClicks = $campaigns->sum('clicks');
        $totalConversions = $campaigns->sum('conversions');

        // Campanhas ativas
        $activeCampaigns = $campaigns->where('status', 'ACTIVE')->count();

        // ROAS médio
        $campaignsWithRoas = $campaigns->where('roas', '>', 0);
        $avgRoas = $campaignsWithRoas->count() > 0 
            ? $campaignsWithRoas->avg('roas') 
            : 0;

        // Melhor campanha por ROAS
        $bestCampaign = $campaigns->sortByDesc('roas')->first();

        // Leads por canal de marketing
        $leadsByChannel = Lead::where('tenant_id', $tenantId)
            ->whereNotNull('channel')
            ->select('channel', DB::raw('COUNT(*) as count'))
            ->groupBy('channel')
            ->orderByDesc('count')
            ->get()
            ->pluck('count', 'channel')
            ->toArray();

        $totalLeads = array_sum($leadsByChannel);
        $cpl = $totalLeads > 0 ? ($totalSpend / $totalLeads) : 0;

        return response()->json([
            'success' => true,
            'period' => $period,
            'total_spend' => round((float) $totalSpend, 2),
            'total_impressions' => (int) $totalImpressions,
            'total_clicks' => (int) $totalClicks,
            'total_conversions' => (int) $totalConversions,
            'total_campaigns' => $campaigns->count(),
            'active_campaigns' => $activeCampaigns,
            'cpl' => round($cpl, 2),
            'avg_roas' => round($avgRoas, 2),
            'best_campaign' => $bestCampaign ? [
                'id' => $bestCampaign->id,
                'name' => $bestCampaign->name,
                'roas' => $bestCampaign->roas,
            ] : null,
            'leads_by_channel' => $leadsByChannel,
            'filtered_by_account' => $adAccountId !== null,
        ]);
    }

    /**
     * Métricas financeiras.
     */
    public function financialMetrics(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $period = $request->input('period', '30d');
        $days = $this->parsePeriod($period);
        $startDate = Carbon::now()->subDays($days);
        $previousStart = Carbon::now()->subDays($days * 2);

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        // Receita no período atual
        $revenueCurrentPeriod = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->where('stages.is_won', true)
            ->where('leads.updated_at', '>=', $startDate)
            ->sum('leads.value') ?? 0;

        // Receita no período anterior
        $revenuePreviousPeriod = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->where('stages.is_won', true)
            ->where('leads.updated_at', '>=', $previousStart)
            ->where('leads.updated_at', '<', $startDate)
            ->sum('leads.value') ?? 0;

        // Crescimento
        $revenueGrowth = $revenuePreviousPeriod > 0 
            ? (($revenueCurrentPeriod - $revenuePreviousPeriod) / $revenuePreviousPeriod) 
            : 0;

        // Custo de IA (baseado em logs de ações)
        $aiActionsCount = AgentActionLog::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->count();
        $aiCost = $aiActionsCount * 0.01; // Estimativa: R$ 0.01 por ação

        // ROI da IA
        $roiOnAi = $aiCost > 0 ? ($revenueCurrentPeriod / $aiCost) : 0;

        // Gasto em marketing
        $marketingSpend = AdCampaign::where('tenant_id', $tenantId)
            ->sum('spend') ?? 0;

        return response()->json([
            'success' => true,
            'period' => $period,
            'revenue_current' => round((float) $revenueCurrentPeriod, 2),
            'revenue_previous' => round((float) $revenuePreviousPeriod, 2),
            'revenue_growth' => round($revenueGrowth, 4),
            'ai_cost' => round($aiCost, 2),
            'ai_actions_count' => $aiActionsCount,
            'roi_on_ai' => round($roiOnAi, 2),
            'marketing_spend' => round((float) $marketingSpend, 2),
        ]);
    }

    /**
     * Métricas de IA/Agentes.
     */
    public function aiMetrics(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $period = $request->input('period', '30d');
        $days = $this->parsePeriod($period);
        $startDate = Carbon::now()->subDays($days);

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        // Total de decisões
        $totalDecisions = AgentActionLog::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->count();

        // Decisões sobrescritas
        $overrides = AgentActionLog::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->where('was_overridden', true)
            ->count();

        $overrideRate = $totalDecisions > 0 ? ($overrides / $totalDecisions) : 0;
        $accuracy = 1 - $overrideRate;

        // Decisões por tipo de agente
        $byAgentType = AgentActionLog::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->select('agent_type', DB::raw('COUNT(*) as count'))
            ->groupBy('agent_type')
            ->get()
            ->pluck('count', 'agent_type')
            ->toArray();

        // Decisões por ação
        $byActionType = AgentActionLog::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->select('action_type', DB::raw('COUNT(*) as count'))
            ->groupBy('action_type')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->pluck('count', 'action_type')
            ->toArray();

        return response()->json([
            'success' => true,
            'period' => $period,
            'total_decisions' => $totalDecisions,
            'overrides' => $overrides,
            'override_rate' => round($overrideRate, 4),
            'accuracy' => round($accuracy, 4),
            'by_agent_type' => $byAgentType,
            'by_action_type' => $byActionType,
        ]);
    }

    /**
     * Dados do funil de vendas.
     */
    public function funnelData(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $pipelineId = $request->input('pipeline_id');

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        // Busca pipeline
        $pipelineQuery = Pipeline::where('tenant_id', $tenantId);
        if ($pipelineId) {
            $pipelineQuery->where('id', $pipelineId);
        }
        $pipeline = $pipelineQuery->first();

        if (!$pipeline) {
            return response()->json([
                'success' => true,
                'stages' => [],
                'total_leads' => 0,
                'conversion_rate' => 0,
            ]);
        }

        // Busca estágios com contagem de leads
        $stages = Stage::where('pipeline_id', $pipeline->id)
            ->orderBy('order_position')
            ->withCount(['leads' => function ($query) use ($tenantId) {
                $query->where('tenant_id', $tenantId);
            }])
            ->get();

        $stagesData = [];
        $totalLeads = 0;
        $wonLeads = 0;

        foreach ($stages as $i => $stage) {
            $count = $stage->leads_count;
            $totalLeads += $count;
            
            if ($stage->is_won) {
                $wonLeads = $count;
            }

            // Conversão para próximo estágio
            $nextStage = $stages->get($i + 1);
            $nextCount = $nextStage ? $nextStage->leads_count : $count;
            $conversionToNext = $count > 0 ? min(1, $nextCount / $count) : 0;

            $stagesData[] = [
                'id' => $stage->id,
                'name' => $stage->name,
                'color' => $stage->color,
                'order' => $stage->order_position,
                'count' => $count,
                'is_won' => $stage->is_won,
                'is_lost' => $stage->is_lost,
                'conversion_to_next' => round($conversionToNext, 4),
            ];
        }

        $conversionRate = $totalLeads > 0 ? ($wonLeads / $totalLeads) : 0;

        // Identifica gargalo (menor conversão, excluindo último estágio)
        $bottleneck = null;
        $nonFinalStages = array_filter($stagesData, fn($s) => !$s['is_won'] && !$s['is_lost'] && $s['count'] > 0);
        if (count($nonFinalStages) > 0) {
            $bottleneck = collect($nonFinalStages)->sortBy('conversion_to_next')->first();
        }

        return response()->json([
            'success' => true,
            'pipeline_id' => $pipeline->id,
            'pipeline_name' => $pipeline->name,
            'stages' => $stagesData,
            'total_leads' => $totalLeads,
            'won_leads' => $wonLeads,
            'conversion_rate' => round($conversionRate, 4),
            'bottleneck' => $bottleneck,
        ]);
    }

    /**
     * Histórico de leads por dia.
     */
    public function leadsHistory(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $days = $request->input('days', 30);

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $startDate = Carbon::now()->subDays($days);

        $history = Lead::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($row) => [
                'date' => $row->date,
                'count' => $row->count,
                'day_of_week' => Carbon::parse($row->date)->dayOfWeek,
            ])
            ->toArray();

        // Calcula média por dia da semana
        $byDayOfWeek = [];
        foreach ($history as $day) {
            $dow = $day['day_of_week'];
            if (!isset($byDayOfWeek[$dow])) {
                $byDayOfWeek[$dow] = ['total' => 0, 'count' => 0];
            }
            $byDayOfWeek[$dow]['total'] += $day['count'];
            $byDayOfWeek[$dow]['count']++;
        }
        
        $avgByDayOfWeek = [];
        foreach ($byDayOfWeek as $dow => $data) {
            $avgByDayOfWeek[$dow] = $data['count'] > 0 
                ? round($data['total'] / $data['count'], 1) 
                : 0;
        }

        return response()->json([
            'success' => true,
            'days' => $days,
            'history' => $history,
            'total' => array_sum(array_column($history, 'count')),
            'avg_per_day' => count($history) > 0 
                ? round(array_sum(array_column($history, 'count')) / count($history), 1) 
                : 0,
            'avg_by_day_of_week' => $avgByDayOfWeek,
        ]);
    }

    /**
     * Histórico de receita por dia.
     */
    public function revenueHistory(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $days = $request->input('days', 90);

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $startDate = Carbon::now()->subDays($days);

        $history = Lead::where('leads.tenant_id', $tenantId)
            ->join('stages', 'leads.stage_id', '=', 'stages.id')
            ->where('stages.is_won', true)
            ->where('leads.updated_at', '>=', $startDate)
            ->selectRaw('DATE(leads.updated_at) as date, SUM(leads.value) as revenue, COUNT(*) as deals')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn($row) => [
                'date' => $row->date,
                'revenue' => (float) $row->revenue,
                'deals' => $row->deals,
            ])
            ->toArray();

        // Calcula médias móveis
        $totalRevenue = array_sum(array_column($history, 'revenue'));
        $totalDeals = array_sum(array_column($history, 'deals'));

        return response()->json([
            'success' => true,
            'days' => $days,
            'history' => $history,
            'total_revenue' => round($totalRevenue, 2),
            'total_deals' => $totalDeals,
            'avg_daily_revenue' => count($history) > 0 
                ? round($totalRevenue / count($history), 2) 
                : 0,
        ]);
    }

    /**
     * Salva uma ação sugerida pelo BI Agent.
     */
    public function saveAction(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $validated = $request->validate([
            'target_agent' => 'required|string|in:sdr,ads,knowledge,ml',
            'action_type' => 'required|string|max:100',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'rationale' => 'required|string',
            'payload' => 'required|array',
            'priority' => 'required|string|in:low,medium,high,critical',
            'expected_impact' => 'nullable|array',
            'expires_at' => 'nullable|date',
        ]);

        $action = BiSuggestedAction::create([
            'tenant_id' => $tenantId,
            'target_agent' => $validated['target_agent'],
            'action_type' => $validated['action_type'],
            'title' => $validated['title'],
            'description' => $validated['description'],
            'rationale' => $validated['rationale'],
            'payload' => $validated['payload'],
            'priority' => $validated['priority'],
            'expected_impact' => $validated['expected_impact'] ?? null,
            'status' => 'pending',
            'expires_at' => $validated['expires_at'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'action_id' => $action->id,
            'message' => 'Ação criada na fila de aprovação',
        ], 201);
    }

    /**
     * Salva conhecimento gerado pelo BI Agent.
     */
    public function saveKnowledge(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $validated = $request->validate([
            'knowledge_type' => 'required|string|in:insight,pattern,best_practice,warning,anomaly',
            'category' => 'required|string|in:sales,support,marketing,financial,ai,general',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'confidence' => 'required|numeric|min:0|max:1',
            'supporting_data' => 'nullable|array',
            'added_to_rag' => 'nullable|boolean',
        ]);

        $knowledge = BiGeneratedKnowledge::create([
            'tenant_id' => $tenantId,
            'knowledge_type' => $validated['knowledge_type'],
            'category' => $validated['category'],
            'title' => $validated['title'],
            'content' => $validated['content'],
            'confidence' => $validated['confidence'],
            'supporting_data' => $validated['supporting_data'] ?? null,
            'added_to_rag' => $validated['added_to_rag'] ?? false,
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'knowledge_id' => $knowledge->id,
            'message' => 'Conhecimento salvo com sucesso',
        ], 201);
    }

    /**
     * Lista configurações de monitoramento de todos os tenants.
     * Usado pelo scheduler do BI Agent.
     */
    public function getMonitoringConfigs(Request $request): JsonResponse
    {
        // Busca todos os tenants que têm configuração de BI ativa
        $configs = BiAgentConfig::where('auto_analysis_enabled', true)
            ->with(['tenant'])
            ->get()
            ->map(function ($config) {
                // Busca contas de anúncios configuradas para monitoramento
                $accountIds = $config->monitored_accounts ?? [];
                
                // Se não tem contas específicas, busca todas do tenant
                if (empty($accountIds)) {
                    $accountIds = \App\Models\AdAccount::where('tenant_id', $config->tenant_id)
                        ->where('status', 'connected')
                        ->pluck('id')
                        ->toArray();
                }
                
                return [
                    'tenant_id' => $config->tenant_id,
                    'ad_account_ids' => $accountIds,
                    'analysis_frequency' => $config->analysis_frequency ?? 'daily',
                ];
            })
            ->toArray();

        return response()->json([
            'success' => true,
            'configs' => $configs,
        ]);
    }

    /**
     * Atualiza configuração de monitoramento do tenant.
     */
    public function updateMonitoringConfig(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $validated = $request->validate([
            'auto_analysis_enabled' => 'boolean',
            'monitored_accounts' => 'array',
            'monitored_accounts.*' => 'uuid',
            'analysis_frequency' => 'string|in:daily,twice_daily,weekly',
        ]);

        $config = BiAgentConfig::firstOrCreate(
            ['tenant_id' => $tenantId],
            ['auto_analysis_enabled' => false]
        );

        if (isset($validated['auto_analysis_enabled'])) {
            $config->auto_analysis_enabled = $validated['auto_analysis_enabled'];
        }
        if (isset($validated['monitored_accounts'])) {
            $config->monitored_accounts = $validated['monitored_accounts'];
        }
        if (isset($validated['analysis_frequency'])) {
            $config->analysis_frequency = $validated['analysis_frequency'];
        }

        $config->save();

        return response()->json([
            'success' => true,
            'config' => $config,
        ]);
    }

    /**
     * Retorna configuração de monitoramento do tenant.
     */
    public function getMonitoringConfig(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $config = BiAgentConfig::where('tenant_id', $tenantId)->first();

        if (!$config) {
            return response()->json([
                'success' => true,
                'config' => [
                    'auto_analysis_enabled' => false,
                    'monitored_accounts' => [],
                    'analysis_frequency' => 'daily',
                ],
            ]);
        }

        // Busca nomes das contas monitoradas
        $accountIds = $config->monitored_accounts ?? [];
        $accounts = [];
        if (!empty($accountIds)) {
            $accounts = \App\Models\AdAccount::whereIn('id', $accountIds)
                ->get(['id', 'name', 'platform_account_id'])
                ->toArray();
        }

        return response()->json([
            'success' => true,
            'config' => [
                'auto_analysis_enabled' => $config->auto_analysis_enabled,
                'monitored_accounts' => $accountIds,
                'accounts_details' => $accounts,
                'analysis_frequency' => $config->analysis_frequency ?? 'daily',
            ],
        ]);
    }

    /**
     * Salva resultado de uma análise do BI Agent.
     */
    public function saveAnalysisResult(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');

        if (!$tenantId) {
            return response()->json(['error' => 'X-Tenant-ID header required'], 400);
        }

        $validated = $request->validate([
            'accounts_analyzed' => 'array',
            'total_actions_suggested' => 'integer',
            'total_insights' => 'integer',
            'started_at' => 'string',
            'completed_at' => 'string',
        ]);

        // Cria registro de análise
        $analysis = BiAnalysis::create([
            'tenant_id' => $tenantId,
            'status' => 'completed',
            'analysis_type' => 'scheduled',
            'results' => $validated,
            'insights_count' => $validated['total_insights'] ?? 0,
            'actions_count' => $validated['total_actions_suggested'] ?? 0,
            'completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'analysis_id' => $analysis->id,
        ], 201);
    }

    /**
     * Converte string de período para número de dias.
     */
    private function parsePeriod(string $period): int
    {
        if (preg_match('/^(\d+)d$/', $period, $matches)) {
            return (int) $matches[1];
        } elseif (preg_match('/^(\d+)w$/', $period, $matches)) {
            return (int) $matches[1] * 7;
        } elseif (preg_match('/^(\d+)m$/', $period, $matches)) {
            return (int) $matches[1] * 30;
        }
        return 30;
    }
}

