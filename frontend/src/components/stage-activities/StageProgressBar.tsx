import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StageProgress } from '@/types'

interface StageProgressBarProps {
  progress: StageProgress
  variant?: 'minimal' | 'compact' | 'full'
  showLabels?: boolean
  className?: string
}

export function StageProgressBar({
  progress,
  variant = 'compact',
  showLabels = false,
  className,
}: StageProgressBarProps) {
  const { percentage, completed, total, required_pending, can_advance } = progress

  // Minimal variant for Kanban cards
  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              can_advance
                ? "bg-green-500"
                : required_pending > 0
                  ? "bg-amber-500"
                  : "bg-primary"
            )}
          />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground w-8">
          {completed}/{total}
        </span>
      </div>
    )
  }

  // Compact variant for small spaces
  if (variant === 'compact') {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            {can_advance ? (
              <CheckCircle2 className="h-3 w-3 text-green-500" />
            ) : required_pending > 0 ? (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            ) : (
              <Clock className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">
              {completed}/{total} atividades
            </span>
          </div>
          <span className={cn(
            "font-medium",
            can_advance ? "text-green-500" : "text-muted-foreground"
          )}>
            {percentage}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full transition-colors",
              can_advance
                ? "bg-gradient-to-r from-green-500 to-emerald-400"
                : required_pending > 0
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                  : "bg-gradient-to-r from-primary to-primary/80"
            )}
          />
        </div>
        {showLabels && required_pending > 0 && (
          <p className="text-[10px] text-amber-500">
            {required_pending} obrigatória{required_pending > 1 ? 's' : ''} pendente{required_pending > 1 ? 's' : ''}
          </p>
        )}
      </div>
    )
  }

  // Full variant with all details
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {can_advance ? (
            <div className="flex items-center gap-1.5 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Pronto para avançar</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Circle className="h-4 w-4" />
              <span className="text-sm font-medium">Em progresso</span>
            </div>
          )}
        </div>
        <span className={cn(
          "text-lg font-bold",
          can_advance ? "text-green-500" : "text-primary"
        )}>
          {percentage}%
        </span>
      </div>

      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            can_advance
              ? "bg-gradient-to-r from-green-500 via-emerald-400 to-green-300"
              : "bg-gradient-to-r from-primary via-primary/90 to-primary/70"
          )}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            {progress.completed} concluídas
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {progress.pending} pendentes
          </span>
          {progress.skipped > 0 && (
            <span className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-muted-foreground/50" />
              {progress.skipped} puladas
            </span>
          )}
        </div>
        {required_pending > 0 && (
          <span className="text-amber-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {required_pending} obrigatória{required_pending > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}
