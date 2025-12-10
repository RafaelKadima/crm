<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessKnowledgeEmbedding;
use App\Jobs\ProcessSdrDocument;
use App\Models\SdrAgent;
use App\Models\SdrDocument;
use App\Models\SdrFaq;
use App\Models\SdrKnowledgeEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SdrAgentController extends Controller
{
    /**
     * Lista agentes SDR do tenant.
     */
    public function index(Request $request): JsonResponse
    {
        $agents = SdrAgent::with(['channel', 'documents' => fn($q) => $q->where('is_active', true)])
            ->withCount(['documents', 'faqs', 'interactions'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $agents,
        ]);
    }

    /**
     * Cria um novo agente SDR.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'description' => 'nullable|string',
            'system_prompt' => 'required|string',
            'personality' => 'nullable|string',
            'objectives' => 'nullable|string',
            'restrictions' => 'nullable|string',
            'knowledge_instructions' => 'nullable|string',
            'language' => 'nullable|string|max:10',
            'tone' => 'nullable|string|in:professional,friendly,formal,casual',
            'webhook_url' => 'nullable|url',
            'ai_model' => 'nullable|string|max:50',
            'temperature' => 'nullable|numeric|min:0|max:2',
        ]);

        $validated['tenant_id'] = auth()->user()->tenant_id;

        $agent = SdrAgent::create($validated);

        // Se tiver canal, atualiza o canal para usar este agente
        if ($agent->channel_id) {
            $agent->channel->update([
                'ia_workflow_id' => $agent->webhook_url,
            ]);
        }

        return response()->json([
            'message' => 'Agente SDR criado com sucesso.',
            'agent' => $agent->load('channel'),
        ], 201);
    }

    /**
     * Exibe um agente SDR.
     */
    public function show(SdrAgent $sdrAgent): JsonResponse
    {
        $sdrAgent->load([
            'channel',
            'pipelines.stages',
            'documents' => fn($q) => $q->orderBy('created_at', 'desc'),
            'faqs' => fn($q) => $q->orderBy('priority', 'desc'),
        ]);
        
        $sdrAgent->loadCount('interactions');

        // Estatísticas
        $stats = [
            'total_interactions' => $sdrAgent->interactions()->count(),
            'interactions_today' => $sdrAgent->interactions()->whereDate('created_at', today())->count(),
            'avg_response_time' => $sdrAgent->interactions()->avg('response_time_ms'),
            'positive_feedback' => $sdrAgent->interactions()->where('feedback', 'positive')->count(),
            'negative_feedback' => $sdrAgent->interactions()->where('feedback', 'negative')->count(),
        ];

        // Inclui os estágios disponíveis com regras
        $availableStages = $sdrAgent->getAvailableStages();

        return response()->json([
            'agent' => $sdrAgent,
            'stats' => $stats,
            'available_stages' => $availableStages,
        ]);
    }

    /**
     * Atualiza um agente SDR.
     */
    public function update(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'channel_id' => 'nullable|uuid|exists:channels,id',
            'description' => 'nullable|string',
            'system_prompt' => 'sometimes|string',
            'personality' => 'nullable|string',
            'objectives' => 'nullable|string',
            'restrictions' => 'nullable|string',
            'knowledge_instructions' => 'nullable|string',
            'pipeline_instructions' => 'nullable|string',
            'stage_rules' => 'nullable|array',
            'can_move_leads' => 'nullable|boolean',
            'language' => 'nullable|string|max:10',
            'tone' => 'nullable|string|in:professional,friendly,formal,casual',
            'webhook_url' => 'nullable|url',
            'ai_model' => 'nullable|string|max:50',
            'temperature' => 'nullable|numeric|min:0|max:2',
            'is_active' => 'sometimes|boolean',
        ]);

        $sdrAgent->update($validated);

        return response()->json([
            'message' => 'Agente SDR atualizado com sucesso.',
            'agent' => $sdrAgent->load(['channel', 'pipelines.stages']),
        ]);
    }

    /**
     * Remove um agente SDR.
     */
    public function destroy(SdrAgent $sdrAgent): JsonResponse
    {
        // Remove documentos do storage
        foreach ($sdrAgent->documents as $document) {
            Storage::delete($document->file_path);
        }

        $sdrAgent->delete();

        return response()->json([
            'message' => 'Agente SDR excluído com sucesso.',
        ]);
    }

    /**
     * Ativa/desativa um agente SDR.
     */
    public function toggleActive(SdrAgent $sdrAgent): JsonResponse
    {
        $sdrAgent->update(['is_active' => !$sdrAgent->is_active]);

        return response()->json([
            'message' => $sdrAgent->is_active ? 'Agente ativado.' : 'Agente desativado.',
            'agent' => $sdrAgent,
        ]);
    }

    // =========================================================================
    // PIPELINES
    // =========================================================================

    /**
     * Lista pipelines associados ao agente.
     */
    public function listPipelines(SdrAgent $sdrAgent): JsonResponse
    {
        $pipelines = $sdrAgent->pipelines()->with('stages')->get();
        
        // Adiciona as regras de cada estágio
        $pipelines = $pipelines->map(function ($pipeline) use ($sdrAgent) {
            $pipeline->stages_with_rules = $pipeline->stages->map(function ($stage) use ($sdrAgent) {
                $rule = $sdrAgent->stage_rules[$stage->id] ?? null;
                return [
                    'id' => $stage->id,
                    'name' => $stage->name,
                    'color' => $stage->color,
                    'order' => $stage->order,
                    'trigger' => $rule['trigger'] ?? '',
                    'action' => $rule['action'] ?? '',
                ];
            });
            return $pipeline;
        });

        return response()->json([
            'data' => $pipelines,
        ]);
    }

    /**
     * Associa pipelines ao agente.
     */
    public function syncPipelines(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'pipeline_ids' => 'required|array',
            'pipeline_ids.*' => 'uuid|exists:pipelines,id',
            'primary_pipeline_id' => 'nullable|uuid|exists:pipelines,id',
        ]);

        $tenantId = auth()->user()->tenant_id;

        // Prepara dados do pivot
        $syncData = [];
        foreach ($validated['pipeline_ids'] as $pipelineId) {
            $syncData[$pipelineId] = [
                'id' => Str::uuid(),
                'tenant_id' => $tenantId,
                'is_primary' => $pipelineId === ($validated['primary_pipeline_id'] ?? $validated['pipeline_ids'][0]),
            ];
        }

        $sdrAgent->pipelines()->sync($syncData);

        return response()->json([
            'message' => 'Pipelines atualizados com sucesso.',
            'pipelines' => $sdrAgent->pipelines()->with('stages')->get(),
        ]);
    }

    /**
     * Atualiza as regras de estágios do agente.
     */
    public function updateStageRules(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'stage_rules' => 'required|array',
            'stage_rules.*.stage_id' => 'required|uuid',
            'stage_rules.*.trigger' => 'nullable|string|max:500',
            'stage_rules.*.action' => 'nullable|string|max:500',
        ]);

        $rules = [];
        foreach ($validated['stage_rules'] as $rule) {
            $rules[$rule['stage_id']] = [
                'trigger' => $rule['trigger'] ?? '',
                'action' => $rule['action'] ?? '',
            ];
        }

        $sdrAgent->update(['stage_rules' => $rules]);

        return response()->json([
            'message' => 'Regras de estágios atualizadas.',
            'stage_rules' => $rules,
        ]);
    }

    /**
     * Atualiza as instruções de pipeline.
     */
    public function updatePipelineInstructions(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'pipeline_instructions' => 'nullable|string',
            'can_move_leads' => 'nullable|boolean',
        ]);

        $sdrAgent->update($validated);

        return response()->json([
            'message' => 'Instruções de pipeline atualizadas.',
            'agent' => $sdrAgent,
        ]);
    }

    // =========================================================================
    // DOCUMENTOS
    // =========================================================================

    /**
     * Lista documentos de um agente.
     */
    public function listDocuments(SdrAgent $sdrAgent): JsonResponse
    {
        $documents = $sdrAgent->documents()
            ->with('uploader:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $documents,
        ]);
    }

    /**
     * Upload de documento.
     */
    public function uploadDocument(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,txt,doc,docx,md|max:10240', // 10MB max
            'name' => 'nullable|string|max:255',
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        
        // Gera nome único
        $fileName = Str::uuid() . '.' . $extension;
        $path = $file->storeAs("sdr-documents/{$sdrAgent->id}", $fileName);

        $document = SdrDocument::create([
            'sdr_agent_id' => $sdrAgent->id,
            'uploaded_by' => auth()->id(),
            'name' => $validated['name'] ?? pathinfo($originalName, PATHINFO_FILENAME),
            'original_filename' => $originalName,
            'file_path' => $path,
            'file_type' => $extension,
            'file_size' => $file->getSize(),
            'status' => 'pending',
        ]);

        // Dispara job para processar o documento
        ProcessSdrDocument::dispatch($document);

        return response()->json([
            'message' => 'Documento enviado. Processamento iniciado.',
            'document' => $document,
        ], 201);
    }

    /**
     * Remove um documento.
     */
    public function deleteDocument(SdrAgent $sdrAgent, SdrDocument $document): JsonResponse
    {
        if ($document->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'Documento não pertence a este agente.'], 403);
        }

        Storage::delete($document->file_path);
        $document->delete();

        return response()->json([
            'message' => 'Documento excluído com sucesso.',
        ]);
    }

    /**
     * Reprocessa um documento.
     */
    public function reprocessDocument(SdrAgent $sdrAgent, SdrDocument $document): JsonResponse
    {
        if ($document->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'Documento não pertence a este agente.'], 403);
        }

        $document->update([
            'status' => 'pending',
            'error_message' => null,
        ]);

        ProcessSdrDocument::dispatch($document);

        return response()->json([
            'message' => 'Reprocessamento iniciado.',
            'document' => $document,
        ]);
    }

    // =========================================================================
    // FAQs
    // =========================================================================

    /**
     * Lista FAQs de um agente.
     */
    public function listFaqs(SdrAgent $sdrAgent): JsonResponse
    {
        $faqs = $sdrAgent->faqs()
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $faqs,
        ]);
    }

    /**
     * Cria uma FAQ.
     */
    public function storeFaq(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string|max:500',
            'answer' => 'required|string',
            'keywords' => 'nullable|array',
            'keywords.*' => 'string|max:50',
            'priority' => 'nullable|integer|min:0|max:100',
        ]);

        $validated['sdr_agent_id'] = $sdrAgent->id;

        $faq = SdrFaq::create($validated);

        // Dispara job para gerar embedding
        $embeddingJob = ProcessKnowledgeEmbedding::forFaq($faq);
        dispatch($embeddingJob);

        return response()->json([
            'message' => 'FAQ criada com sucesso. Embedding sendo processado.',
            'faq' => $faq,
        ], 201);
    }

    /**
     * Atualiza uma FAQ.
     */
    public function updateFaq(Request $request, SdrAgent $sdrAgent, SdrFaq $faq): JsonResponse
    {
        if ($faq->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'FAQ não pertence a este agente.'], 403);
        }

        $validated = $request->validate([
            'question' => 'sometimes|string|max:500',
            'answer' => 'sometimes|string',
            'keywords' => 'nullable|array',
            'keywords.*' => 'string|max:50',
            'priority' => 'nullable|integer|min:0|max:100',
            'is_active' => 'sometimes|boolean',
        ]);

        $faq->update($validated);

        // Reagenda embedding se pergunta ou resposta foram alteradas
        if (isset($validated['question']) || isset($validated['answer'])) {
            $embeddingJob = ProcessKnowledgeEmbedding::forFaq($faq->fresh());
            dispatch($embeddingJob);
        }

        return response()->json([
            'message' => 'FAQ atualizada com sucesso.',
            'faq' => $faq,
        ]);
    }

    /**
     * Remove uma FAQ.
     */
    public function deleteFaq(SdrAgent $sdrAgent, SdrFaq $faq): JsonResponse
    {
        if ($faq->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'FAQ não pertence a este agente.'], 403);
        }

        $faq->delete();

        return response()->json([
            'message' => 'FAQ excluída com sucesso.',
        ]);
    }

    // =========================================================================
    // KNOWLEDGE ENTRIES (Texto)
    // =========================================================================

    /**
     * Lista entradas de conhecimento.
     */
    public function listKnowledge(SdrAgent $sdrAgent): JsonResponse
    {
        $entries = $sdrAgent->knowledgeEntries()
            ->orderBy('category')
            ->orderBy('title')
            ->get();

        // Agrupa por categoria
        $grouped = $entries->groupBy('category');

        return response()->json([
            'data' => $entries,
            'grouped' => $grouped,
            'categories' => $entries->pluck('category')->unique()->filter()->values(),
        ]);
    }

    /**
     * Cria entrada de conhecimento.
     */
    public function storeKnowledge(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
        ]);

        $validated['sdr_agent_id'] = $sdrAgent->id;

        $entry = SdrKnowledgeEntry::create($validated);

        // Dispara job para gerar embedding
        $embeddingJob = ProcessKnowledgeEmbedding::forKnowledge($entry);
        dispatch($embeddingJob);

        return response()->json([
            'message' => 'Conhecimento adicionado com sucesso. Embedding sendo processado.',
            'entry' => $entry,
        ], 201);
    }

    /**
     * Atualiza entrada de conhecimento.
     */
    public function updateKnowledge(Request $request, SdrAgent $sdrAgent, SdrKnowledgeEntry $entry): JsonResponse
    {
        if ($entry->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'Entrada não pertence a este agente.'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'category' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        $entry->update($validated);

        // Reagenda embedding se título ou conteúdo foram alterados
        if (isset($validated['title']) || isset($validated['content'])) {
            $embeddingJob = ProcessKnowledgeEmbedding::forKnowledge($entry->fresh());
            dispatch($embeddingJob);
        }

        return response()->json([
            'message' => 'Conhecimento atualizado com sucesso.',
            'entry' => $entry,
        ]);
    }

    /**
     * Remove entrada de conhecimento.
     */
    public function deleteKnowledge(SdrAgent $sdrAgent, SdrKnowledgeEntry $entry): JsonResponse
    {
        if ($entry->sdr_agent_id !== $sdrAgent->id) {
            return response()->json(['message' => 'Entrada não pertence a este agente.'], 403);
        }

        $entry->delete();

        return response()->json([
            'message' => 'Conhecimento removido com sucesso.',
        ]);
    }

    // =========================================================================
    // TESTES E PREVIEW
    // =========================================================================

    /**
     * Testa o prompt do agente.
     */
    public function testPrompt(Request $request, SdrAgent $sdrAgent): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $fullPrompt = $sdrAgent->buildFullPrompt();
        $knowledge = $sdrAgent->getKnowledgeContext();

        return response()->json([
            'prompt' => $fullPrompt,
            'knowledge' => $knowledge,
            'test_message' => $validated['message'],
            'agent_config' => [
                'model' => $sdrAgent->ai_model,
                'temperature' => $sdrAgent->temperature,
                'language' => $sdrAgent->language,
            ],
        ]);
    }

    /**
     * Retorna o payload que seria enviado ao n8n.
     */
    public function previewWebhookPayload(SdrAgent $sdrAgent): JsonResponse
    {
        $fullPrompt = $sdrAgent->buildFullPrompt();
        $knowledge = $sdrAgent->getKnowledgeContext();

        $payload = [
            'agent' => [
                'id' => $sdrAgent->id,
                'name' => $sdrAgent->name,
                'model' => $sdrAgent->ai_model,
                'temperature' => $sdrAgent->temperature,
            ],
            'prompt' => $fullPrompt,
            'knowledge' => $knowledge,
            'faqs_count' => count($knowledge['faqs'] ?? []),
            'documents_count' => count($knowledge['documents'] ?? []),
        ];

        return response()->json($payload);
    }
}

