<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityKpiMapping extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'activity_kpi_mappings';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'stage_activity_template_id',
        'kpi_id',
        'contribution_value',
        'contribution_type',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'contribution_value' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Template de atividade.
     */
    public function activityTemplate(): BelongsTo
    {
        return $this->belongsTo(StageActivityTemplate::class, 'stage_activity_template_id');
    }

    /**
     * KPI.
     */
    public function kpi(): BelongsTo
    {
        return $this->belongsTo(Kpi::class);
    }

    /**
     * Calcula a contribuição de uma atividade para o KPI.
     */
    public function calculateContribution(float $baseValue = 1): float
    {
        return match($this->contribution_type) {
            'fixed' => $this->contribution_value,
            'percentage' => $baseValue * ($this->contribution_value / 100),
            'multiplier' => $baseValue * $this->contribution_value,
            default => $this->contribution_value
        };
    }

    /**
     * Scope para mapeamentos ativos.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para mapeamentos de um template específico.
     */
    public function scopeForTemplate($query, string $templateId)
    {
        return $query->where('stage_activity_template_id', $templateId);
    }

    /**
     * Scope para mapeamentos de um KPI específico.
     */
    public function scopeForKpi($query, string $kpiId)
    {
        return $query->where('kpi_id', $kpiId);
    }
}
