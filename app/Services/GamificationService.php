<?php

namespace App\Services;

use App\Events\AchievementUnlocked;
use App\Events\PointsEarned;
use App\Events\UserTierChanged;
use App\Models\Achievement;
use App\Models\GamificationSettings;
use App\Models\GamificationTier;
use App\Models\PointRule;
use App\Models\PointTransaction;
use App\Models\User;
use App\Models\UserAchievement;
use App\Models\UserPoints;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class GamificationService
{
    /**
     * Adiciona pontos para um usuário.
     */
    public function awardPoints(
        User $user,
        string $actionType,
        ?Model $reference = null,
        ?string $description = null
    ): ?PointTransaction {
        // Verifica se gamificação está ativa
        $settings = GamificationSettings::forTenant($user->tenant_id);
        if (!$settings->isActive()) {
            return null;
        }

        // Busca regra de pontos
        $context = $this->buildContext($reference);
        $rule = PointRule::findBestRule($user->tenant_id, $actionType, $context);

        if (!$rule) {
            return null;
        }

        $points = $rule->calculatePoints();

        $transaction = PointTransaction::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'points' => $points,
            'action_type' => $actionType,
            'description' => $description ?? $rule->name,
            'reference_type' => $reference ? get_class($reference) : null,
            'reference_id' => $reference?->id,
            'point_rule_id' => $rule->id,
            'period' => PointTransaction::currentPeriod(),
        ]);

        // Dispara evento de pontos ganhos
        event(new PointsEarned($transaction, $user));

        // Verifica achievements
        $this->checkAchievements($user);

        return $transaction;
    }

    /**
     * Constrói contexto para verificação de regras.
     */
    protected function buildContext(?Model $reference): array
    {
        $context = [];

        if ($reference) {
            // Se for um Lead/Deal, pega o valor
            if (method_exists($reference, 'getAttribute') && $reference->getAttribute('value')) {
                $context['deal_value'] = $reference->value;
            }

            // Se for uma atividade, pega o tipo
            if (method_exists($reference, 'template') && $reference->template) {
                $context['activity_type'] = $reference->template->activity_type;
            }
        }

        return $context;
    }

    /**
     * Verifica promoção de tier.
     * Chamado automaticamente pelo UserPoints model.
     */
    public function checkTierPromotion(User $user): ?array
    {
        $userPoints = UserPoints::currentForUser($user);
        $currentTier = $userPoints->currentTier;
        $newTier = GamificationTier::getTierForPoints($user->tenant_id, $userPoints->current_points);

        if (!$newTier || !$currentTier || $newTier->id === $currentTier->id) {
            return null;
        }

        // Se subiu de tier
        if ($newTier->order > $currentTier->order) {
            $userPoints->update(['current_tier_id' => $newTier->id]);
            event(new UserTierChanged($user, $currentTier, $newTier));

            return [
                'old_tier' => $currentTier,
                'new_tier' => $newTier,
            ];
        }

        return null;
    }

    /**
     * Verifica e concede achievements.
     */
    public function checkAchievements(User $user): array
    {
        $settings = GamificationSettings::forTenant($user->tenant_id);
        if (!$settings->isActive()) {
            return [];
        }

        $context = $this->buildUserContext($user);
        $earnedAchievements = [];

        $achievements = Achievement::where('tenant_id', $user->tenant_id)
            ->active()
            ->get();

        foreach ($achievements as $achievement) {
            // Pula se já conquistou
            if ($achievement->isEarnedBy($user)) {
                continue;
            }

            // Verifica condição
            if ($achievement->checkCondition($context)) {
                $userAchievement = UserAchievement::earn($user, $achievement);
                $earnedAchievements[] = $achievement;

                // Concede pontos bônus
                if ($achievement->points_bonus > 0) {
                    PointTransaction::create([
                        'tenant_id' => $user->tenant_id,
                        'user_id' => $user->id,
                        'points' => $achievement->points_bonus,
                        'action_type' => 'achievement_bonus',
                        'description' => "Conquista: {$achievement->name}",
                        'reference_type' => Achievement::class,
                        'reference_id' => $achievement->id,
                        'period' => PointTransaction::currentPeriod(),
                    ]);
                }

                // Dispara evento
                event(new AchievementUnlocked($user, $achievement));
            }
        }

        return $earnedAchievements;
    }

    /**
     * Constrói contexto do usuário para verificação de achievements.
     */
    protected function buildUserContext(User $user): array
    {
        $userPoints = UserPoints::currentForUser($user);

        return [
            'total_deals' => $user->leads()->where('status', 'won')->count(),
            'total_points' => $userPoints->current_points,
            'tier_order' => $userPoints->currentTier?->order ?? 0,
            // TODO: Adicionar mais métricas conforme necessário
            // 'total_calls' => ...,
            // 'total_meetings' => ...,
            // 'streak_days' => ...,
        ];
    }

    /**
     * Retorna o leaderboard/ranking.
     */
    public function getLeaderboard(string $tenantId, ?string $period = null, int $limit = 10): Collection
    {
        $period = $period ?? PointTransaction::currentPeriod();

        return UserPoints::where('tenant_id', $tenantId)
            ->where('period', $period)
            ->with(['user', 'currentTier'])
            ->ranked()
            ->limit($limit)
            ->get()
            ->map(function ($userPoints, $index) {
                return [
                    'rank' => $index + 1,
                    'user_id' => $userPoints->user_id,
                    'user_name' => $userPoints->user->name,
                    'user_avatar' => $userPoints->user->avatar_url ?? null,
                    'current_points' => $userPoints->current_points,
                    'total_points' => $userPoints->total_points,
                    'current_tier' => $userPoints->currentTier,
                ];
            });
    }

    /**
     * Retorna estatísticas de gamificação do usuário.
     */
    public function getUserStats(User $user): array
    {
        $userPoints = UserPoints::currentForUser($user);
        $currentTier = $userPoints->currentTier;
        $nextTier = $currentTier?->nextTier();

        $recentTransactions = PointTransaction::forUser($user->id)
            ->forPeriod(PointTransaction::currentPeriod())
            ->latest()
            ->limit(10)
            ->get();

        $achievements = UserAchievement::forUser($user->id)
            ->with('achievement')
            ->latest('earned_at')
            ->get()
            ->map(fn($ua) => [
                'id' => $ua->achievement->id,
                'name' => $ua->achievement->name,
                'description' => $ua->achievement->description,
                'icon' => $ua->achievement->icon,
                'earned_at' => $ua->earned_at,
            ]);

        return [
            'current_points' => $userPoints->current_points,
            'total_points' => $userPoints->total_points,
            'current_tier' => $currentTier,
            'next_tier' => $nextTier,
            'points_to_next_tier' => $userPoints->getPointsToNextTier(),
            'progress_to_next_tier' => $userPoints->getProgressToNextTier(),
            'rank' => $userPoints->getRank(),
            'period' => $userPoints->period,
            'achievements' => $achievements,
            'recent_transactions' => $recentTransactions,
        ];
    }

    /**
     * Retorna a posição do usuário no ranking.
     */
    public function getUserRank(User $user): int
    {
        $userPoints = UserPoints::currentForUser($user);
        return $userPoints->getRank();
    }

    /**
     * Retorna todos os tiers de um tenant.
     */
    public function getTiers(string $tenantId): Collection
    {
        return GamificationTier::where('tenant_id', $tenantId)
            ->ordered()
            ->with('rewards')
            ->get();
    }

    /**
     * Retorna as configurações de gamificação.
     */
    public function getSettings(string $tenantId): GamificationSettings
    {
        return GamificationSettings::forTenant($tenantId);
    }
}
