<?php

namespace App\Http\Controllers;

use App\Models\GamificationSettings;
use App\Models\Reward;
use App\Models\UserReward;
use App\Services\GamificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    public function __construct(
        protected GamificationService $gamificationService
    ) {}

    /**
     * Retorna estatísticas do usuário logado.
     */
    public function myStats(): JsonResponse
    {
        $user = auth()->user();
        $stats = $this->gamificationService->getUserStats($user);

        return response()->json($stats);
    }

    /**
     * Retorna o leaderboard/ranking.
     */
    public function leaderboard(Request $request): JsonResponse
    {
        $user = auth()->user();
        $period = $request->get('period'); // YYYY-MM ou null para atual
        $limit = $request->get('limit', 10);

        // Verifica se leaderboard está habilitado
        $settings = GamificationSettings::forTenant($user->tenant_id);
        if (!$settings->show_leaderboard) {
            return response()->json(['error' => 'Leaderboard desabilitado.'], 403);
        }

        $leaderboard = $this->gamificationService->getLeaderboard($user->tenant_id, $period, $limit);

        // Adiciona posição do usuário atual
        $userRank = $this->gamificationService->getUserRank($user);

        return response()->json([
            'leaderboard' => $leaderboard,
            'my_rank' => $userRank,
            'period' => $period ?? now()->format('Y-m'),
        ]);
    }

    /**
     * Retorna todos os tiers disponíveis.
     */
    public function tiers(): JsonResponse
    {
        $user = auth()->user();
        $tiers = $this->gamificationService->getTiers($user->tenant_id);

        return response()->json($tiers);
    }

    /**
     * Retorna achievements do usuário.
     */
    public function achievements(): JsonResponse
    {
        $user = auth()->user();

        $allAchievements = \App\Models\Achievement::where('tenant_id', $user->tenant_id)
            ->active()
            ->get();

        $userAchievements = \App\Models\UserAchievement::forUser($user->id)
            ->pluck('achievement_id')
            ->toArray();

        $result = $allAchievements->map(function ($achievement) use ($userAchievements) {
            $earned = in_array($achievement->id, $userAchievements);
            return [
                'id' => $achievement->id,
                'name' => $achievement->name,
                'description' => $achievement->description,
                'icon' => $achievement->icon,
                'points_bonus' => $achievement->points_bonus,
                'earned' => $earned,
            ];
        });

        return response()->json($result);
    }

    /**
     * Retorna recompensas do usuário.
     */
    public function myRewards(): JsonResponse
    {
        $user = auth()->user();

        $rewards = UserReward::where('user_id', $user->id)
            ->with(['reward', 'tier'])
            ->latest('requested_at')
            ->get();

        return response()->json($rewards);
    }

    /**
     * Solicita resgate de uma recompensa.
     */
    public function claimReward(Reward $reward): JsonResponse
    {
        $user = auth()->user();

        // Verifica se pode resgatar
        if (!$reward->canBeClaimedBy($user)) {
            return response()->json([
                'error' => 'Você não atingiu o tier necessário para esta recompensa.',
            ], 400);
        }

        // Verifica se já resgatou neste período
        $alreadyClaimed = UserReward::where('user_id', $user->id)
            ->where('reward_id', $reward->id)
            ->where('period', now()->format('Y-m'))
            ->exists();

        if ($alreadyClaimed) {
            return response()->json([
                'error' => 'Você já solicitou esta recompensa neste período.',
            ], 400);
        }

        $userPoints = \App\Models\UserPoints::currentForUser($user);

        $userReward = UserReward::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'reward_id' => $reward->id,
            'tier_id' => $userPoints->current_tier_id,
            'status' => 'pending',
            'requested_at' => now(),
            'period' => now()->format('Y-m'),
        ]);

        return response()->json([
            'message' => 'Recompensa solicitada com sucesso. Aguarde aprovação.',
            'user_reward' => $userReward->load(['reward', 'tier']),
        ]);
    }

    /**
     * Retorna as configurações de gamificação (para o frontend saber o que exibir).
     */
    public function settings(): JsonResponse
    {
        $user = auth()->user();
        $settings = GamificationSettings::forTenant($user->tenant_id);

        return response()->json([
            'is_enabled' => $settings->is_enabled,
            'show_leaderboard' => $settings->show_leaderboard,
            'show_points_to_users' => $settings->show_points_to_users,
            'sound_enabled' => $settings->sound_enabled,
        ]);
    }
}
