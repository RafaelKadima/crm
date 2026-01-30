import { motion } from 'framer-motion'
import { Trophy, Medal, Award, TrendingUp, Crown, Zap } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { TierBadge } from './TierBadge'
import { useLeaderboard } from '@/hooks/useGamification'
import type { LeaderboardEntry } from '@/types'

interface LeaderboardProps {
  limit?: number
  period?: string
  showValue?: boolean
  className?: string
}

const rankIcons = [Crown, Medal, Award]
const rankColors = ['text-amber-500', 'text-muted-foreground', 'text-amber-700']

export function Leaderboard({
  limit = 10,
  period,
  showValue = true,
  className,
}: LeaderboardProps) {
  const { data: entries = [], isLoading } = useLeaderboard({ period, limit })

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p>Nenhum ranking disponível ainda.</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {entries.map((entry, index) => (
        <LeaderboardRow
          key={entry.user.id}
          entry={entry}
          index={index}
          showValue={showValue}
        />
      ))}
    </div>
  )
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  index: number
  showValue?: boolean
}

function LeaderboardRow({ entry, index, showValue }: LeaderboardRowProps) {
  const isTopThree = index < 3
  const RankIcon = isTopThree ? rankIcons[index] : null
  const rankColor = isTopThree ? rankColors[index] : 'text-muted-foreground'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all",
        isTopThree && "bg-gradient-to-r",
        index === 0 && "from-amber-500/10 to-amber-500/5 border-amber-500/30",
        index === 1 && "from-gray-400/10 to-gray-400/5 border-gray-400/30",
        index === 2 && "from-amber-700/10 to-amber-700/5 border-amber-700/30",
        !isTopThree && "bg-card hover:bg-muted/50"
      )}
    >
      {/* Rank */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold",
        isTopThree ? "bg-background" : "bg-muted"
      )}>
        {RankIcon ? (
          <RankIcon className={cn("h-5 w-5", rankColor)} />
        ) : (
          <span className="text-sm text-muted-foreground">
            {entry.rank}
          </span>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <Avatar
          src={entry.user.avatar}
          fallback={entry.user.name}
          size="sm"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">
              {entry.user.name}
            </h4>
            {entry.tier && (
              <TierBadge tier={entry.tier} size="sm" showName={false} />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-green-500" />
              {entry.deals_won} ganhos
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              {entry.activities_completed} atividades
            </span>
          </div>
        </div>
      </div>

      {/* Points & Value */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 text-lg font-bold">
          <Zap className="h-4 w-4 text-amber-500" />
          {entry.total_points.toLocaleString()}
        </div>
        {showValue && entry.deals_value > 0 && (
          <div className="text-xs text-green-500">
            {formatCurrency(entry.deals_value)}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Podium component for top 3
export function LeaderboardPodium({
  entries,
  className,
}: {
  entries: LeaderboardEntry[]
  className?: string
}) {
  if (entries.length < 3) return null

  const [first, second, third] = entries

  return (
    <div className={cn("flex items-end justify-center gap-2", className)}>
      {/* Second Place */}
      <PodiumPlace entry={second} place={2} height="h-24" />

      {/* First Place */}
      <PodiumPlace entry={first} place={1} height="h-32" />

      {/* Third Place */}
      <PodiumPlace entry={third} place={3} height="h-20" />
    </div>
  )
}

function PodiumPlace({
  entry,
  place,
  height,
}: {
  entry: LeaderboardEntry
  place: 1 | 2 | 3
  height: string
}) {
  const colors = {
    1: 'from-amber-500 to-amber-600',
    2: 'from-gray-400 to-gray-500',
    3: 'from-amber-700 to-amber-800',
  }

  const RankIcon = rankIcons[place - 1]

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: place === 1 ? 0 : place === 2 ? 0.1 : 0.2 }}
      className="flex flex-col items-center"
    >
      <Avatar
        src={entry.user.avatar}
        fallback={entry.user.name}
        size={place === 1 ? 'lg' : 'md'}
        className={cn(
          "ring-2 mb-2",
          place === 1 && "ring-amber-500",
          place === 2 && "ring-gray-400",
          place === 3 && "ring-amber-700"
        )}
      />
      <p className="text-xs font-medium text-center truncate max-w-20">
        {entry.user.name.split(' ')[0]}
      </p>
      <div className={cn(
        "w-20 rounded-t-lg flex flex-col items-center justify-end pb-2 mt-2",
        height,
        `bg-gradient-to-b ${colors[place]}`
      )}>
        <RankIcon className="h-6 w-6 text-white mb-1" />
        <span className="text-white text-lg font-bold">
          {entry.total_points.toLocaleString()}
        </span>
      </div>
    </motion.div>
  )
}
