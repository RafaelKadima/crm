<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Kpr extends Model
{
    use HasFactory, HasUuids, BelongsToTenant, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'type',
        'target_value',
        'period_start',
        'period_end',
        'status',
        'pipeline_id',
        'product_id',
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
            'target_value' => 'decimal:2',
            'period_start' => 'date',
            'period_end' => 'date',
        ];
    }

    /**
     * Pipeline associado (opcional).
     */
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    /**
     * Produto associado (opcional) - para metas de produto específico.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Usuário que criou a meta.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Todas as atribuições desta meta.
     */
    public function assignments(): HasMany
    {
        return $this->hasMany(KprAssignment::class);
    }

    /**
     * Atribuições para equipes.
     */
    public function teamAssignments(): HasMany
    {
        return $this->hasMany(KprAssignment::class)
            ->where('assignable_type', Team::class);
    }

    /**
     * Atribuições para usuários.
     */
    public function userAssignments(): HasMany
    {
        return $this->hasMany(KprAssignment::class)
            ->where('assignable_type', User::class);
    }

    /**
     * Snapshots de progresso.
     */
    public function snapshots(): HasMany
    {
        return $this->hasMany(KprSnapshot::class);
    }

    /**
     * Verifica se a meta está ativa.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Verifica se a meta está no período atual.
     */
    public function isCurrentPeriod(): bool
    {
        $today = now()->toDateString();
        return $this->period_start <= $today && $this->period_end >= $today;
    }

    /**
     * Dias restantes no período.
     */
    public function getRemainingDaysAttribute(): int
    {
        if ($this->period_end->isPast()) {
            return 0;
        }
        return (int) now()->diffInDays($this->period_end, false);
    }

    /**
     * Dias totais do período.
     */
    public function getTotalDaysAttribute(): int
    {
        return (int) $this->period_start->diffInDays($this->period_end);
    }

    /**
     * Dias decorridos no período.
     */
    public function getElapsedDaysAttribute(): int
    {
        if ($this->period_start->isFuture()) {
            return 0;
        }
        return min(
            $this->total_days,
            (int) $this->period_start->diffInDays(now())
        );
    }

    /**
     * Porcentagem do período decorrido.
     */
    public function getPeriodProgressAttribute(): float
    {
        if ($this->total_days === 0) {
            return 100;
        }
        return round(($this->elapsed_days / $this->total_days) * 100, 2);
    }

    /**
     * Calcula o progresso atual baseado nas atribuições.
     */
    public function getCurrentProgressAttribute(): float
    {
        $totalCurrent = $this->assignments()->sum('current_value');
        if ($this->target_value == 0) {
            return 0;
        }
        return round(($totalCurrent / $this->target_value) * 100, 2);
    }

    /**
     * Valor atual total.
     */
    public function getCurrentValueAttribute(): float
    {
        return (float) $this->assignments()->sum('current_value');
    }

    /**
     * Valor restante para atingir a meta.
     */
    public function getRemainingValueAttribute(): float
    {
        return max(0, $this->target_value - $this->current_value);
    }

    /**
     * Projeção de resultado baseado no ritmo atual.
     */
    public function getProjectedValueAttribute(): float
    {
        if ($this->elapsed_days === 0) {
            return 0;
        }

        $dailyRate = $this->current_value / $this->elapsed_days;
        return round($dailyRate * $this->total_days, 2);
    }

    /**
     * Verifica se está no ritmo para atingir a meta.
     */
    public function isOnTrack(): bool
    {
        // Se o período ainda não começou
        if ($this->period_start->isFuture()) {
            return true;
        }

        // Progresso esperado baseado no tempo decorrido
        $expectedProgress = $this->period_progress;
        $actualProgress = $this->current_progress;

        // Margem de 10% de tolerância
        return $actualProgress >= ($expectedProgress - 10);
    }

    /**
     * Status do ritmo: ahead, on_track, behind, critical
     */
    public function getTrackStatusAttribute(): string
    {
        if ($this->period_start->isFuture()) {
            return 'pending';
        }

        $expectedProgress = $this->period_progress;
        $actualProgress = $this->current_progress;
        $diff = $actualProgress - $expectedProgress;

        if ($diff >= 10) {
            return 'ahead';
        } elseif ($diff >= -10) {
            return 'on_track';
        } elseif ($diff >= -25) {
            return 'behind';
        } else {
            return 'critical';
        }
    }

    /**
     * Ativa a meta.
     */
    public function activate(): void
    {
        $this->update(['status' => 'active']);
    }

    /**
     * Completa a meta.
     */
    public function complete(): void
    {
        $this->update(['status' => 'completed']);
    }

    /**
     * Cancela a meta.
     */
    public function cancel(): void
    {
        $this->update(['status' => 'cancelled']);
    }

    /**
     * Scope para metas ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope para metas do período atual.
     */
    public function scopeCurrentPeriod($query)
    {
        $today = now()->toDateString();
        return $query->where('period_start', '<=', $today)
                     ->where('period_end', '>=', $today);
    }

    /**
     * Scope para metas de um tipo específico.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }
}
