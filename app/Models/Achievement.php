<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Achievement extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    /**
     * Tipos de condições disponíveis.
     */
    public const CONDITION_TYPES = [
        'first_sale' => 'Primeira Venda',
        'total_deals' => 'Total de Deals Ganhos',
        'total_calls' => 'Total de Ligações',
        'total_meetings' => 'Total de Reuniões',
        'streak_days' => 'Dias Consecutivos Ativo',
        'monthly_target' => 'Meta Mensal Atingida',
        'deal_value' => 'Deal Acima de Valor',
        'activities_day' => 'Atividades em Um Dia',
        'perfect_week' => 'Semana Perfeita',
        'tier_reached' => 'Tier Alcançado',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'icon',
        'condition_type',
        'condition_value',
        'points_bonus',
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
            'condition_value' => 'array',
            'points_bonus' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Usuários que conquistaram este achievement.
     */
    public function userAchievements(): HasMany
    {
        return $this->hasMany(UserAchievement::class, 'achievement_id');
    }

    /**
     * Verifica se um usuário conquistou este achievement.
     */
    public function isEarnedBy(User $user): bool
    {
        return UserAchievement::where('user_id', $user->id)
            ->where('achievement_id', $this->id)
            ->exists();
    }

    /**
     * Verifica se as condições foram atendidas pelo contexto.
     */
    public function checkCondition(array $context): bool
    {
        $value = $this->condition_value;

        return match ($this->condition_type) {
            'first_sale' => ($context['total_deals'] ?? 0) === 1,
            'total_deals' => ($context['total_deals'] ?? 0) >= ($value['count'] ?? 1),
            'total_calls' => ($context['total_calls'] ?? 0) >= ($value['count'] ?? 1),
            'total_meetings' => ($context['total_meetings'] ?? 0) >= ($value['count'] ?? 1),
            'streak_days' => ($context['streak_days'] ?? 0) >= ($value['days'] ?? 1),
            'deal_value' => ($context['deal_value'] ?? 0) >= ($value['min_value'] ?? 0),
            'activities_day' => ($context['activities_today'] ?? 0) >= ($value['count'] ?? 1),
            'tier_reached' => ($context['tier_order'] ?? 0) >= ($value['tier_order'] ?? 1),
            default => false,
        };
    }

    /**
     * Scope para achievements ativos.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope para achievements de um tipo de condição.
     */
    public function scopeForCondition($query, string $conditionType)
    {
        return $query->where('condition_type', $conditionType);
    }
}
