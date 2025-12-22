<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KpiValue extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'kpi_id',
        'user_id',
        'team_id',
        'period',
        'period_type',
        'calculated_value',
        'target_value',
        'previous_value',
        'achievement_percentage',
        'variation_percentage',
        'breakdown',
        'contributing_items',
        'calculated_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'calculated_value' => 'decimal:4',
            'target_value' => 'decimal:4',
            'previous_value' => 'decimal:4',
            'achievement_percentage' => 'decimal:2',
            'variation_percentage' => 'decimal:2',
            'breakdown' => 'array',
            'contributing_items' => 'array',
            'calculated_at' => 'datetime',
        ];
    }

    /**
     * KPI deste valor.
     */
    public function kpi(): BelongsTo
    {
        return $this->belongsTo(Kpi::class);
    }

    /**
     * Usuário (se for valor individual).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Equipe (se for valor de equipe).
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * Verifica se é um valor individual (de usuário).
     */
    public function isUserValue(): bool
    {
        return $this->user_id !== null;
    }

    /**
     * Verifica se é um valor de equipe.
     */
    public function isTeamValue(): bool
    {
        return $this->team_id !== null;
    }

    /**
     * Verifica se é um valor global (tenant).
     */
    public function isGlobalValue(): bool
    {
        return $this->user_id === null && $this->team_id === null;
    }

    /**
     * Retorna a tendência (up, down, stable).
     */
    public function getTrendAttribute(): string
    {
        if ($this->variation_percentage === null) {
            return 'stable';
        }

        if ($this->variation_percentage > 5) {
            return 'up';
        } elseif ($this->variation_percentage < -5) {
            return 'down';
        }

        return 'stable';
    }

    /**
     * Verifica se está acima da meta.
     */
    public function isAboveTarget(): bool
    {
        if ($this->target_value === null) {
            return false;
        }

        return $this->calculated_value >= $this->target_value;
    }

    /**
     * Formata o valor para exibição.
     */
    public function getFormattedValueAttribute(): string
    {
        return $this->kpi?->formatValue($this->calculated_value) ?? (string) $this->calculated_value;
    }

    /**
     * Scope para valores de um período específico.
     */
    public function scopeForPeriod($query, string $period)
    {
        return $query->where('period', $period);
    }

    /**
     * Scope para valores de um usuário.
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope para valores de uma equipe.
     */
    public function scopeForTeam($query, string $teamId)
    {
        return $query->where('team_id', $teamId);
    }

    /**
     * Scope para valores globais.
     */
    public function scopeGlobal($query)
    {
        return $query->whereNull('user_id')->whereNull('team_id');
    }

    /**
     * Retorna o período atual no formato padrão.
     */
    public static function currentPeriod(string $type = 'monthly'): string
    {
        return match($type) {
            'daily' => now()->format('Y-m-d'),
            'weekly' => now()->format('Y-\WW'),
            'monthly' => now()->format('Y-m'),
            'quarterly' => now()->format('Y-\QQ'),
            'yearly' => now()->format('Y'),
            default => now()->format('Y-m')
        };
    }
}
