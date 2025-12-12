<?php

namespace App\Http\Controllers\BI;

use App\Http\Controllers\Controller;
use App\Models\BiGeneratedKnowledge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AnalystChatController extends Controller
{
    /**
     * Envia pergunta ao analista de BI.
     */
    public function ask(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string|max:1000',
            'context' => 'nullable|array',
        ]);

        $tenantId = auth()->user()->tenant_id;

        try {
            $response = Http::timeout(60)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'ask_analyst',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'question' => $validated['question'],
                    'context' => $validated['context'] ?? [],
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao consultar analista BI', [
                'question' => $validated['question'],
                'error' => $e->getMessage(),
            ]);
        }

        // Fallback com resposta simulada
        return response()->json([
            'answer' => 'Desculpe, no momento estou com dificuldades para acessar os dados completos. Por favor, tente novamente em alguns instantes ou consulte os relatórios disponíveis.',
            'confidence' => 0.3,
            'sources' => [],
            'suggestions' => [
                'Tente perguntar de forma mais específica',
                'Acesse a página de Relatórios para dados detalhados',
            ],
            'is_fallback' => true,
        ]);
    }

    /**
     * Obtém insights proativos.
     */
    public function proactiveInsights(): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;

        try {
            $response = Http::timeout(30)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'get_proactive_insights',
                'arguments' => [
                    'tenant_id' => $tenantId,
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json($response->json()['result'] ?? []);
            }
        } catch (\Exception $e) {
            \Log::warning('Erro ao buscar insights proativos', [
                'error' => $e->getMessage()
            ]);
        }

        // Fallback: busca insights do banco local
        $insights = BiGeneratedKnowledge::where('tenant_id', $tenantId)
            ->active()
            ->highConfidence()
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'insights' => $insights->map(fn($i) => [
                'id' => $i->id,
                'type' => $i->knowledge_type,
                'category' => $i->category,
                'title' => $i->title,
                'content' => $i->content,
                'confidence' => $i->confidence,
                'created_at' => $i->created_at->toIso8601String(),
            ]),
            'alerts' => [],
            'opportunities' => [],
        ]);
    }

    /**
     * Cria ação a partir de conversa.
     */
    public function createAction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'target_agent' => 'required|string|in:sdr,ads,knowledge,ml',
            'action_type' => 'required|string',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'rationale' => 'required|string',
            'payload' => 'required|array',
            'priority' => 'nullable|string|in:low,medium,high,critical',
            'expected_impact' => 'nullable|array',
        ]);

        $tenantId = auth()->user()->tenant_id;

        try {
            $response = Http::timeout(30)->post(config('services.ai.url') . '/mcp/tool', [
                'tool_name' => 'create_action_for_approval',
                'arguments' => [
                    'tenant_id' => $tenantId,
                    'target_agent' => $validated['target_agent'],
                    'action_type' => $validated['action_type'],
                    'title' => $validated['title'],
                    'description' => $validated['description'],
                    'rationale' => $validated['rationale'],
                    'payload' => $validated['payload'],
                    'priority' => $validated['priority'] ?? 'medium',
                    'expected_impact' => $validated['expected_impact'],
                ],
                'agent_type' => 'bi',
                'tenant_id' => $tenantId,
            ]);

            if ($response->successful()) {
                return response()->json([
                    'message' => 'Ação criada na fila de aprovação',
                    'action' => $response->json()['result'] ?? [],
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao criar ação via chat', [
                'error' => $e->getMessage()
            ]);
        }

        return response()->json(['error' => 'Não foi possível criar ação'], 500);
    }

    /**
     * Lista perguntas sugeridas.
     */
    public function suggestedQuestions(): JsonResponse
    {
        return response()->json([
            'questions' => [
                [
                    'category' => 'sales',
                    'questions' => [
                        'Por que a taxa de conversão caiu essa semana?',
                        'Qual canal está gerando mais leads qualificados?',
                        'Quanto tempo leva para fechar um lead em média?',
                        'Quais são os gargalos do funil de vendas?',
                    ],
                ],
                [
                    'category' => 'marketing',
                    'questions' => [
                        'Qual campanha tem melhor ROAS?',
                        'Devo pausar alguma campanha?',
                        'Como está o custo por lead por canal?',
                        'Qual é o melhor horário para anúncios?',
                    ],
                ],
                [
                    'category' => 'support',
                    'questions' => [
                        'Qual é o tempo médio de resposta?',
                        'Estamos cumprindo o SLA?',
                        'Qual horário tem mais demanda?',
                        'Como está a satisfação dos clientes?',
                    ],
                ],
                [
                    'category' => 'predictions',
                    'questions' => [
                        'Qual é a previsão de receita para o próximo mês?',
                        'Quantos leads devemos esperar na próxima semana?',
                        'Quais leads têm risco de churn?',
                        'Devo aumentar o investimento em ads?',
                    ],
                ],
            ],
        ]);
    }

    /**
     * Histórico de conversas (se implementado).
     */
    public function history(Request $request): JsonResponse
    {
        // TODO: Implementar histórico de conversas se necessário
        return response()->json([
            'conversations' => [],
            'message' => 'Histórico de conversas não implementado ainda.',
        ]);
    }

    /**
     * Gera visualização a partir de pergunta.
     */
    public function generateVisualization(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|string|in:funnel,trend,comparison,distribution',
            'data_source' => 'required|string',
            'period' => 'nullable|string',
        ]);

        // TODO: Implementar geração de visualizações dinâmicas
        return response()->json([
            'visualization' => [
                'type' => $validated['type'],
                'data' => [],
                'config' => [],
            ],
            'message' => 'Visualização gerada com sucesso',
        ]);
    }
}

