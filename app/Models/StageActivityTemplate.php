<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StageActivityTemplate extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'pipeline_id',
        'stage_id',
        'title',
        'description',
        'activity_type',
        'is_required',
        'order',
        'default_duration_minutes',
        'due_days',
        'points',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'order' => 'integer',
            'default_duration_minutes' => 'integer',
            'due_days' => 'integer',
            'points' => 'integer',
        ];
    }

    /**
     * Pipeline deste template.
     */
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    /**
     * Estágio deste template.
     */
    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'stage_id');
    }

    /**
     * Usuário que criou o template.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Atividades geradas a partir deste template.
     */
    public function dealActivities(): HasMany
    {
        return $this->hasMany(DealStageActivity::class, 'stage_activity_template_id');
    }

    /**
     * Ícone baseado no tipo de atividade.
     */
    public function getIconAttribute(): string
    {
        return match ($this->activity_type) {
            'call' => '📞',
            'email' => '📧',
            'meeting' => '🤝',
            'task' => '📋',
            'demo' => '🎬',
            'follow_up' => '🔄',
            default => '📌',
        };
    }

    /**
     * Gera uma atividade para um lead.
     */
    public function generateForLead(Lead $lead): DealStageActivity
    {
        $dueAt = now()->addDays($this->due_days);

        return DealStageActivity::create([
            'tenant_id' => $lead->tenant_id,
            'lead_id' => $lead->id,
            'stage_id' => $this->stage_id,
            'stage_activity_template_id' => $this->id,
            'status' => 'pending',
            'due_at' => $dueAt,
            'points_earned' => 0,
        ]);
    }

    /**
     * Scope para templates de um estágio ordenados.
     */
    public function scopeForStage($query, string $stageId)
    {
        return $query->where('stage_id', $stageId)->orderBy('order');
    }

    /**
     * Scope para templates obrigatórios.
     */
    public function scopeRequired($query)
    {
        return $query->where('is_required', true);
    }
}
