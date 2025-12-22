import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import echo from '@/lib/echo'
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

    console.log('🎮 Connecting to gamification channel for user:', userId)
    const channel = echo.private(`user.${userId}`)

    channel
      .subscribed(() => {
        console.log('✅ Subscribed to gamification channel')
      })
      .error((error: any) => {
        console.error('❌ Error subscribing to gamification channel:', error)
      })
      // Points earned event
      .listen('.points.earned', (data: PointsEarnedEvent) => {
        console.log('🎯 Points earned:', data)

        // Show points popup
        showPointsPopup(data.points)

        // Invalidate gamification queries
        queryClient.invalidateQueries({ queryKey: ['gamification'] })
      })
      // Tier changed event
      .listen('.tier.changed', (data: TierChangedEvent) => {
        console.log('🏆 Tier changed:', data)

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
        console.log('🏅 Achievement unlocked:', data)

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
        console.log('✅ Activity completed:', data)

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
      console.log('🔌 Disconnecting from gamification channel')
      echo.leave(`user.${userId}`)
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

    const channel = echo.private(`tenant.${tenantId}`)

    channel.listen('.leaderboard.updated', () => {
      console.log('📊 Leaderboard updated')
      queryClient.invalidateQueries({ queryKey: ['gamification', 'leaderboard'] })
    })

    return () => {
      // Don't leave the channel here as it might be used by other hooks
    }
  }, [tenantId, queryClient])
}
