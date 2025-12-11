<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Regras de comportamento do agente por estágio do pipeline.
 * Define o que o agente deve fazer quando o lead está em cada estágio.
 */
class AgentStageRule extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'sdr_agent_id',
        'pipeline_stage_id',
        'trigger_condition',
        'action_template',
        'auto_move_to',
        'notify_human',
        'notification_channel',
        'priority',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'notify_human' => 'boolean',
            'priority' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    // ==================== RELACIONAMENTOS ====================

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function sdrAgent(): BelongsTo
    {
        return $this->belongsTo(SdrAgent::class);
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'pipeline_stage_id');
    }

    public function autoMoveToStage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'auto_move_to');
    }

    // ==================== SCOPES ====================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForStage($query, string $stageId)
    {
        return $query->where('pipeline_stage_id', $stageId);
    }

    public function scopeForAgent($query, string $agentId)
    {
        return $query->where('sdr_agent_id', $agentId);
    }

    public function scopeOrderByPriority($query)
    {
        return $query->orderBy('priority', 'desc');
    }

    // ==================== MÉTODOS ====================

    /**
     * Verifica se a condição de trigger foi atingida
     */
    public function matchesTrigger(string $message): bool
    {
        if (empty($this->trigger_condition)) {
            return false;
        }

        $message = mb_strtolower($message);
        $trigger = mb_strtolower($this->trigger_condition);

        // Verifica se a mensagem contém palavras-chave do trigger
        $keywords = explode(',', $trigger);
        foreach ($keywords as $keyword) {
            $keyword = trim($keyword);
            if (!empty($keyword) && str_contains($message, $keyword)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Retorna as regras formatadas para o prompt do agente
     */
    public function toPromptFormat(): string
    {
        $parts = [];
        
        if ($this->trigger_condition) {
            $parts[] = "Quando: {$this->trigger_condition}";
        }
        
        if ($this->action_template) {
            $parts[] = "Ação: {$this->action_template}";
        }
        
        if ($this->auto_move_to && $this->autoMoveToStage) {
            $parts[] = "Mover para: {$this->autoMoveToStage->name}";
        }
        
        if ($this->notify_human) {
            $parts[] = "⚠️ Notificar humano";
        }

        return implode(' | ', $parts);
    }
}



