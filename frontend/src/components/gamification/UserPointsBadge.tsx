import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, TrendingUp, Trophy, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TierBadge } from './TierBadge'
import { useGamificationStats, usePublicGamificationSettings } from '@/hooks/useGamification'

interface UserPointsBadgeProps {
  className?: string
  showDropdown?: boolean
}

export function UserPointsBadge({
  className,
  showDropdown = true,
}: UserPointsBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: stats, isLoading } = useGamificationStats()
  const { data: settings } = usePublicGamificationSettings()

  if (isLoading) {
    return (
      <div className={cn("h-8 w-24 bg-muted rounded-full animate-pulse", className)} />
    )
  }

  // Não mostra se gamificação desabilitada ou pontos escondidos para usuários
  if (!stats || !settings?.is_enabled || !settings?.show_points_to_users) {
    return null
  }

  const { current_period, tier, next_tier, points_to_next_tier, rank } = stats

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => showDropdown && setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
          "bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10",
          "border border-primary/20"
        )}
      >
        <TierBadge tier={tier} size="sm" showName={false} />
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-sm font-semibold">
            {current_period?.total_points?.toLocaleString() || 0}
          </span>
        </div>
        {showDropdown && (
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 z-50"
          >
            <div className="bg-popover border rounded-xl shadow-lg p-4 space-y-4">
              {/* Current Tier */}
              <div className="flex items-center justify-between">
                <TierBadge tier={tier} size="md" />
                {rank && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    #{rank}
                  </div>
                )}
              </div>

              {/* Progress to Next Tier */}
              {next_tier && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Próximo: {next_tier.name}
                    </span>
                    <span className="font-medium">
                      {points_to_next_tier} pts
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          ((current_period?.total_points || 0) / (next_tier.min_points || 1)) * 100,
                          100
                        )}%`,
                      }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${tier?.color || '#6366f1'}, ${next_tier.color})`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-green-500">
                    {current_period?.deals_won || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Deals Ganhos
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-primary">
                    {current_period?.activities_completed || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Atividades
                  </div>
                </div>
              </div>

              {/* View More Link */}
              <a
                href="/settings"
                className="block text-center text-xs text-primary hover:underline"
              >
                Configurar gamificação
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
