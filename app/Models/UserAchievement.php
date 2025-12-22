<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAchievement extends Model
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
        'achievement_id',
        'earned_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'earned_at' => 'datetime',
        ];
    }

    /**
     * Usuário que conquistou.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Achievement conquistado.
     */
    public function achievement(): BelongsTo
    {
        return $this->belongsTo(Achievement::class);
    }

    /**
     * Registra uma conquista para um usuário.
     */
    public static function earn(User $user, Achievement $achievement): self
    {
        return static::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'achievement_id' => $achievement->id,
            'earned_at' => now(),
        ]);
    }

    /**
     * Scope para um usuário.
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }
}
