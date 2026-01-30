import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { PointsPopupManager } from '@/components/effects/PointsPopup'
import { TierUpCelebration } from '@/components/effects/TierUpCelebration'
import { AchievementQueue } from '@/components/effects/AchievementUnlock'
import { useGamificationSounds } from '@/hooks/useSounds'
import type { GamificationTier, Achievement, UserAchievement } from '@/types'

// Types
interface PointsPopup {
  id: string
  points: number
  position?: { x: number; y: number }
}

interface TierUpData {
  previousTier: GamificationTier | null
  newTier: GamificationTier
  pointsEarned?: number
}

interface AchievementData {
  id: string
  achievement: Achievement
  userAchievement?: UserAchievement
}

// Context Interface
interface EffectsContextValue {
  // Points popup
  showPointsPopup: (points: number, position?: { x: number; y: number }) => void

  // Tier up celebration
  showTierUpCelebration: (data: TierUpData) => void

  // Achievement unlock
  showAchievementUnlock: (data: Omit<AchievementData, 'id'>) => void

  // Deal won celebration
  showDealWonCelebration: () => void
}

const EffectsContext = createContext<EffectsContextValue | null>(null)

// Provider
interface EffectsProviderProps {
  children: ReactNode
}

export function EffectsProvider({ children }: EffectsProviderProps) {
  // State
  const [pointsPopups, setPointsPopups] = useState<PointsPopup[]>([])
  const [tierUpData, setTierUpData] = useState<TierUpData | null>(null)
  const [isTierUpOpen, setIsTierUpOpen] = useState(false)
  const [achievementQueue, setAchievementQueue] = useState<AchievementData[]>([])

  // Sounds
  const sounds = useGamificationSounds()

  // Show points popup
  const showPointsPopup = useCallback((points: number, position?: { x: number; y: number }) => {
    const id = `points-${Date.now()}-${Math.random()}`
    setPointsPopups((prev) => [
      ...prev,
      { id, points, position: position || { x: 50, y: 30 } },
    ])
    sounds.onPointsEarned(points)
  }, [sounds])

  // Remove points popup
  const removePointsPopup = useCallback((id: string) => {
    setPointsPopups((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // Show tier up celebration
  const showTierUpCelebration = useCallback((data: TierUpData) => {
    setTierUpData(data)
    setIsTierUpOpen(true)
    sounds.onTierUp()
  }, [sounds])

  // Close tier up celebration
  const closeTierUpCelebration = useCallback(() => {
    setIsTierUpOpen(false)
    setTierUpData(null)
  }, [])

  // Show achievement unlock
  const showAchievementUnlock = useCallback((data: Omit<AchievementData, 'id'>) => {
    const id = `achievement-${Date.now()}-${Math.random()}`
    setAchievementQueue((prev) => [...prev, { ...data, id }])
    sounds.onAchievement()
  }, [sounds])

  // Dismiss achievement
  const dismissAchievement = useCallback((id: string) => {
    setAchievementQueue((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // Show deal won celebration
  const showDealWonCelebration = useCallback(() => {
    sounds.onDealWon()
    // Could also trigger confetti or other effects
  }, [sounds])

  // Context value
  const value: EffectsContextValue = {
    showPointsPopup,
    showTierUpCelebration,
    showAchievementUnlock,
    showDealWonCelebration,
  }

  return (
    <EffectsContext.Provider value={value}>
      {children}

      {/* Points Popups */}
      <PointsPopupManager
        popups={pointsPopups}
        onRemove={removePointsPopup}
      />

      {/* Tier Up Celebration */}
      {tierUpData && (
        <TierUpCelebration
          isOpen={isTierUpOpen}
          onClose={closeTierUpCelebration}
          previousTier={tierUpData.previousTier}
          newTier={tierUpData.newTier}
          pointsEarned={tierUpData.pointsEarned}
        />
      )}

      {/* Achievement Queue */}
      <AchievementQueue
        queue={achievementQueue}
        onDismiss={dismissAchievement}
      />
    </EffectsContext.Provider>
  )
}

// Hook to use effects
export function useEffects() {
  const context = useContext(EffectsContext)
  if (!context) {
    throw new Error('useEffects must be used within an EffectsProvider')
  }
  return context
}
