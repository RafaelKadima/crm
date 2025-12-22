<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GamificationTier extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'icon',
        'color',
        'min_points',
        'max_points',
        'order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'min_points' => 'integer',
            'max_points' => 'integer',
            'order' => 'integer',
        ];
    }

    /**
     * Recompensas deste tier.
     */
    public function rewards(): HasMany
    {
        return $this->hasMany(Reward::class, 'tier_id');
    }

    /**
     * Usuários neste tier.
     */
    public function userPoints(): HasMany
    {
        return $this->hasMany(UserPoints::class, 'current_tier_id');
    }

    /**
     * Retorna o tier para uma quantidade de pontos.
     */
    public static function getTierForPoints(string $tenantId, int $points): ?self
    {
        return static::where('tenant_id', $tenantId)
            ->where('min_points', '<=', $points)
            ->where(function ($query) use ($points) {
                $query->whereNull('max_points')
                    ->orWhere('max_points', '>=', $points);
            })
            ->orderByDesc('min_points')
            ->first();
    }

    /**
     * Próximo tier após este.
     */
    public function nextTier(): ?self
    {
        return static::where('tenant_id', $this->tenant_id)
            ->where('order', '>', $this->order)
            ->orderBy('order')
            ->first();
    }

    /**
     * Tier anterior a este.
     */
    public function previousTier(): ?self
    {
        return static::where('tenant_id', $this->tenant_id)
            ->where('order', '<', $this->order)
            ->orderByDesc('order')
            ->first();
    }

    /**
     * Verifica se é o tier máximo.
     */
    public function isMaxTier(): bool
    {
        return $this->max_points === null;
    }

    /**
     * Scope ordenado.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }
}
