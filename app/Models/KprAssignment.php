<?php

namespace App\Models;

use App\Enums\LeadStatusEnum;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Collection;

class KprAssignment extends Model
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
        'assignable_type',
        'assignable_id',
        'parent_assignment_id',
        'target_value',
        'weight',
        'current_value',
        'progress_percentage',
        'metadata',
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
            'weight' => 'decimal:2',
            'current_value' => 'decimal:2',
            'progress_percentage' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    /**
     * Meta (KPR) desta atribuição.
     */
    public function kpr(): BelongsTo
    {
        return $this->belongsTo(Kpr::class);
    }

    /**
     * Entidade atribuída (Team ou User).
     */
    public function assignable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Atribuição pai (para hierarquia).
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(KprAssignment::class, 'parent_assignment_id');
    }

    /**
     * Atribuições filhas.
     */
    public function children(): HasMany
    {
        return $this->hasMany(KprAssignment::class, 'parent_assignment_id');
    }

    /**
     * Snapshots de progresso.
     */
    public function snapshots(): HasMany
    {
        return $this->hasMany(KprSnapshot::class);
    }

    /**
     * Verifica se é uma atribuição para usuário.
     */
    public function isUserAssignment(): bool
    {
        return $this->assignable_type === User::class;
    }

    /**
     * Verifica se é uma atribuição para equipe.
     */
    public function isTeamAssignment(): bool
    {
        return $this->assignable_type === Team::class;
    }

    /**
     * Retorna o nome da entidade atribuída.
     */
    public function getAssigneeNameAttribute(): string
    {
        return $this->assignable?->name ?? 'N/A';
    }

    /**
     * Valor restante para atingir a meta.
     */
    public function getRemainingValueAttribute(): float
    {
        return max(0, $this->target_value - $this->current_value);
    }

    /**
     * Atualiza o progresso baseado nos dados reais.
     */
    public function updateProgress(): void
    {
        $kpr = $this->kpr;
        $currentValue = 0;

        if ($this->isUserAssignment()) {
            $currentValue = $this->calculateUserProgress($this->assignable, $kpr);
        } elseif ($this->isTeamAssignment()) {
            $currentValue = $this->calculateTeamProgress($this->assignable, $kpr);
        }

        $progressPercentage = $this->target_value > 0
            ? ($currentValue / $this->target_value) * 100
            : 0;

        $this->update([
            'current_value' => $currentValue,
            'progress_percentage' => min(100, round($progressPercentage, 2)),
        ]);

        // Se tem pai, atualiza o pai também
        if ($this->parent) {
            $this->parent->updateFromChildren();
        }
    }

    /**
     * Atualiza o progresso baseado nos filhos.
     */
    public function updateFromChildren(): void
    {
        $currentValue = $this->children()->sum('current_value');
        $progressPercentage = $this->target_value > 0
            ? ($currentValue / $this->target_value) * 100
            : 0;

        $this->update([
            'current_value' => $currentValue,
            'progress_percentage' => min(100, round($progressPercentage, 2)),
        ]);
    }

    /**
     * Calcula o progresso de um usuário.
     */
    protected function calculateUserProgress(User $user, Kpr $kpr): float
    {
        return match($kpr->type) {
            'revenue' => $this->calculateRevenueProgress($user, $kpr),
            'deals' => $this->calculateDealsProgress($user, $kpr),
            'activities' => $this->calculateActivitiesProgress($user, $kpr),
            default => 0
        };
    }

    /**
     * Calcula o progresso de uma equipe.
     */
    protected function calculateTeamProgress(Team $team, Kpr $kpr): float
    {
        // Soma o progresso de todos os membros da equipe
        $userIds = $team->users()->pluck('users.id');

        return match($kpr->type) {
            'revenue' => Lead::whereIn('owner_id', $userIds)
                ->where('status', LeadStatusEnum::WON)
                ->whereBetween('updated_at', [$kpr->period_start, $kpr->period_end])
                ->sum('value'),
            'deals' => Lead::whereIn('owner_id', $userIds)
                ->where('status', LeadStatusEnum::WON)
                ->whereBetween('updated_at', [$kpr->period_start, $kpr->period_end])
                ->count(),
            'activities' => DealStageActivity::whereHas('lead', function ($q) use ($userIds) {
                    $q->whereIn('owner_id', $userIds);
                })
                ->where('status', 'completed')
                ->whereBetween('completed_at', [$kpr->period_start, $kpr->period_end])
                ->count(),
            default => 0
        };
    }

    /**
     * Calcula progresso de receita para um usuário.
     */
    protected function calculateRevenueProgress(User $user, Kpr $kpr): float
    {
        return (float) Lead::where('owner_id', $user->id)
            ->where('tenant_id', $this->tenant_id)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', [$kpr->period_start, $kpr->period_end])
            ->sum('value');
    }

    /**
     * Calcula progresso de deals para um usuário.
     */
    protected function calculateDealsProgress(User $user, Kpr $kpr): float
    {
        return (float) Lead::where('owner_id', $user->id)
            ->where('tenant_id', $this->tenant_id)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', [$kpr->period_start, $kpr->period_end])
            ->count();
    }

    /**
     * Calcula progresso de atividades para um usuário.
     */
    protected function calculateActivitiesProgress(User $user, Kpr $kpr): float
    {
        return (float) DealStageActivity::where('completed_by', $user->id)
            ->where('tenant_id', $this->tenant_id)
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$kpr->period_start, $kpr->period_end])
            ->count();
    }

    /**
     * Retorna os leads que contribuíram para esta atribuição.
     */
    public function getContributingLeads(): Collection
    {
        if (!$this->isUserAssignment()) {
            return collect();
        }

        $kpr = $this->kpr;

        return Lead::where('owner_id', $this->assignable_id)
            ->where('tenant_id', $this->tenant_id)
            ->where('status', LeadStatusEnum::WON)
            ->whereBetween('updated_at', [$kpr->period_start, $kpr->period_end])
            ->get();
    }

    /**
     * Retorna as atividades que contribuíram para esta atribuição.
     */
    public function getContributingActivities(): Collection
    {
        if (!$this->isUserAssignment()) {
            return collect();
        }

        $kpr = $this->kpr;

        return DealStageActivity::where('completed_by', $this->assignable_id)
            ->where('tenant_id', $this->tenant_id)
            ->where('status', 'completed')
            ->whereBetween('completed_at', [$kpr->period_start, $kpr->period_end])
            ->with('template')
            ->get();
    }

    /**
     * Scope para atribuições de usuários.
     */
    public function scopeForUsers($query)
    {
        return $query->where('assignable_type', User::class);
    }

    /**
     * Scope para atribuições de equipes.
     */
    public function scopeForTeams($query)
    {
        return $query->where('assignable_type', Team::class);
    }

    /**
     * Scope para atribuições de um usuário específico.
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('assignable_type', User::class)
                     ->where('assignable_id', $userId);
    }
}
