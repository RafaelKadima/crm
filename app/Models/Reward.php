<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reward extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * Tipos de recompensa.
     */
    public const TYPES = [
        'physical' => 'Físico',
        'digital' => 'Digital',
        'experience' => 'Experiência',
        'bonus' => 'Bônus',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'tier_id',
        'name',
        'description',
        'image_url',
        'type',
        'value',
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
            'value' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Tier necessário para esta recompensa.
     */
    public function tier(): BelongsTo
    {
        return $this->belongsTo(GamificationTier::class, 'tier_id');
    }

    /**
     * Usuários que resgataram esta recompensa.
     */
    public function userRewards(): HasMany
    {
        return $this->hasMany(UserReward::class, 'reward_id');
    }

    /**
     * Verifica se um usuário pode resgatar esta recompensa.
     */
    public function canBeClaimedBy(User $user): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $userPoints = UserPoints::currentForUser($user);
        $userTier = $userPoints->currentTier;

        if (!$userTier) {
            return false;
        }

        // Verifica se o tier do usuário é igual ou superior ao tier da recompensa
        return $userTier->order >= $this->tier->order;
    }

    /**
     * Scope para recompensas ativas.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para recompensas de um tier.
     */
    public function scopeForTier($query, string $tierId)
    {
        return $query->where('tier_id', $tierId);
    }
}
