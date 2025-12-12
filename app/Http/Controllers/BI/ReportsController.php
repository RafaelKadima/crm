<?php

namespace App\Http\Controllers\BI;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class ReportsController extends Controller
{
    /**
     * Lista tipos de relatórios disponíveis.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'reports' => [
                [
                    'type' => 'executive',
                    'name' => 'Relatório Executivo',
                    'description' => 'Visão geral com KPIs principais, tendências e alertas',
                    'formats' => ['json', 'pdf', 'excel'],
                ],
                [
                    'type' => 'sales',
                    'name' => 'Relatório de Vendas',
                    'description' => 'Análise completa do funil de vendas e conversões',
                    'formats' => ['json', 'pdf', 'excel'],
                ],
                [
                    'type' => 'marketing',
                    'name' => 'Relatório de Marketing',
                    'description' => 'Performance de campanhas, ROAS, CPL e atribuição',
                    'formats' => ['json', 'pdf', 'excel'],
                ],
                [
                    'type' => 'support',
                    'name' => 'Relatório de Atendimento',
                    'description' => 'Métricas de suporte, SLA e satisfação',
                    'formats' => ['json', 'pdf', 'excel'],
                ],
                [
                    'type' => 'ai_performance',
                    'name' => 'Performance da IA',
                    'description' => 'Análise de performance dos agentes IA',
                    'formats' => ['json', 'pdf'],
                ],
            ],
        ]);
    }

    /**
     * Gera relatório executivo.
     */
    public function executive(Request $request): JsonResponse
    {
        return $this->generateReport('executive', $request);
    }

    /**
     * Gera relatório de vendas.
     */
    public function sales(Request $request): JsonResponse
    {
        return $this->generateReport('sales', $request);
    }

    /**
     * Gera relatório de marketing.
     */
    public function marketing(Request $request): JsonResponse
    {
        return $this->generateReport('marketing', $request);
    }

