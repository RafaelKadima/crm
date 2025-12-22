import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gamificationApi, gamificationAdminApi } from '@/api/endpoints'
import type {
  GamificationTier,
  PointRule,
  Reward,
  Achievement,
  GamificationSettings,
} from '@/types'

// =============================================================================
// USER-FACING GAMIFICATION HOOKS
// =============================================================================

export function useGamificationStats() {
  return useQuery({
    queryKey: ['gamification', 'my-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getMyStats()
      return response.data
    },
  })
}

export function useMyPoints() {
  return useQuery({
    queryKey: ['gamification', 'my-points'],
    queryFn: async () => {
      const response = await gamificationApi.getMyPoints()
      return response.data
    },
  })
}

export function useMyAchievements() {
  return useQuery({
    queryKey: ['gamification', 'my-achievements'],
    queryFn: async () => {
      const response = await gamificationApi.getMyAchievements()
      return response.data
    },
  })
}

export function useMyRewards() {
  return useQuery({
    queryKey: ['gamification', 'my-rewards'],
    queryFn: async () => {
      const response = await gamificationApi.getMyRewards()
      return response.data
    },
  })
}

export function useLeaderboard(params?: { period?: string; limit?: number }) {
  return useQuery({
    queryKey: ['gamification', 'leaderboard', params],
    queryFn: async () => {
      const response = await gamificationApi.getLeaderboard(params)
      return response.data
    },
  })
}

export function useGamificationTiers() {
  return useQuery({
    queryKey: ['gamification', 'tiers'],
    queryFn: async () => {
      const response = await gamificationApi.getTiers()
      return response.data
    },
  })
}

export function useAvailableAchievements() {
  return useQuery({
    queryKey: ['gamification', 'achievements'],
    queryFn: async () => {
      const response = await gamificationApi.getAchievements()
      return response.data
    },
  })
}

export function useAvailableRewards() {
  return useQuery({
    queryKey: ['gamification', 'rewards'],
    queryFn: async () => {
      const response = await gamificationApi.getRewards()
      return response.data
    },
  })
}

export function useClaimReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (rewardId: string) => gamificationApi.claimReward(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification'] })
    },
  })
}

export function usePointTransactions(params?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['gamification', 'transactions', params],
    queryFn: async () => {
      const response = await gamificationApi.getTransactions(params)
      return response.data
    },
  })
}

export function usePublicGamificationSettings() {
  return useQuery({
    queryKey: ['gamification', 'public-settings'],
    queryFn: async () => {
      const response = await gamificationApi.getPublicSettings()
      return response.data
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  })
}

// =============================================================================
// ADMIN GAMIFICATION HOOKS
// =============================================================================

export function useGamificationSettings() {
  return useQuery({
    queryKey: ['gamification-admin', 'settings'],
    queryFn: async () => {
      const response = await gamificationAdminApi.getSettings()
      return response.data
    },
  })
}

export function useUpdateGamificationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<GamificationSettings>) =>
      gamificationAdminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'settings'] })
    },
  })
}

// Tiers Admin
export function useAdminTiers() {
  return useQuery({
    queryKey: ['gamification-admin', 'tiers'],
    queryFn: async () => {
      const response = await gamificationAdminApi.listTiers()
      return response.data
    },
  })
}

export function useCreateTier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<GamificationTier>) =>
      gamificationAdminApi.createTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'tiers'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'tiers'] })
    },
  })
}

export function useUpdateTier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GamificationTier> }) =>
      gamificationAdminApi.updateTier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'tiers'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'tiers'] })
    },
  })
}

export function useDeleteTier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => gamificationAdminApi.deleteTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'tiers'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'tiers'] })
    },
  })
}

// Point Rules Admin
export function useAdminPointRules() {
  return useQuery({
    queryKey: ['gamification-admin', 'point-rules'],
    queryFn: async () => {
      const response = await gamificationAdminApi.listPointRules()
      return response.data
    },
  })
}

export function useCreatePointRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<PointRule>) =>
      gamificationAdminApi.createPointRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'point-rules'] })
    },
  })
}

export function useUpdatePointRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PointRule> }) =>
      gamificationAdminApi.updatePointRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'point-rules'] })
    },
  })
}

export function useDeletePointRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => gamificationAdminApi.deletePointRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'point-rules'] })
    },
  })
}

export function useTogglePointRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => gamificationAdminApi.togglePointRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'point-rules'] })
    },
  })
}

// Rewards Admin
export function useAdminRewards() {
  return useQuery({
    queryKey: ['gamification-admin', 'rewards'],
    queryFn: async () => {
      const response = await gamificationAdminApi.listRewards()
      return response.data
    },
  })
}

export function useCreateReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Reward>) =>
      gamificationAdminApi.createReward(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'rewards'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'rewards'] })
    },
  })
}

export function useUpdateReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Reward> }) =>
      gamificationAdminApi.updateReward(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'rewards'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'rewards'] })
    },
  })
}

export function useDeleteReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => gamificationAdminApi.deleteReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'rewards'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'rewards'] })
    },
  })
}

// Achievements Admin
export function useAdminAchievements() {
  return useQuery({
    queryKey: ['gamification-admin', 'achievements'],
    queryFn: async () => {
      const response = await gamificationAdminApi.listAchievements()
      return response.data
    },
  })
}

export function useCreateAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Achievement>) =>
      gamificationAdminApi.createAchievement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'achievements'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'achievements'] })
    },
  })
}

export function useUpdateAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Achievement> }) =>
      gamificationAdminApi.updateAchievement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'achievements'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'achievements'] })
    },
  })
}

export function useDeleteAchievement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => gamificationAdminApi.deleteAchievement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'achievements'] })
      queryClient.invalidateQueries({ queryKey: ['gamification', 'achievements'] })
    },
  })
}

// User Rewards Admin
export function useAdminUserRewards(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['gamification-admin', 'user-rewards', params],
    queryFn: async () => {
      const response = await gamificationAdminApi.listUserRewards(params)
      return response.data
    },
  })
}

export function useApproveUserReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => gamificationAdminApi.approveUserReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'user-rewards'] })
    },
  })
}

export function useDeliverUserReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => gamificationAdminApi.deliverUserReward(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'user-rewards'] })
    },
  })
}

export function useRejectUserReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      gamificationAdminApi.rejectUserReward(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'user-rewards'] })
    },
  })
}

export function useUpdateUserReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string } }) =>
      gamificationAdminApi.updateUserReward(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-admin', 'user-rewards'] })
    },
  })
}

// Admin Stats
export function useGamificationAdminStats() {
  return useQuery({
    queryKey: ['gamification-admin', 'stats'],
    queryFn: async () => {
      const response = await gamificationAdminApi.getStats()
      return response.data
    },
  })
}
