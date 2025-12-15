<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SdrAgent extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'channel_id',
        'name',
        'type', // sdr, support
        'avatar',
        'description',
        'system_prompt',
        'personality',
        'objectives',
        'restrictions',
        'knowledge_instructions',
        'pipeline_instructions',
        'stage_rules',
        'can_move_leads',
        'settings',
        'language',
        'tone',
        'webhook_url',
        'ai_model',
        'temperature',
        'is_active',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'stage_rules' => 'array',
            'temperature' => 'decimal:2',
            'is_active' => 'boolean',
            'can_move_leads' => 'boolean',
            'last_used_at' => 'datetime',
        ];
    }

    /**
     * Tenant do agente
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Canal associado (opcional)
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    /**
     * Pipelines associados ao agente
     */
    public function pipelines(): BelongsToMany
    {
        return $this->belongsToMany(Pipeline::class, 'sdr_agent_pipeline')
            ->withPivot(['is_primary'])
            ->withTimestamps();
    }

    /**
     * Pipeline principal do agente
     */
    public function primaryPipeline(): ?Pipeline
    {
        return $this->pipelines()->wherePivot('is_primary', true)->first()
            ?? $this->pipelines()->first();
    }

    /**
     * Verifica se o agente está associado a um pipeline específico
     */
    public function hasAccessToPipeline(string $pipelineId): bool
    {
        return $this->pipelines()->where('pipelines.id', $pipelineId)->exists();
    }

    /**
     * Documentos da base de conhecimento
     */
    public function documents(): HasMany
    {
        return $this->hasMany(SdrDocument::class);
    }

    /**
     * FAQs do agente
     */
    public function faqs(): HasMany
    {
        return $this->hasMany(SdrFaq::class);
    }

    /**
     * Entradas de conhecimento (texto)
     */
    public function knowledgeEntries(): HasMany
    {
        return $this->hasMany(SdrKnowledgeEntry::class);
    }

    /**
     * Interações do agente
     */
    public function interactions(): HasMany
    {
        return $this->hasMany(SdrInteraction::class);
    }

    /**
     * Regras de estágio do agente
     */
    public function stageRules(): HasMany
    {
        return $this->hasMany(AgentStageRule::class);
    }

    /**
     * Regras de escalação do agente
     */
    public function escalationRules(): HasMany
    {
        return $this->hasMany(AgentEscalationRule::class);
    }

    /**
     * Logs de ações do agente
     */
    public function actionLogs(): HasMany
    {
        return $this->hasMany(AgentActionLog::class);
    }

    /**
     * Knowledge entries ativos
     */
    public function activeKnowledgeEntries(): HasMany
    {
        return $this->knowledgeEntries()->where('is_active', true);
    }

    /**
     * Documentos ativos
     */
    public function activeDocuments(): HasMany
    {
        return $this->documents()->where('is_active', true)->where('status', 'completed');
    }

    /**
     * FAQs ativos
     */
    public function activeFaqs(): HasMany
    {
        return $this->faqs()->where('is_active', true)->orderBy('priority', 'desc');
    }

    /**
     * Gera o prompt completo do agente
     */
    public function buildFullPrompt(?Pipeline $pipeline = null): string
    {
        $parts = [];

        // System prompt base
        $parts[] = $this->system_prompt;

        // Personalidade
        if ($this->personality) {
            $parts[] = "\n\n## Personalidade\n" . $this->personality;
        }

        // Objetivos
        if ($this->objectives) {
            $parts[] = "\n\n## Objetivos\n" . $this->objectives;
        }

        // Restrições
        if ($this->restrictions) {
            $parts[] = "\n\n## Restrições\n" . $this->restrictions;
        }

        // Instruções de conhecimento
        if ($this->knowledge_instructions) {
            $parts[] = "\n\n## Uso da Base de Conhecimento\n" . $this->knowledge_instructions;
        }

        // Instruções de Pipeline
        $pipelinePrompt = $this->buildPipelinePrompt($pipeline);
        if ($pipelinePrompt) {
            $parts[] = $pipelinePrompt;
        }

        return implode('', $parts);
    }

    /**
     * Constrói as instruções de pipeline para o prompt
     */
    public function buildPipelinePrompt(?Pipeline $pipeline = null): string
    {
        // Usa o pipeline fornecido ou o pipeline principal do agente
        $pipeline = $pipeline ?? $this->primaryPipeline();

        if (!$pipeline || !$this->can_move_leads) {
            return '';
        }

        $parts = [];
        $parts[] = "\n\n## Gerenciamento do Pipeline de Vendas";

        // Instruções gerais de pipeline
        if ($this->pipeline_instructions) {
            $parts[] = "\n\n### Instruções Gerais\n" . $this->pipeline_instructions;
        }

        // Lista os estágios do pipeline
        $stages = $pipeline->stages()->orderBy('order')->get();
        if ($stages->isNotEmpty()) {
            $parts[] = "\n\n### Estágios do Pipeline \"" . $pipeline->name . "\"";
            $parts[] = "\nVocê pode mover leads entre os seguintes estágios:";

            foreach ($stages as $stage) {
                $parts[] = "\n- **{$stage->name}** (ID: {$stage->id})";

                // Adiciona regras específicas do estágio se configuradas
                if ($this->stage_rules && isset($this->stage_rules[$stage->id])) {
                    $rule = $this->stage_rules[$stage->id];
                    if (!empty($rule['trigger'])) {
                        $parts[] = "\n  - Quando mover para cá: {$rule['trigger']}";
                    }
                    if (!empty($rule['action'])) {
                        $parts[] = "\n  - Ação esperada: {$rule['action']}";
                    }
                }
            }
        }

        // Instruções de como usar a função de mover leads
        $parts[] = "\n\n### Como Mover Leads";
        $parts[] = "\nQuando identificar que o lead deve ser movido para outro estágio, use a função `update_lead_stage` com:";
        $parts[] = "\n- `stage_id`: ID do estágio de destino";
        $parts[] = "\n- `reason`: Motivo da movimentação";
        $parts[] = "\n\nSempre informe o cliente sobre o progresso e próximos passos após mover o lead.";

        return implode('', $parts);
    }

    /**
     * Retorna os estágios disponíveis para o agente mover leads
     */
    public function getAvailableStages(?string $pipelineId = null): array
    {
        $pipeline = $pipelineId
            ? $this->pipelines()->find($pipelineId)
            : $this->primaryPipeline();

        if (!$pipeline) {
            return [];
        }

        return $pipeline->stages()
            ->orderBy('order')
            ->get()
            ->map(function ($stage) {
                $rule = $this->stage_rules[$stage->id] ?? null;
                return [
                    'id' => $stage->id,
                    'name' => $stage->name,
                    'color' => $stage->color,
                    'order' => $stage->order,
                    'trigger' => $rule['trigger'] ?? null,
                    'action' => $rule['action'] ?? null,
                ];
            })
            ->toArray();
    }

    /**
     * Retorna o contexto RAG (conhecimento + documentos + FAQs)
     */
    public function getKnowledgeContext(): array
    {
        $context = [];

        // Adiciona entradas de conhecimento (texto)
        $entries = $this->activeKnowledgeEntries()->get();
        if ($entries->isNotEmpty()) {
            $context['knowledge'] = $entries->map(fn($entry) => [
                'title' => $entry->title,
                'category' => $entry->category,
                'content' => $entry->content,
            ])->toArray();
        }

        // Adiciona FAQs
        $faqs = $this->activeFaqs()->get();
        if ($faqs->isNotEmpty()) {
            $context['faqs'] = $faqs->map(fn($faq) => [
                'question' => $faq->question,
                'answer' => $faq->answer,
            ])->toArray();
        }

        // Adiciona conteúdo dos documentos
        $documents = $this->activeDocuments()->get();
        if ($documents->isNotEmpty()) {
            $context['documents'] = $documents->map(fn($doc) => [
                'name' => $doc->name,
                'content' => $doc->content,
            ])->toArray();
        }

        return $context;
    }

    /**
     * Marca o agente como usado
     */
    public function markAsUsed(): void
    {
        $this->update(['last_used_at' => now()]);
    }

    /**
     * Scope: Ativos
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

