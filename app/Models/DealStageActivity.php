<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DealStageActivity extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'lead_id',
        'stage_id',
        'stage_activity_template_id',
        'status',
        'due_at',
        'completed_at',
        'completed_by',
        'points_earned',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
            'points_earned' => 'integer',
        ];
    }

    /**
     * Lead (Deal) desta atividade.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Estágio desta atividade.
     */
    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'stage_id');
    }

    /**
     * Template da atividade.
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(StageActivityTemplate::class, 'stage_activity_template_id');
    }

    /**
     * Usuário que completou a atividade.
     */
    public function completedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'completed_by');
    }

    /**
     * Verifica se a atividade está pendente.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Verifica se a atividade foi completada.
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Verifica se a atividade foi pulada.
     */
    public function isSkipped(): bool
    {
        return $this->status === 'skipped';
    }

    /**
     * Verifica se a atividade é obrigatória.
     */
    public function isRequired(): bool
    {
        return $this->template?->is_required ?? false;
    }

    /**
     * Verifica se está atrasada.
     */
    public function isOverdue(): bool
    {
        return $this->isPending() && $this->due_at && $this->due_at->isPast();
    }

    /**
     * Marca a atividade como completada.
     */
    public function markCompleted(User $user): void
    {
        $points = $this->template?->points ?? 0;

        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
            'completed_by' => $user->id,
            'points_earned' => $points,
        ]);
    }

    /**
     * Marca a atividade como pulada.
     */
    public function markSkipped(): void
    {
        $this->update([
            'status' => 'skipped',
            'completed_at' => now(),
            'points_earned' => 0,
        ]);
    }

    /**
     * Scope para atividades pendentes.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope para atividades completadas.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope para atividades de um lead em um estágio.
     */
    public function scopeForLeadStage($query, string $leadId, string $stageId)
    {
        return $query->where('lead_id', $leadId)->where('stage_id', $stageId);
    }

    /**
     * Scope para atividades obrigatórias pendentes.
     */
    public function scopeRequiredPending($query)
    {
        return $query->pending()
            ->whereHas('template', function ($q) {
                $q->where('is_required', true);
            });
    }

    /**
     * Scope para atividades atrasadas.
     */
    public function scopeOverdue($query)
    {
        return $query->pending()
            ->whereNotNull('due_at')
            ->where('due_at', '<', now());
    }

    /**
     * Scope para atividades que vencem hoje.
     */
    public function scopeDueToday($query)
    {
        return $query->pending()
            ->whereNotNull('due_at')
            ->whereDate('due_at', today());
    }

    /**
     * Scope para atividades que vencem em breve (proximos X dias).
     */
    public function scopeDueSoon($query, int $days = 3)
    {
        return $query->pending()
            ->whereNotNull('due_at')
            ->where('due_at', '>=', now())
            ->where('due_at', '<=', now()->addDays($days));
    }

    /**
     * Retorna quantos dias de atraso.
     */
    public function getDaysOverdueAttribute(): int
    {
        if (!$this->isOverdue()) {
            return 0;
        }

        return (int) $this->due_at->diffInDays(now());
    }

    /**
     * Retorna quantos dias ate o vencimento.
     */
    public function getDaysUntilDueAttribute(): ?int
    {
        if (!$this->due_at || $this->isOverdue()) {
            return null;
        }

        return (int) now()->diffInDays($this->due_at, false);
    }
}
