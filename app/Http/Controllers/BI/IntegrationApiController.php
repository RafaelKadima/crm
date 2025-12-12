<?php

namespace App\Http\Controllers\BI;

use App\Http\Controllers\Controller;
use App\Models\BiAnalysis;
use App\Models\BiGeneratedKnowledge;
use App\Models\Lead;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class IntegrationApiController extends Controller
{
    /**
     * API para obter KPIs.
     * 
     * Endpoint: GET /api/bi/integration/kpis
     */
    public function kpis(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');
        $cacheKey = "bi_api_kpis_{$tenantId}_{$period}";
        
        $data = Cache::remember($cacheKey, 300, function () use ($tenantId, $period) {
            $days = $this->parsePeriod($period);
            $startDate = now()->subDays($days);
            
            // Leads
            $totalLeads = Lead::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $startDate)
                ->count();
            
            $convertedLeads = Lead::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $startDate)
                ->whereIn('status', ['won', 'ganho'])
                ->count();
            
            $totalValue = Lead::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $startDate)
                ->whereIn('status', ['won', 'ganho'])
                ->sum('value');
            
            // Tickets
            $totalTickets = Ticket::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $startDate)
                ->count();
            
            $openTickets = Ticket::where('tenant_id', $tenantId)
                ->where('status', 'open')
                ->count();
            
            return [
                'leads' => [
                    'total' => $totalLeads,
                    'converted' => $convertedLeads,
                    'conversion_rate' => $totalLeads > 0 ? round($convertedLeads / $totalLeads, 4) : 0,
                ],
                'revenue' => [
                    'total' => $totalValue,
                    'average_deal' => $convertedLeads > 0 ? round($totalValue / $convertedLeads, 2) : 0,
                ],
                'tickets' => [
                    'total' => $totalTickets,
                    'open' => $openTickets,
                ],
            ];
        });
        
        return response()->json([
            'data' => $data,
            'period' => $period,
            'generated_at' => now()->toIso8601String(),
            'cache_ttl_seconds' => 300,
        ]);
    }

    /**
     * API para obter dados do funil.
     * 
     * Endpoint: GET /api/bi/integration/funnel
     */
    public function funnel(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');
        $pipelineId = $request->get('pipeline_id');
        $cacheKey = "bi_api_funnel_{$tenantId}_{$period}_{$pipelineId}";
        
        $data = Cache::remember($cacheKey, 300, function () use ($tenantId, $period, $pipelineId) {
            $days = $this->parsePeriod($period);
            $startDate = now()->subDays($days);
            
            $query = Lead::where('tenant_id', $tenantId)
                ->where('created_at', '>=', $startDate)
                ->with('stage');
            
            if ($pipelineId) {
                $query->where('pipeline_id', $pipelineId);
            }
            
            $leads = $query->get();
            
            $stageCount = $leads->groupBy('stage_id')
                ->map(function ($group) {
                    return [
                        'count' => $group->count(),
                        'value' => $group->sum('value'),
                        'stage_name' => $group->first()->stage?->name ?? 'Sem estágio',
                    ];
                })
                ->values()
                ->toArray();
            
            return [
                'total_leads' => $leads->count(),
                'stages' => $stageCount,
            ];
        });
        
        return response()->json([
            'data' => $data,
            'period' => $period,
            'generated_at' => now()->toIso8601String(),
            'cache_ttl_seconds' => 300,
        ]);
    }

    /**
     * API para obter insights.
     * 
     * Endpoint: GET /api/bi/integration/insights
     */
    public function insights(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $limit = min($request->get('limit', 10), 50);
        $category = $request->get('category');
        
        $query = BiGeneratedKnowledge::where('tenant_id', $tenantId)
            ->active()
            ->orderByDesc('created_at')
            ->limit($limit);
        
        if ($category) {
            $query->inCategory($category);
        }
        
        $insights = $query->get()->map(function ($insight) {
            return [
                'id' => $insight->id,
                'type' => $insight->knowledge_type,
                'category' => $insight->category,
                'title' => $insight->title,
                'content' => $insight->content,
                'confidence' => $insight->confidence,
                'created_at' => $insight->created_at->toIso8601String(),
            ];
        });
        
        return response()->json([
            'data' => $insights,
            'total' => $insights->count(),
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * API para obter última análise.
     * 
     * Endpoint: GET /api/bi/integration/analysis
     */
    public function latestAnalysis(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $type = $request->get('type', 'daily');
        
        $analysis = BiAnalysis::where('tenant_id', $tenantId)
            ->where('analysis_type', $type)
            ->completed()
            ->latest()
            ->first();
        
        if (!$analysis) {
            return response()->json([
                'data' => null,
                'message' => 'Nenhuma análise encontrada',
            ]);
        }
        
        return response()->json([
            'data' => [
                'id' => $analysis->id,
                'type' => $analysis->analysis_type,
                'focus_area' => $analysis->focus_area,
                'metrics' => $analysis->metrics_snapshot,
                'predictions' => $analysis->predictions,
                'anomalies' => $analysis->anomalies,
                'insights' => $analysis->insights,
                'period' => [
                    'start' => $analysis->period_start->toIso8601String(),
                    'end' => $analysis->period_end->toIso8601String(),
                ],
                'created_at' => $analysis->created_at->toIso8601String(),
            ],
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * API para webhook de eventos.
     * 
     * Endpoint: POST /api/bi/integration/webhook
     * 
     * Permite que sistemas externos enviem eventos para o BI.
     */
    public function webhook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_type' => 'required|string',
            'data' => 'required|array',
            'timestamp' => 'nullable|date',
        ]);
        
        $tenantId = auth()->user()->tenant_id;
        
        // Processa evento
        $eventType = $validated['event_type'];
        $data = $validated['data'];
        
        // Log do evento
        \Log::info("BI Webhook recebido", [
            'tenant_id' => $tenantId,
            'event_type' => $eventType,
            'data' => $data,
        ]);
        
        // TODO: Processar evento baseado no tipo
        // Ex: 'sale_completed', 'campaign_updated', 'support_resolved'
        
        return response()->json([
            'success' => true,
            'message' => 'Evento recebido',
            'event_id' => uniqid('evt_'),
        ]);
    }

    /**
     * Documentação da API.
     * 
     * Endpoint: GET /api/bi/integration/docs
     */
    public function docs(): JsonResponse
    {
        return response()->json([
            'api_version' => '1.0',
            'base_url' => '/api/bi/integration',
            'endpoints' => [
                [
                    'method' => 'GET',
                    'path' => '/kpis',
                    'description' => 'Retorna KPIs principais',
                    'parameters' => [
                        'period' => 'Período (7d, 30d, 90d)',
                    ],
                ],
                [
                    'method' => 'GET',
                    'path' => '/funnel',
                    'description' => 'Retorna dados do funil de vendas',
                    'parameters' => [
                        'period' => 'Período',
                        'pipeline_id' => 'ID do pipeline (opcional)',
                    ],
                ],
                [
                    'method' => 'GET',
                    'path' => '/insights',
                    'description' => 'Retorna insights gerados pelo BI',
                    'parameters' => [
                        'limit' => 'Limite de resultados (max 50)',
                        'category' => 'Categoria (sales, support, marketing)',
                    ],
                ],
                [
                    'method' => 'GET',
                    'path' => '/analysis',
                    'description' => 'Retorna última análise do BI',
                    'parameters' => [
                        'type' => 'Tipo (daily, weekly, monthly)',
                    ],
                ],
                [
                    'method' => 'POST',
                    'path' => '/webhook',
                    'description' => 'Recebe eventos de sistemas externos',
                    'body' => [
                        'event_type' => 'Tipo do evento',
                        'data' => 'Dados do evento',
                        'timestamp' => 'Timestamp (opcional)',
                    ],
                ],
            ],
            'authentication' => 'Bearer Token (API Token do usuário)',
            'rate_limits' => [
                'requests_per_minute' => 60,
                'cache_ttl_seconds' => 300,
            ],
        ]);
    }

    /**
     * Converte período em dias.
     */
    private function parsePeriod(string $period): int
    {
        if (preg_match('/^(\d+)d$/', $period, $matches)) {
            return (int) $matches[1];
        }
        if (preg_match('/^(\d+)w$/', $period, $matches)) {
            return (int) $matches[1] * 7;
        }
        if (preg_match('/^(\d+)m$/', $period, $matches)) {
            return (int) $matches[1] * 30;
        }
        return 30;
    }
}

