import { motion } from 'framer-motion'
import {
  Star,
  Flame,
  Target,
  Rocket,
  Zap,
  Award,
  Trophy,
  Crown,
  Medal,
  Heart,
  Users,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Achievement, UserAchievement } from '@/types'

interface AchievementBadgeProps {
  achievement: Achievement
  userAchievement?: UserAchievement
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  showDescription?: boolean
  locked?: boolean
  onClick?: () => void
  className?: string
}

// Map condition types to icons
const achievementIcons: Record<string, typeof Star> = {
  deals_won: Trophy,
  deals_value: TrendingUp,
  activities_completed: Target,
  streak_days: Flame,
  first_deal: Rocket,
  team_player: Users,
  top_performer: Crown,
  quick_closer: Zap,
  customer_favorite: Heart,
  consistent: Medal,
  default: Award,
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-20 w-20',
}

const iconSizes = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
}

export function AchievementBadge({
  achievement,
  userAchievement,
  size = 'md',
  showName = true,
  showDescription = false,
  locked = false,
  onClick,
  className,
}: AchievementBadgeProps) {
  const Icon = achievementIcons[achievement.condition_type] || achievementIcons.default
  const isEarned = !!userAchievement
  const isSecret = achievement.is_secret && !isEarned
  const color = achievement.color || '#6366f1'

  const badge = (
    <div
      className={cn(
        "rounded-2xl flex items-center justify-center relative transition-all",
        sizeClasses[size],
        isEarned && !locked
          ? "ring-2 ring-offset-2 ring-offset-background"
          : "opacity-40 grayscale",
        onClick && "cursor-pointer hover:scale-105"
      )}
      style={{
        background: isEarned
          ? `linear-gradient(135deg, ${color}, ${color}CC)`
          : 'hsl(var(--muted))',
        ringColor: isEarned ? color : undefined,
        boxShadow: isEarned ? `0 0 20px ${color}40` : undefined,
      }}
      onClick={onClick}
    >
      {isSecret ? (
        <span className="text-2xl">?</span>
      ) : (
        <Icon className={cn(iconSizes[size], isEarned ? "text-white" : "text-muted-foreground")} />
      )}

      {/* Points badge */}
      {isEarned && achievement.points_reward > 0 && size !== 'sm' && (
        <div
          className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          +{achievement.points_reward}
        </div>
      )}
    </div>
  )

  if (!showName && !showDescription) {
    return badge
  }

  return (
    <div className={cn("flex items-start gap-3", className)}>
      {badge}
      <div className="min-w-0">
        <h4 className={cn(
          "font-semibold truncate",
          size === 'sm' && "text-xs",
          size === 'md' && "text-sm",
          size === 'lg' && "text-base"
        )}>
          {isSecret ? 'Conquista Secreta' : achievement.name}
        </h4>
        {showDescription && !isSecret && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {achievement.description}
          </p>
        )}
        {isEarned && userAchievement?.earned_at && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Conquistado em {new Date(userAchievement.earned_at).toLocaleDateString('pt-BR')}
          </p>
        )}
        {!isEarned && !isSecret && userAchievement?.progress !== undefined && (
          <div className="mt-1">
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((userAchievement.progress / achievement.condition_value) * 100, 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {userAchievement.progress}/{achievement.condition_value}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Grid of achievements
export function AchievementsGrid({
  achievements,
  userAchievements = [],
  className,
}: {
  achievements: Achievement[]
  userAchievements?: UserAchievement[]
  className?: string
}) {
  const userAchievementMap = new Map(
    userAchievements.map((ua) => [ua.achievement_id, ua])
  )

  // Sort: earned first, then by name
  const sortedAchievements = [...achievements].sort((a, b) => {
    const aEarned = userAchievementMap.has(a.id)
    const bEarned = userAchievementMap.has(b.id)
    if (aEarned && !bEarned) return -1
    if (!aEarned && bEarned) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
      {sortedAchievements.map((achievement, index) => (
        <motion.div
          key={achievement.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all"
        >
          <AchievementBadge
            achievement={achievement}
            userAchievement={userAchievementMap.get(achievement.id)}
            size="md"
            showDescription
          />
        </motion.div>
      ))}
    </div>
  )
}
