<?php

namespace App\Http\Controllers\BI;

use App\Http\Controllers\Controller;
use App\Models\BiAnalysis;
use App\Models\BiSuggestedAction;
use App\Models\BiGeneratedKnowledge;
use App\Models\BiAgentConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class BIDashboardController extends Controller
{
    /**
     * Dashboard principal do BI.
     * 
     * Retorna resumo executivo com KPIs e insights.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');

        // Busca última análise
        $lastAnalysis = BiAnalysis::where('tenant_id', $tenantId)
            ->completed()
            ->latest()
            ->first();

        // Conta ações pendentes
        $pendingActions = BiSuggestedAction::where('tenant_id', $tenantId)
            ->pending()
            ->notExpired()
            ->count();

        // Busca KPIs do MCP
        $kpis = $this->fetchKPIsFromMCP($tenantId, $period);

        return response()->json([
            'last_analysis' => $lastAnalysis?->getSummary(),
            'pending_actions' => $pendingActions,
            'kpis' => $kpis,
            'config' => BiAgentConfig::getOrCreate($tenantId),
        ]);
    }

    /**
     * Resumo executivo detalhado.
     */
    public function executiveSummary(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');

        try {
            $response = Http::timeout(30)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'get_executive_summary',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'period' => $period,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao buscar resumo executivo via MCP', [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback com dados locais
        return response()->json($this->getLocalExecutiveSummary($tenantId, $period));
    }

    /**
     * Análise do funil de vendas.
     */
    public function salesFunnel(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');
        $pipelineId = $request->get('pipeline_id');

        try {
            $response = Http::timeout(30)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'analyze_sales_funnel',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'period' => $period,
                    'pipeline_id' => $pipelineId,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao buscar análise de funil via MCP', [
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['error' => 'Não foi possível gerar análise'], 500);
    }

    /**
     * Análise de métricas de suporte.
     */
    public function supportMetrics(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');

        try {
            $response = Http::timeout(30)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'analyze_support_metrics',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'period' => $period,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao buscar métricas de suporte via MCP', [
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['error' => 'Não foi possível gerar análise'], 500);
    }

    /**
     * Análise de marketing.
     */
    public function marketingAnalysis(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');

        try {
            $response = Http::timeout(30)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'analyze_marketing_performance',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'period' => $period,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao buscar análise de marketing via MCP', [
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['error' => 'Não foi possível gerar análise'], 500);
    }

    /**
     * Performance da IA.
     */
    public function aiPerformance(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');

        try {
            $response = Http::timeout(30)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'generate_ai_performance_report',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'period' => $period,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao buscar performance IA via MCP', [
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['error' => 'Não foi possível gerar análise'], 500);
    }

    /**
     * Histórico de análises.
     */
    public function analysisHistory(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        
        $analyses = BiAnalysis::where('tenant_id', $tenantId)
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 20));

        return response()->json($analyses);
    }

    /**
     * Detalhes de uma análise específica.
     */
    public function analysisDetails(string $id): JsonResponse
    {
        $analysis = BiAnalysis::where('tenant_id', auth()->user()->tenant_id)
            ->with(['suggestedActions', 'generatedKnowledge'])
            ->findOrFail($id);

        return response()->json($analysis);
    }

    /**
     * Executa análise sob demanda.
     */
    public function runAnalysis(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'focus_area' => 'nullable|string|in:sales,support,marketing,financial,global',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $focusArea = $validated['focus_area'] ?? 'global';

        try {
            $response = Http::timeout(120)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'run_daily_analysis',
                'arguments' => [
                    'tenant_id' => $tenantId,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json([
                    'message' => 'Análise iniciada com sucesso',
                    'result' => $response->json()['result'] ?? [],
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao executar análise BI', [
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['error' => 'Não foi possível executar análise'], 500);
    }

    /**
     * Configurações do BI Agent.
     */
    public function getConfig(): JsonResponse
    {
        $config = BiAgentConfig::getOrCreate(auth()->user()->tenant_id);
        return response()->json($config);
    }

    /**
     * Atualiza configurações do BI Agent.
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'auto_analysis_enabled' => 'nullable|boolean',
            'analysis_frequency' => 'nullable|string|in:daily,weekly,monthly',
            'preferred_analysis_time' => 'nullable|date_format:H:i:s',
            'auto_add_to_rag' => 'nullable|boolean',
            'auto_prepare_training' => 'nullable|boolean',
            'notification_settings' => 'nullable|array',
            'focus_areas' => 'nullable|array',
            'thresholds' => 'nullable|array',
        ]);

        $config = BiAgentConfig::getOrCreate(auth()->user()->tenant_id);
        $config->update($validated);

        return response()->json([
            'message' => 'Configurações atualizadas',
            'config' => $config,
        ]);
    }

    /**
     * Busca KPIs via MCP.
     */
    private function fetchKPIsFromMCP(string $tenantId, string $period): array
    {
        try {
            $response = Http::timeout(15)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'get_executive_summary',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'period' => $period,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return $response->json()['result']['kpis'] ?? [];
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao buscar KPIs via MCP', [
                'error' => $e->getMessage()
            ]);
        }

        return [];
    }

    /**
     * Retorna resumo executivo com dados locais.
     */
    private function getLocalExecutiveSummary(string $tenantId, string $period): array
    {
        // Fallback com dados do banco local
        $lastAnalysis = BiAnalysis::where('tenant_id', $tenantId)
            ->completed()
            ->latest()
            ->first();

        return [
            'kpis' => $lastAnalysis?->metrics_snapshot ?? [],
            'predictions' => $lastAnalysis?->predictions ?? [],
            'insights' => $lastAnalysis?->insights ?? [],
            'last_updated' => $lastAnalysis?->created_at?->toIso8601String(),
        ];
    }
}

