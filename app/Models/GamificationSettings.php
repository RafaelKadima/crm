<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GamificationSettings extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * Períodos de reset disponíveis.
     */
    public const RESET_PERIODS = [
        'monthly' => 'Mensal',
        'quarterly' => 'Trimestral',
        'yearly' => 'Anual',
        'never' => 'Nunca',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'is_enabled',
        'reset_period',
        'show_leaderboard',
        'show_points_to_users',
        'notify_tier_change',
        'notify_achievement',
        'sound_enabled',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'show_leaderboard' => 'boolean',
            'show_points_to_users' => 'boolean',
            'notify_tier_change' => 'boolean',
            'notify_achievement' => 'boolean',
            'sound_enabled' => 'boolean',
        ];
    }

    /**
     * Retorna as configurações de um tenant.
     */
    public static function forTenant(string $tenantId): self
    {
        return static::firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'is_enabled' => true,
                'reset_period' => 'monthly',
                'show_leaderboard' => true,
                'show_points_to_users' => true,
                'notify_tier_change' => true,
                'notify_achievement' => true,
                'sound_enabled' => true,
            ]
        );
    }

    /**
     * Verifica se a gamificação está ativa.
     */
    public function isActive(): bool
    {
        return $this->is_enabled;
    }

    /**
     * Verifica se deve notificar mudança de tier.
     */
    public function shouldNotifyTierChange(): bool
    {
        return $this->is_enabled && $this->notify_tier_change;
    }

    /**
     * Verifica se deve notificar achievements.
     */
    public function shouldNotifyAchievement(): bool
    {
        return $this->is_enabled && $this->notify_achievement;
    }

    /**
     * Verifica se sons estão habilitados.
     */
    public function areSoundsEnabled(): bool
    {
        return $this->is_enabled && $this->sound_enabled;
    }
}
