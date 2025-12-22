import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PointsPopupProps {
  points: number
  position?: { x: number; y: number }
  onComplete?: () => void
}

export function PointsPopup({
  points,
  position = { x: 50, y: 50 },
  onComplete,
}: PointsPopupProps) {
  if (points <= 0) return null

  const isBonus = points >= 100

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.5,
        y: 0,
      }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1.2, 1, 0.8],
        y: [0, -20, -40, -80],
      }}
      transition={{
        duration: 1.5,
        times: [0, 0.2, 0.5, 1],
        ease: "easeOut",
      }}
      onAnimationComplete={onComplete}
      className={cn(
        "fixed z-[9999] pointer-events-none flex items-center gap-1",
        "font-bold text-lg",
        isBonus ? "text-amber-400" : "text-green-400"
      )}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translateX(-50%)',
      }}
    >
      <motion.div
        animate={{
          rotate: [0, -10, 10, -10, 10, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 0.5,
          repeat: isBonus ? 2 : 0,
        }}
      >
        <Zap className={cn(
          "h-5 w-5",
          isBonus && "h-6 w-6"
        )} />
      </motion.div>
      <span className={cn(isBonus && "text-xl")}>
        +{points} pts
      </span>
      {isBonus && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="ml-1 px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full"
        >
          BONUS!
        </motion.span>
      )}
    </motion.div>
  )
}

// Container to manage multiple popups
interface PointsPopupManagerProps {
  popups: Array<{
    id: string
    points: number
    position?: { x: number; y: number }
  }>
  onRemove: (id: string) => void
}

export function PointsPopupManager({ popups, onRemove }: PointsPopupManagerProps) {
  return (
    <AnimatePresence mode="popLayout">
      {popups.map((popup) => (
        <PointsPopup
          key={popup.id}
          points={popup.points}
          position={popup.position}
          onComplete={() => onRemove(popup.id)}
        />
      ))}
    </AnimatePresence>
  )
}
