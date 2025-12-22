<?php

namespace App\Models;

use App\Events\UserTierChanged;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserPoints extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'user_id',
        'total_points',
        'current_points',
        'period',
        'current_tier_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_points' => 'integer',
            'current_points' => 'integer',
        ];
    }

    /**
     * Usuário.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Tier atual.
     */
    public function currentTier(): BelongsTo
    {
        return $this->belongsTo(GamificationTier::class, 'current_tier_id');
    }

    /**
     * Transações de pontos do período.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(PointTransaction::class, 'user_id', 'user_id')
            ->where('period', $this->period);
    }

    /**
     * Atualiza o tier baseado nos pontos atuais.
     */
    public function updateTier(): void
    {
        $newTier = GamificationTier::getTierForPoints($this->tenant_id, $this->current_points);
        $oldTier = $this->currentTier;

        if ($newTier && (!$oldTier || $newTier->id !== $oldTier->id)) {
            $this->update(['current_tier_id' => $newTier->id]);

            // Se subiu de tier, dispara evento
            if (!$oldTier || $newTier->order > $oldTier->order) {
                event(new UserTierChanged($this->user, $oldTier, $newTier));
            }
        }
    }

    /**
     * Retorna a posição no ranking.
     */
    public function getRank(): int
    {
        return static::where('tenant_id', $this->tenant_id)
            ->where('period', $this->period)
            ->where('current_points', '>', $this->current_points)
            ->count() + 1;
    }

    /**
     * Pontos necessários para o próximo tier.
     */
    public function getPointsToNextTier(): ?int
    {
        $nextTier = $this->currentTier?->nextTier();

        if (!$nextTier) {
            return null;
        }

        return max(0, $nextTier->min_points - $this->current_points);
    }

    /**
     * Porcentagem de progresso para o próximo tier.
     */
    public function getProgressToNextTier(): ?float
    {
        $currentTier = $this->currentTier;
        $nextTier = $currentTier?->nextTier();

        if (!$currentTier || !$nextTier) {
            return null;
        }

        $tierRange = $nextTier->min_points - $currentTier->min_points;
        $progress = $this->current_points - $currentTier->min_points;

        return min(100, ($progress / $tierRange) * 100);
    }

    /**
     * Busca ou cria os pontos do período atual para um usuário.
     */
    public static function currentForUser(User $user): self
    {
        return static::firstOrCreate(
            [
                'user_id' => $user->id,
                'period' => now()->format('Y-m'),
            ],
            [
                'tenant_id' => $user->tenant_id,
                'total_points' => 0,
                'current_points' => 0,
            ]
        );
    }

    /**
     * Scope para o período atual.
     */
    public function scopeCurrentPeriod($query)
    {
        return $query->where('period', now()->format('Y-m'));
    }

    /**
     * Scope ordenado por pontos (ranking).
     */
    public function scopeRanked($query)
    {
        return $query->orderByDesc('current_points');
    }
}
