import { useCallback, useEffect, useRef } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Sound settings store
interface SoundSettingsState {
  enabled: boolean
  volume: number
  setEnabled: (enabled: boolean) => void
  setVolume: (volume: number) => void
  toggle: () => void
}

export const useSoundSettings = create<SoundSettingsState>()(
  persist(
    (set) => ({
      enabled: true,
      volume: 0.8,
      setEnabled: (enabled) => set({ enabled }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      toggle: () => set((state) => ({ enabled: !state.enabled })),
    }),
    {
      name: 'sound-settings',
    }
  )
)

// Sound types
export type SoundType =
  | 'activity-complete'
  | 'stage-enter'
  | 'points-earned'
  | 'tier-up'
  | 'achievement'
  | 'deal-won'
  | 'notification'
  | 'new-message'
  | 'click'
  | 'error'
  | 'success'

// Sound file mapping
const SOUND_FILES: Record<SoundType, string> = {
  'activity-complete': '/sounds/activity-complete.mp3',
  'stage-enter': '/sounds/stage-enter.mp3',
  'points-earned': '/sounds/points-earned.mp3',
  'tier-up': '/sounds/tier-up.mp3',
  'achievement': '/sounds/achievement.mp3',
  'deal-won': '/sounds/deal-won.mp3',
  'notification': '/sounds/notification.mp3',
  'new-message': '/sounds/notification.mp3',
  'click': '/sounds/click.mp3',
  'error': '/sounds/error.mp3',
  'success': '/sounds/success.mp3',
}

// Audio cache to preload sounds
const audioCache = new Map<SoundType, HTMLAudioElement>()

// Preload a sound
function preloadSound(type: SoundType): HTMLAudioElement {
  const cached = audioCache.get(type)
  if (cached) return cached

  const audio = new Audio(SOUND_FILES[type])
  audio.preload = 'auto'
  audioCache.set(type, audio)
  return audio
}

// Preload all sounds on first user interaction
let preloaded = false
function preloadAllSounds() {
  if (preloaded) return
  preloaded = true
  Object.keys(SOUND_FILES).forEach((type) => {
    preloadSound(type as SoundType)
  })
}

// Listen for first interaction to preload
if (typeof window !== 'undefined') {
  const preloadOnInteraction = () => {
    preloadAllSounds()
    window.removeEventListener('click', preloadOnInteraction)
    window.removeEventListener('keydown', preloadOnInteraction)
  }
  window.addEventListener('click', preloadOnInteraction, { once: true })
  window.addEventListener('keydown', preloadOnInteraction, { once: true })
}

// Main hook
export function useSounds() {
  const { enabled, volume } = useSoundSettings()

  const play = useCallback(
    async (type: SoundType) => {
      if (!enabled) return

      try {
        const audio = preloadSound(type)
        // Clone the audio to allow overlapping sounds
        const clone = audio.cloneNode(true) as HTMLAudioElement
        clone.volume = volume
        await clone.play()

        // Clean up after playing
        clone.onended = () => {
          clone.remove()
        }
      } catch (error) {
        // Silently fail if audio can't play (browser policy, etc.)
        console.debug('Sound failed to play:', error)
      }
    },
    [enabled, volume]
  )

  // Specific sound functions for convenience
  const sounds = {
    play,
    activityComplete: useCallback(() => play('activity-complete'), [play]),
    stageEnter: useCallback(() => play('stage-enter'), [play]),
    pointsEarned: useCallback(() => play('points-earned'), [play]),
    tierUp: useCallback(() => play('tier-up'), [play]),
    achievement: useCallback(() => play('achievement'), [play]),
    dealWon: useCallback(() => play('deal-won'), [play]),
    notification: useCallback(() => play('notification'), [play]),
    newMessage: useCallback(() => play('new-message'), [play]),
    click: useCallback(() => play('click'), [play]),
    error: useCallback(() => play('error'), [play]),
    success: useCallback(() => play('success'), [play]),
  }

  return sounds
}

// Hook for gamification-specific sounds
export function useGamificationSounds() {
  const sounds = useSounds()

  return {
    onPointsEarned: useCallback(
      (points: number) => {
        // Play multiple sounds for more points
        sounds.pointsEarned()
        if (points >= 100) {
          setTimeout(() => sounds.pointsEarned(), 150)
        }
        if (points >= 500) {
          setTimeout(() => sounds.pointsEarned(), 300)
        }
      },
      [sounds]
    ),
    onTierUp: sounds.tierUp,
    onAchievement: sounds.achievement,
    onActivityComplete: sounds.activityComplete,
    onDealWon: sounds.dealWon,
  }
}