    /**
     * Gera relatório de atendimento.
     */
    public function support(Request $request): JsonResponse
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
                return response()->json([
                    'type' => 'support',
                    'period' => $period,
                    'data' => $response->json()['result'] ?? [],
                    'generated_at' => now()->toIso8601String(),
                ]);
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao gerar relatório de suporte', [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback com dados mock
        return response()->json([
            'type' => 'support',
            'period' => $period,
            'data' => $this->getMockReportData('support'),
            'generated_at' => now()->toIso8601String(),
            'is_mock' => true,
        ]);
    }

    /**
     * Gera relatório de performance da IA.
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
                return response()->json([
                    'type' => 'ai_performance',
                    'period' => $period,
                    'data' => $response->json()['result'] ?? [],
                    'generated_at' => now()->toIso8601String(),
                ]);
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao gerar relatório de IA', [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback com dados mock
        return response()->json([
            'type' => 'ai_performance',
            'period' => $period,
            'data' => [
                'agents' => [
                    ['type' => 'sdr', 'conversations' => rand(50, 200), 'success_rate' => rand(70, 95) . '%'],
                    ['type' => 'ads', 'campaigns_created' => rand(10, 50), 'avg_roas' => round(rand(15, 35) / 10, 1)],
                ],
                'total_interactions' => rand(200, 1000),
                'avg_response_time_ms' => rand(500, 2000),
            ],
            'generated_at' => now()->toIso8601String(),
            'is_mock' => true,
        ]);
    }

    /**
     * Exporta relatório em PDF.
     */
    public function exportPdf(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => 'required|string|in:executive,sales,marketing,support,ai_performance',
            'period' => 'nullable|string',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $period = $validated['period'] ?? '30d';

        try {
            $response = Http::timeout(60)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'export_report_pdf',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'report_type' => $validated['report_type'],
                    'period' => $period,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao exportar PDF', [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback
        return response()->json([
            'message' => 'Exportação em PDF não disponível no momento. Use o formato JSON.',
            'available_formats' => ['json'],
        ]);
    }

    /**
     * Exporta dados em Excel.
     */
    public function exportExcel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'data_type' => 'required|string|in:leads,campaigns,tickets,conversions',
            'period' => 'nullable|string',
            'filters' => 'nullable|array',
        ]);

        $tenantId = auth()->user()->tenant_id;
        $period = $validated['period'] ?? '30d';

        try {
            $response = Http::timeout(60)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'export_report_excel',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'data_type' => $validated['data_type'],
                    'period' => $period,
                    'filters' => $validated['filters'] ?? [],
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao exportar Excel', [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback
        return response()->json([
            'message' => 'Exportação em Excel não disponível no momento. Use o formato JSON.',
            'available_formats' => ['json'],
        ]);
    }

    /**
     * Gera relatório genérico via MCP.
     */
    private function generateReport(string $type, Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        $period = $request->get('period', '30d');
        $format = $request->get('format', 'json');

        $toolName = "generate_{$type}_report";

        try {
            $response = Http::timeout(30)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => $toolName,
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'period' => $period,
                    'format' => $format,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json([
                    'type' => $type,
                    'period' => $period,
                    'format' => $format,
                    'data' => $response->json()['result'] ?? [],
                    'generated_at' => now()->toIso8601String(),
                ]);
            }
        } catch (\Exception $e) {
            \Log::warning("Erro ao gerar relatório {$type}", [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback com dados mock
        return response()->json([
            'type' => $type,
            'period' => $period,
            'format' => $format,
            'data' => $this->getMockReportData($type),
            'generated_at' => now()->toIso8601String(),
            'is_mock' => true,
        ]);
    }
    
    /**
     * Retorna dados mock para relatórios enquanto MCP não está disponível.
     */
    private function getMockReportData(string $type): array
    {
        $baseMetrics = [
            'total_leads' => rand(100, 500),
            'conversion_rate' => round(rand(5, 25) / 100, 2),
            'avg_response_time_hours' => round(rand(1, 24) / 10, 1),
            'revenue' => rand(10000, 100000),
        ];
        
        return match ($type) {
            'executive' => [
                'kpis' => $baseMetrics,
                'highlights' => [
                    ['type' => 'success', 'message' => 'Taxa de conversão acima da média'],
                    ['type' => 'warning', 'message' => 'Tempo de resposta pode ser melhorado'],
                ],
                'recommendations' => [
                    'Considere otimizar o funil de vendas',
                    'Analise os leads que não converteram',
                ],
            ],
            'sales' => [
                'funnel' => [
                    ['stage' => 'Novo', 'count' => rand(50, 150), 'conversion' => 0.8],
                    ['stage' => 'Qualificado', 'count' => rand(30, 100), 'conversion' => 0.6],
                    ['stage' => 'Proposta', 'count' => rand(15, 50), 'conversion' => 0.4],
                    ['stage' => 'Negociação', 'count' => rand(10, 30), 'conversion' => 0.5],
                    ['stage' => 'Fechado', 'count' => rand(5, 20), 'conversion' => 1.0],
                ],
                'metrics' => $baseMetrics,
            ],
            'marketing' => [
                'campaigns' => [
                    ['name' => 'Campanha A', 'spend' => rand(1000, 5000), 'leads' => rand(20, 100), 'roas' => round(rand(10, 40) / 10, 1)],
                    ['name' => 'Campanha B', 'spend' => rand(1000, 5000), 'leads' => rand(20, 100), 'roas' => round(rand(10, 40) / 10, 1)],
                ],
                'channels' => [
                    ['name' => 'Meta Ads', 'leads' => rand(50, 200), 'cpl' => rand(10, 50)],
                    ['name' => 'Google Ads', 'leads' => rand(30, 150), 'cpl' => rand(15, 60)],
                    ['name' => 'Orgânico', 'leads' => rand(20, 100), 'cpl' => 0],
                ],
            ],
            'support' => [
                'tickets' => [
                    'total' => rand(50, 200),
                    'open' => rand(10, 50),
                    'resolved' => rand(40, 150),
                ],
                'avg_response_time' => rand(1, 24) . 'h',
                'satisfaction_score' => round(rand(35, 50) / 10, 1),
                'sla_compliance' => rand(80, 99) . '%',
            ],
            default => $baseMetrics,
        };
    }
}

