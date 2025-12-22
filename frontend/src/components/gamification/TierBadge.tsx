import { motion } from 'framer-motion'
import { Trophy, Star, Crown, Diamond, Medal, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GamificationTier } from '@/types'

interface TierBadgeProps {
  tier: GamificationTier | null
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  animate?: boolean
  className?: string
}

// Default tier icons based on common tier names
const getTierIcon = (tierSlug?: string) => {
  if (!tierSlug) return Star
  const slug = tierSlug.toLowerCase()
  if (slug.includes('diamond') || slug.includes('diamante')) return Diamond
  if (slug.includes('gold') || slug.includes('ouro')) return Crown
  if (slug.includes('silver') || slug.includes('prata')) return Medal
  if (slug.includes('platinum') || slug.includes('platina')) return Award
  if (slug.includes('bronze')) return Trophy
  return Star
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-12 w-12 text-sm',
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
}

export function TierBadge({
  tier,
  size = 'md',
  showName = true,
  animate = false,
  className,
}: TierBadgeProps) {
  if (!tier) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "rounded-full bg-muted flex items-center justify-center",
          sizeClasses[size]
        )}>
          <Star className={cn(iconSizes[size], "text-muted-foreground")} />
        </div>
        {showName && (
          <span className="text-sm text-muted-foreground">Sem tier</span>
        )}
      </div>
    )
  }

  const Icon = getTierIcon(tier.slug)
  const tierColor = tier.color || '#6366f1'

  const badge = (
    <div
      className={cn(
        "rounded-full flex items-center justify-center",
        sizeClasses[size]
      )}
      style={{
        background: `linear-gradient(135deg, ${tierColor}, ${tierColor}CC)`,
        boxShadow: `0 0 ${size === 'lg' ? '20px' : '10px'} ${tierColor}40`,
      }}
    >
      <Icon className={cn(iconSizes[size], "text-white")} />
    </div>
  )

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {animate ? (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          {badge}
        </motion.div>
      ) : (
        badge
      )}
      {showName && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-semibold",
              size === 'sm' && "text-xs",
              size === 'md' && "text-sm",
              size === 'lg' && "text-base"
            )}
            style={{ color: tierColor }}
          >
            {tier.name}
          </span>
          {size === 'lg' && tier.benefits && tier.benefits.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {tier.benefits[0]}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
