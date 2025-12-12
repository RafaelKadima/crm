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

        return response()->json(['error' => 'Não foi possível gerar relatório'], 500);
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

        return response()->json(['error' => 'Não foi possível gerar relatório'], 500);
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

        return response()->json(['error' => 'Não foi possível exportar PDF'], 500);
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

        return response()->json(['error' => 'Não foi possível exportar Excel'], 500);
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

        return response()->json(['error' => 'Não foi possível gerar relatório'], 500);
    }
}

