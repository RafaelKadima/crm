import { motion, AnimatePresence } from 'framer-motion'
import { Award, X, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AchievementBadge } from '@/components/gamification/AchievementBadge'
import type { Achievement, UserAchievement } from '@/types'

interface AchievementUnlockProps {
  isVisible: boolean
  achievement: Achievement | null
  userAchievement?: UserAchievement
  onClose: () => void
  autoHideDuration?: number
}

export function AchievementUnlock({
  isVisible,
  achievement,
  userAchievement,
  onClose,
  autoHideDuration = 5000,
}: AchievementUnlockProps) {
  if (!achievement) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="fixed top-20 right-4 z-[9999] max-w-sm"
        >
          <div
            className={cn(
              "relative bg-gradient-to-r from-background via-background to-background/95",
              "rounded-2xl p-4 shadow-2xl border overflow-hidden"
            )}
            style={{
              borderColor: `${achievement.color}40`,
              boxShadow: `0 0 30px ${achievement.color}20`,
            }}
          >
            {/* Animated background glow */}
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 blur-2xl pointer-events-none"
              style={{
                background: `radial-gradient(circle at center, ${achievement.color}30, transparent)`,
              }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex items-start gap-4">
              {/* Badge with animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                  stiffness: 200,
                  damping: 10,
                }}
              >
                <AchievementBadge
                  achievement={achievement}
                  userAchievement={userAchievement}
                  size="lg"
                  showName={false}
                />
              </motion.div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 mb-1"
                >
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500 uppercase tracking-wider">
                    Conquista Desbloqueada!
                  </span>
                </motion.div>

                <motion.h4
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="font-bold text-base mb-1"
                  style={{ color: achievement.color }}
                >
                  {achievement.name}
                </motion.h4>

                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted-foreground line-clamp-2"
                >
                  {achievement.description}
                </motion.p>

                {achievement.points_reward > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium"
                  >
                    +{achievement.points_reward} pontos
                  </motion.div>
                )}
              </div>
            </div>

            {/* Progress bar for auto-hide */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: autoHideDuration / 1000, ease: "linear" }}
              onAnimationComplete={onClose}
              className="absolute bottom-0 left-0 right-0 h-1 origin-left"
              style={{ backgroundColor: achievement.color }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Queue manager for multiple achievements
interface AchievementQueueItem {
  id: string
  achievement: Achievement
  userAchievement?: UserAchievement
}

interface AchievementQueueProps {
  queue: AchievementQueueItem[]
  onDismiss: (id: string) => void
  autoHideDuration?: number
}

export function AchievementQueue({
  queue,
  onDismiss,
  autoHideDuration = 5000,
}: AchievementQueueProps) {
  // Show only the first item, queue the rest
  const currentItem = queue[0]

  if (!currentItem) return null

  return (
    <AchievementUnlock
      isVisible={true}
      achievement={currentItem.achievement}
      userAchievement={currentItem.userAchievement}
      onClose={() => onDismiss(currentItem.id)}
      autoHideDuration={autoHideDuration}
    />
  )
}
