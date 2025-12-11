<?php

namespace App\Http\Controllers;

use App\Models\KnowledgeBase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AdsKnowledgeController extends Controller
{
    /**
     * Lista conhecimento de Ads do tenant
     */
    public function index(Request $request): JsonResponse
    {
        $query = KnowledgeBase::where('tenant_id', auth()->user()->tenant_id)
            ->where('context', KnowledgeBase::CONTEXT_ADS)
            ->active();
        
        // Filtro por categoria
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }
        
        // Filtro por source
        if ($request->has('source')) {
            $query->where('source', $request->source);
        }
        
        // Busca textual
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('content', 'ilike', "%{$search}%");
            });
        }
        
        $knowledge = $query->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));
        
        return response()->json($knowledge);
    }
    
    /**
     * Adiciona novo conhecimento
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'required|string|in:rules,best_practices,performance,faq,guidelines',
            'priority' => 'nullable|integer|min:0|max:100',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
        ]);
        
        $tenantId = auth()->user()->tenant_id;
        
        // Gera embedding via AI Service
        $embedding = $this->generateEmbedding($request->title . "\n" . $request->content);
        
        $knowledge = KnowledgeBase::create([
            'tenant_id' => $tenantId,
            'context' => KnowledgeBase::CONTEXT_ADS,
            'category' => $request->category,
            'title' => $request->title,
            'content' => $request->content,
            'summary' => $request->input('summary'),
            'embedding' => $embedding,
            'tags' => $request->input('tags', []),
            'priority' => $request->input('priority', 5),
            'source' => KnowledgeBase::SOURCE_MANUAL,
            'is_active' => true,
            'is_verified' => true, // Manual entries are verified
        ]);
        
        return response()->json([
            'message' => 'Conhecimento adicionado com sucesso',
            'data' => $knowledge,
        ], 201);
    }
    
    /**
     * Exibe detalhes de um conhecimento
     */
    public function show(KnowledgeBase $knowledge): JsonResponse
    {
        $this->authorize('view', $knowledge);
        
        // Incrementa contador de uso
        $knowledge->incrementUsage();
        
        return response()->json($knowledge);
    }
    
    /**
     * Atualiza conhecimento
     */
    public function update(Request $request, KnowledgeBase $knowledge): JsonResponse
    {
        $this->authorize('update', $knowledge);
        
        $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'category' => 'sometimes|string|in:rules,best_practices,performance,faq,guidelines',
            'priority' => 'sometimes|integer|min:0|max:100',
            'tags' => 'sometimes|array',
            'is_active' => 'sometimes|boolean',
        ]);
        
        $data = $request->only(['title', 'content', 'category', 'priority', 'tags', 'is_active']);
        
        // Se mudou título ou conteúdo, regenera embedding
        if ($request->has('title') || $request->has('content')) {
            $title = $request->input('title', $knowledge->title);
            $content = $request->input('content', $knowledge->content);
            $data['embedding'] = $this->generateEmbedding($title . "\n" . $content);
        }
        
        $knowledge->update($data);
        
        return response()->json([
            'message' => 'Conhecimento atualizado com sucesso',
            'data' => $knowledge->fresh(),
        ]);
    }
    
    /**
     * Remove conhecimento (soft delete)
     */
    public function destroy(KnowledgeBase $knowledge): JsonResponse
    {
        $this->authorize('delete', $knowledge);
        
        $knowledge->update(['is_active' => false]);
        
        return response()->json([
            'message' => 'Conhecimento removido com sucesso',
        ]);
    }
    
    /**
     * Lista categorias disponíveis
     */
    public function categories(): JsonResponse
    {
        return response()->json([
            'data' => [
                ['value' => 'rules', 'label' => 'Regras', 'description' => 'Regras obrigatórias para campanhas'],
                ['value' => 'best_practices', 'label' => 'Melhores Práticas', 'description' => 'Práticas recomendadas aprendidas'],
                ['value' => 'performance', 'label' => 'Performance', 'description' => 'Padrões de performance identificados'],
                ['value' => 'faq', 'label' => 'FAQ', 'description' => 'Perguntas frequentes sobre ads'],
                ['value' => 'guidelines', 'label' => 'Diretrizes', 'description' => 'Diretrizes gerais de campanhas'],
            ],
        ]);
    }
    
    /**
     * Busca conhecimento relevante (RAG)
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'query' => 'required|string|max:500',
            'category' => 'nullable|string',
            'top_k' => 'nullable|integer|min:1|max:20',
        ]);
        
        $tenantId = auth()->user()->tenant_id;
        
        try {
            $aiServiceUrl = config('services.ai_agent.url');
            $aiServiceKey = config('services.ai_agent.api_key');
            
            $response = Http::timeout(30)
                ->withHeaders([
                    'X-Internal-Key' => $aiServiceKey,
                ])
                ->post("{$aiServiceUrl}/ads/knowledge/search", [
                    'query' => $request->query,
                    'tenant_id' => $tenantId,
                    'category' => $request->category,
                    'top_k' => $request->input('top_k', 5),
                ]);
            
            if ($response->successful()) {
                return response()->json($response->json());
            }
            
            return response()->json([
                'error' => 'Falha ao buscar conhecimento',
            ], 500);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Serviço de IA indisponível',
                'message' => $e->getMessage(),
            ], 503);
        }
    }
    
    /**
     * Lista padrões aprendidos
     */
    public function patterns(Request $request): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        
        $patterns = KnowledgeBase::where('tenant_id', $tenantId)
            ->where('context', KnowledgeBase::CONTEXT_ADS)
            ->where('category', 'patterns')
            ->active()
            ->orderBy('effectiveness_score', 'desc')
            ->orderBy('usage_count', 'desc')
            ->paginate($request->get('per_page', 10));
        
        return response()->json($patterns);
    }
    
    /**
     * Gera embedding para texto via AI Service
     */
    protected function generateEmbedding(string $text): ?array
    {
        try {
            $aiServiceUrl = config('services.ai_agent.url');
            $aiServiceKey = config('services.ai_agent.api_key');
            
            if (!$aiServiceUrl) {
                return null;
            }
            
            $response = Http::timeout(30)
                ->withHeaders([
                    'X-Internal-Key' => $aiServiceKey,
                ])
                ->post("{$aiServiceUrl}/embeddings", [
                    'text' => $text,
                ]);
            
            if ($response->successful()) {
                return $response->json('embedding');
            }
            
        } catch (\Exception $e) {
            // Silently fail - embedding is optional
        }
        
        return null;
    }
}
