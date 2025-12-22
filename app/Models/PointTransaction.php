<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointTransaction extends Model
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
        'points',
        'action_type',
        'description',
        'reference_type',
        'reference_id',
        'point_rule_id',
        'period',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'points' => 'integer',
        ];
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::created(function (PointTransaction $transaction) {
            // Atualiza o saldo do usuário automaticamente
            $transaction->updateUserPoints();
        });
    }

    /**
     * Usuário da transação.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Regra de pontos usada.
     */
    public function pointRule(): BelongsTo
    {
        return $this->belongsTo(PointRule::class, 'point_rule_id');
    }

    /**
     * Atualiza os pontos do usuário.
     */
    protected function updateUserPoints(): void
    {
        $userPoints = UserPoints::firstOrCreate(
            [
                'user_id' => $this->user_id,
                'period' => $this->period,
            ],
            [
                'tenant_id' => $this->tenant_id,
                'total_points' => 0,
                'current_points' => 0,
            ]
        );

        $userPoints->increment('current_points', $this->points);
        $userPoints->increment('total_points', $this->points);

        // Verifica se mudou de tier
        $userPoints->updateTier();
    }

    /**
     * Retorna o período atual (YYYY-MM).
     */
    public static function currentPeriod(): string
    {
        return now()->format('Y-m');
    }

    /**
     * Scope para um período específico.
     */
    public function scopeForPeriod($query, string $period)
    {
        return $query->where('period', $period);
    }

    /**
     * Scope para um usuário.
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }
}
