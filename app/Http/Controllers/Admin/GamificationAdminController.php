<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\GamificationSettings;
use App\Models\GamificationTier;
use App\Models\PointRule;
use App\Models\Reward;
use App\Models\UserReward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GamificationAdminController extends Controller
{
    // =============================================
    // TIERS
    // =============================================

    public function indexTiers(): JsonResponse
    {
        $user = auth()->user();
        $tiers = GamificationTier::where('tenant_id', $user->tenant_id)
            ->ordered()
            ->with('rewards')
            ->get();

        return response()->json($tiers);
    }

    public function storeTier(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'required|string|max:50',
            'color' => 'required|string|max:20',
            'min_points' => 'required|integer|min:0',
            'max_points' => 'nullable|integer|min:0',
            'order' => 'nullable|integer|min:0',
        ]);

        if (!isset($validated['order'])) {
            $maxOrder = GamificationTier::where('tenant_id', $user->tenant_id)->max('order') ?? -1;
            $validated['order'] = $maxOrder + 1;
        }

        $validated['tenant_id'] = $user->tenant_id;

        $tier = GamificationTier::create($validated);

        return response()->json([
            'message' => 'Tier criado com sucesso.',
            'tier' => $tier,
        ], 201);
    }

    public function updateTier(Request $request, GamificationTier $tier): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'min_points' => 'nullable|integer|min:0',
            'max_points' => 'nullable|integer|min:0',
            'order' => 'nullable|integer|min:0',
        ]);

        $tier->update($validated);

        return response()->json([
            'message' => 'Tier atualizado.',
            'tier' => $tier,
        ]);
    }

    public function destroyTier(GamificationTier $tier): JsonResponse
    {
        $tier->delete();

        return response()->json([
            'message' => 'Tier removido.',
        ]);
    }

    // =============================================
    // REWARDS
    // =============================================

    public function indexRewards(): JsonResponse
    {
        $user = auth()->user();
        $rewards = Reward::where('tenant_id', $user->tenant_id)
            ->with('tier')
            ->get();

        return response()->json($rewards);
    }

    public function storeReward(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'tier_id' => 'required|uuid|exists:gamification_tiers,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|url',
            'type' => 'nullable|string|in:physical,digital,experience,bonus',
            'value' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['tenant_id'] = $user->tenant_id;

        $reward = Reward::create($validated);

        return response()->json([
            'message' => 'Recompensa criada com sucesso.',
            'reward' => $reward->load('tier'),
        ], 201);
    }

    public function updateReward(Request $request, Reward $reward): JsonResponse
    {
        $validated = $request->validate([
            'tier_id' => 'nullable|uuid|exists:gamification_tiers,id',
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|url',
            'type' => 'nullable|string|in:physical,digital,experience,bonus',
            'value' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $reward->update($validated);

        return response()->json([
            'message' => 'Recompensa atualizada.',
            'reward' => $reward->load('tier'),
        ]);
    }

    public function destroyReward(Reward $reward): JsonResponse
    {
        $reward->delete();

        return response()->json([
            'message' => 'Recompensa removida.',
        ]);
    }

    // =============================================
    // POINT RULES
    // =============================================

    public function indexPointRules(): JsonResponse
    {
        $user = auth()->user();
        $rules = PointRule::where('tenant_id', $user->tenant_id)->get();

        return response()->json($rules);
    }

    public function storePointRule(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'action_type' => 'required|string|max:100',
            'entity_type' => 'nullable|string|max:100',
            'entity_id' => 'nullable|uuid',
            'points' => 'required|integer',
            'multiplier' => 'nullable|numeric|min:0.1|max:10',
            'conditions' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['tenant_id'] = $user->tenant_id;

        $rule = PointRule::create($validated);

        return response()->json([
            'message' => 'Regra de pontos criada.',
            'rule' => $rule,
        ], 201);
    }

    public function updatePointRule(Request $request, PointRule $rule): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'action_type' => 'nullable|string|max:100',
            'entity_type' => 'nullable|string|max:100',
            'entity_id' => 'nullable|uuid',
            'points' => 'nullable|integer',
            'multiplier' => 'nullable|numeric|min:0.1|max:10',
            'conditions' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $rule->update($validated);

        return response()->json([
            'message' => 'Regra de pontos atualizada.',
            'rule' => $rule,
        ]);
    }

    public function destroyPointRule(PointRule $rule): JsonResponse
    {
        $rule->delete();

        return response()->json([
            'message' => 'Regra de pontos removida.',
        ]);
    }

    // =============================================
    // ACHIEVEMENTS
    // =============================================

    public function indexAchievements(): JsonResponse
    {
        $user = auth()->user();
        $achievements = Achievement::where('tenant_id', $user->tenant_id)->get();

        return response()->json($achievements);
    }

    public function storeAchievement(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'required|string|max:50',
            'condition_type' => 'required|string|max:100',
            'condition_value' => 'required|array',
            'points_bonus' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $validated['tenant_id'] = $user->tenant_id;

        $achievement = Achievement::create($validated);

        return response()->json([
            'message' => 'Achievement criado.',
            'achievement' => $achievement,
        ], 201);
    }

    public function updateAchievement(Request $request, Achievement $achievement): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:50',
            'condition_type' => 'nullable|string|max:100',
            'condition_value' => 'nullable|array',
            'points_bonus' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $achievement->update($validated);

        return response()->json([
            'message' => 'Achievement atualizado.',
            'achievement' => $achievement,
        ]);
    }

    public function destroyAchievement(Achievement $achievement): JsonResponse
    {
        $achievement->delete();

        return response()->json([
            'message' => 'Achievement removido.',
        ]);
    }

    // =============================================
    // SETTINGS
    // =============================================

    public function showSettings(): JsonResponse
    {
        $user = auth()->user();
        $settings = GamificationSettings::forTenant($user->tenant_id);

        return response()->json($settings);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $user = auth()->user();

        $validated = $request->validate([
            'is_enabled' => 'nullable|boolean',
            'reset_period' => 'nullable|string|in:monthly,quarterly,yearly,never',
            'show_leaderboard' => 'nullable|boolean',
            'show_points_to_users' => 'nullable|boolean',
            'notify_tier_change' => 'nullable|boolean',
            'notify_achievement' => 'nullable|boolean',
            'sound_enabled' => 'nullable|boolean',
        ]);

        $settings = GamificationSettings::forTenant($user->tenant_id);
        $settings->update($validated);

        return response()->json([
            'message' => 'Configurações atualizadas.',
            'settings' => $settings,
        ]);
    }

    // =============================================
    // USER REWARDS (Gestão)
    // =============================================

    public function indexUserRewards(Request $request): JsonResponse
    {
        $user = auth()->user();
        $status = $request->get('status');

        $query = UserReward::where('tenant_id', $user->tenant_id)
            ->with(['user', 'reward', 'tier', 'approvedByUser']);

        if ($status) {
            $query->where('status', $status);
        }

        $rewards = $query->latest('requested_at')->get();

        return response()->json($rewards);
    }

    public function approveUserReward(Request $request, UserReward $userReward): JsonResponse
    {
        $user = auth()->user();

        if (!$userReward->isPending()) {
            return response()->json(['error' => 'Recompensa já foi processada.'], 400);
        }

        $notes = $request->get('notes');
        $userReward->approve($user, $notes);

        return response()->json([
            'message' => 'Recompensa aprovada.',
            'user_reward' => $userReward->load(['user', 'reward', 'tier']),
        ]);
    }

    public function rejectUserReward(Request $request, UserReward $userReward): JsonResponse
    {
        $user = auth()->user();

        if (!$userReward->isPending()) {
            return response()->json(['error' => 'Recompensa já foi processada.'], 400);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $userReward->reject($user, $validated['reason']);

        return response()->json([
            'message' => 'Recompensa rejeitada.',
            'user_reward' => $userReward->load(['user', 'reward', 'tier']),
        ]);
    }

    public function deliverUserReward(Request $request, UserReward $userReward): JsonResponse
    {
        if (!$userReward->isApproved()) {
            return response()->json(['error' => 'Recompensa precisa estar aprovada para ser entregue.'], 400);
        }

        $notes = $request->get('notes');
        $userReward->markDelivered($notes);

        return response()->json([
            'message' => 'Recompensa marcada como entregue.',
            'user_reward' => $userReward->load(['user', 'reward', 'tier']),
        ]);
    }

    /**
     * Retorna os tipos de ações disponíveis para regras de pontos.
     */
    public function getActionTypes(): JsonResponse
    {
        return response()->json(PointRule::ACTION_TYPES);
    }

    /**
     * Retorna os tipos de condições disponíveis para achievements.
     */
    public function getConditionTypes(): JsonResponse
    {
        return response()->json(Achievement::CONDITION_TYPES);
    }
}
