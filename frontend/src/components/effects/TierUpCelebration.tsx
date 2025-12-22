import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Star, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TierBadge } from '@/components/gamification/TierBadge'
import { Button } from '@/components/ui/Button'
import type { GamificationTier } from '@/types'

interface TierUpCelebrationProps {
  isOpen: boolean
  onClose: () => void
  previousTier?: GamificationTier | null
  newTier: GamificationTier
  pointsEarned?: number
}

// Simple confetti particle component
function ConfettiParticle({
  color,
  delay,
  x,
}: {
  color: string
  delay: number
  x: number
}) {
  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: 400,
        x: [0, x * 30, x * 60, x * 90],
        opacity: [1, 1, 0.8, 0],
        rotate: [0, 180, 360, 540],
      }}
      transition={{
        duration: 3,
        delay,
        ease: "easeOut",
      }}
      className="absolute top-0 w-3 h-3 rounded-sm"
      style={{
        backgroundColor: color,
        left: `${50 + x * 20}%`,
      }}
    />
  )
}

// Simple confetti burst
function ConfettiBurst() {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']
  const particles: Array<{ id: number; color: string; delay: number; x: number }> = []

  for (let i = 0; i < 30; i++) {
    particles.push({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      x: (Math.random() - 0.5) * 4,
    })
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
      {particles.map((particle) => (
        <ConfettiParticle
          key={particle.id}
          color={particle.color}
          delay={particle.delay}
          x={particle.x}
        />
      ))}
    </div>
  )
}

export function TierUpCelebration({
  isOpen,
  onClose,
  previousTier,
  newTier,
  pointsEarned,
}: TierUpCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {showConfetti && <ConfettiBurst />}

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative bg-gradient-to-b from-background to-background/95 rounded-3xl p-8 max-w-md w-full text-center pointer-events-auto shadow-2xl border"
              style={{
                borderColor: `${newTier.color}40`,
                boxShadow: `0 0 100px ${newTier.color}30`,
              }}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Sparkles Animation */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-0 pointer-events-none"
              >
                <Sparkles className="absolute top-8 left-8 h-6 w-6 text-amber-400/50" />
                <Sparkles className="absolute top-12 right-12 h-4 w-4 text-amber-400/30" />
                <Sparkles className="absolute bottom-16 left-12 h-5 w-5 text-amber-400/40" />
                <Sparkles className="absolute bottom-8 right-8 h-6 w-6 text-amber-400/50" />
              </motion.div>

              {/* Crown Animation */}
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-4"
              >
                <Crown className="h-12 w-12 mx-auto text-amber-500" />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold mb-2"
              >
                Parabéns! 🎉
              </motion.h2>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-6"
              >
                Você subiu de nível!
              </motion.p>

              {/* Tier Transition */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-4 mb-6"
              >
                {previousTier && (
                  <>
                    <TierBadge tier={previousTier} size="md" showName={false} />
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="text-2xl"
                    >
                      →
                    </motion.div>
                  </>
                )}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.7,
                    type: "spring",
                    stiffness: 300,
                    damping: 10,
                  }}
                >
                  <TierBadge tier={newTier} size="lg" animate />
                </motion.div>
              </motion.div>

              {/* New Tier Name */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mb-4"
              >
                <h3
                  className="text-xl font-bold"
                  style={{ color: newTier.color }}
                >
                  {newTier.name}
                </h3>
              </motion.div>

              {/* Benefits */}
              {newTier.benefits && newTier.benefits.length > 0 && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mb-6 p-4 rounded-xl bg-muted/50"
                >
                  <h4 className="text-sm font-medium mb-2">Novos benefícios:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {newTier.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-amber-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Points Earned */}
              {pointsEarned !== undefined && pointsEarned > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1 }}
                  className="mb-6 text-green-500 font-bold"
                >
                  +{pointsEarned} pontos ganhos!
                </motion.div>
              )}

              {/* Close Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.1 }}
              >
                <Button
                  onClick={onClose}
                  className="w-full"
                  style={{
                    background: `linear-gradient(135deg, ${newTier.color}, ${newTier.color}CC)`,
                  }}
                >
                  Continuar
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
