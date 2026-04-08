import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getEcho } from '@/lib/echo'
import { useEffects } from '@/contexts/EffectsContext'
import type { GamificationTier, Achievement, UserAchievement } from '@/types'

// Event types from Laravel
interface PointsEarnedEvent {
  user_id: string
  points: number
  action: string
  total_points: number
  description?: string
}

interface TierChangedEvent {
  user_id: string
  previous_tier: GamificationTier | null
  new_tier: GamificationTier
  points_earned?: number
}

interface AchievementUnlockedEvent {
  user_id: string
  achievement: Achievement
  user_achievement: UserAchievement
  points_earned: number
}

interface ActivityCompletedEvent {
  activity_id: string
  activity_title?: string
  lead_id: string
  points_earned: number
}

/**
 * Hook to listen for gamification events for the current user
 */
export function useGamificationWebSocket(userId: string | null) {
  const queryClient = useQueryClient()
  const { showPointsPopup, showTierUpCelebration, showAchievementUnlock } = useEffects()

  useEffect(() => {
    if (!userId) return
    const echoInstance = getEcho()
    if (!echoInstance) return

    const channel = echoInstance.private(`user.${userId}`)

    channel
      // Points earned event
      .listen('.points.earned', (data: PointsEarnedEvent) => {

        // Show points popup
        showPointsPopup(data.points)

        // Invalidate gamification queries
        queryClient.invalidateQueries({ queryKey: ['gamification'] })
      })
      // Tier changed event
      .listen('.tier.changed', (data: TierChangedEvent) => {
        // Show tier up celebration
        showTierUpCelebration({
          previousTier: data.previous_tier,
          newTier: data.new_tier,
          pointsEarned: data.points_earned,
        })

        // Invalidate gamification queries
        queryClient.invalidateQueries({ queryKey: ['gamification'] })
      })
      // Achievement unlocked event
      .listen('.achievement.unlocked', (data: AchievementUnlockedEvent) => {
        // Show achievement notification
        showAchievementUnlock({
          achievement: data.achievement,
          userAchievement: data.user_achievement,
        })

        // Also show points if any
        if (data.points_earned > 0) {
          setTimeout(() => {
            showPointsPopup(data.points_earned, { x: 70, y: 20 })
          }, 500)
        }

        // Invalidate gamification queries
        queryClient.invalidateQueries({ queryKey: ['gamification'] })
      })
      // Activity completed event
      .listen('.activity.completed', (data: ActivityCompletedEvent) => {
        // Show points if earned
        if (data.points_earned > 0) {
          showPointsPopup(data.points_earned)
        }

        // Invalidate lead activities
        if (data.lead_id) {
          queryClient.invalidateQueries({ queryKey: ['lead-stage-activities', data.lead_id] })
          queryClient.invalidateQueries({ queryKey: ['lead-stage-progress', data.lead_id] })
        }

        // Invalidate gamification
        queryClient.invalidateQueries({ queryKey: ['gamification'] })
      })

    return () => {
      getEcho()?.leave(`user.${userId}`)
    }
  }, [userId, queryClient, showPointsPopup, showTierUpCelebration, showAchievementUnlock])
}

/**
 * Hook to listen for leaderboard updates (for real-time leaderboard)
 */
export function useLeaderboardWebSocket(tenantId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tenantId) return
    const echoInstance = getEcho()
    if (!echoInstance) return

    const channel = echoInstance.private(`tenant.${tenantId}`)

    channel.listen('.leaderboard.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', 'leaderboard'] })
    })

    return () => {
      // Don't leave the channel here as it might be used by other hooks
    }
  }, [tenantId, queryClient])
}
