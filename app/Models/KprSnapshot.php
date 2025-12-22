<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KprSnapshot extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'kpr_id',
        'kpr_assignment_id',
        'snapshot_date',
        'current_value',
        'target_value',
        'progress_percentage',
        'projected_value',
        'deals_count',
        'activities_completed',
        'breakdown',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'current_value' => 'decimal:2',
            'target_value' => 'decimal:2',
            'progress_percentage' => 'decimal:2',
            'projected_value' => 'decimal:2',
            'deals_count' => 'integer',
            'activities_completed' => 'integer',
            'breakdown' => 'array',
        ];
    }

    /**
     * KPR deste snapshot.
     */
    public function kpr(): BelongsTo
    {
        return $this->belongsTo(Kpr::class);
    }

    /**
     * Atribuição (se for snapshot individual).
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(KprAssignment::class, 'kpr_assignment_id');
    }

    /**
     * Cria um snapshot para uma atribuição.
     */
    public static function createForAssignment(KprAssignment $assignment): self
    {
        return static::create([
            'tenant_id' => $assignment->tenant_id,
            'kpr_id' => $assignment->kpr_id,
            'kpr_assignment_id' => $assignment->id,
            'snapshot_date' => now()->toDateString(),
            'current_value' => $assignment->current_value,
            'target_value' => $assignment->target_value,
            'progress_percentage' => $assignment->progress_percentage,
            'deals_count' => $assignment->getContributingLeads()->count(),
            'activities_completed' => $assignment->getContributingActivities()->count(),
        ]);
    }

    /**
     * Cria um snapshot global para uma KPR.
     */
    public static function createForKpr(Kpr $kpr): self
    {
        return static::create([
            'tenant_id' => $kpr->tenant_id,
            'kpr_id' => $kpr->id,
            'kpr_assignment_id' => null,
            'snapshot_date' => now()->toDateString(),
            'current_value' => $kpr->current_value,
            'target_value' => $kpr->target_value,
            'progress_percentage' => $kpr->current_progress,
            'projected_value' => $kpr->projected_value,
        ]);
    }

    /**
     * Scope para snapshots de uma data específica.
     */
    public function scopeForDate($query, string $date)
    {
        return $query->whereDate('snapshot_date', $date);
    }

    /**
     * Scope para snapshots de um período.
     */
    public function scopeForPeriod($query, string $startDate, string $endDate)
    {
        return $query->whereBetween('snapshot_date', [$startDate, $endDate]);
    }

    /**
     * Scope para snapshots globais (sem assignment).
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('kpr_assignment_id');
    }
}
