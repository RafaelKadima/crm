import { motion } from 'framer-motion'
import {
  Phone,
  Mail,
  Calendar,
  ClipboardCheck,
  Presentation,
  Clock,
  CheckCircle2,
  Circle,
  SkipForward,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import type { DealStageActivity, StageActivityType } from '@/types'

interface StageActivityItemProps {
  activity: DealStageActivity
  onComplete?: () => void
  onSkip?: () => void
  isCompleting?: boolean
  isSkipping?: boolean
  showActions?: boolean
}

const activityIcons: Record<StageActivityType, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: ClipboardCheck,
  demo: Presentation,
  follow_up: Clock,
}

const activityLabels: Record<StageActivityType, string> = {
  call: 'Ligação',
  email: 'E-mail',
  meeting: 'Reunião',
  task: 'Tarefa',
  demo: 'Demonstração',
  follow_up: 'Follow-up',
}

const activityColors: Record<StageActivityType, string> = {
  call: 'text-blue-500 bg-blue-500/10',
  email: 'text-purple-500 bg-purple-500/10',
  meeting: 'text-green-500 bg-green-500/10',
  task: 'text-amber-500 bg-amber-500/10',
  demo: 'text-pink-500 bg-pink-500/10',
  follow_up: 'text-cyan-500 bg-cyan-500/10',
}

export function StageActivityItem({
  activity,
  onComplete,
  onSkip,
  isCompleting,
  isSkipping,
  showActions = true,
}: StageActivityItemProps) {
  const Icon = activityIcons[activity.activity_type] || ClipboardCheck
  const isCompleted = activity.status === 'completed'
  const isSkipped = activity.status === 'skipped'
  const isPending = activity.status === 'pending'
  const isRequired = activity.is_required
  const isOverdue = activity.due_at && new Date(activity.due_at) < new Date() && isPending

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all",
        isCompleted && "bg-green-500/5 border-green-500/20",
        isSkipped && "bg-muted/50 border-muted opacity-60",
        isPending && !isOverdue && "bg-card border-border hover:border-primary/30",
        isOverdue && "bg-red-500/5 border-red-500/20"
      )}
    >
      {/* Status Icon */}
      <div className={cn(
        "flex-shrink-0 p-2 rounded-lg",
        activityColors[activity.activity_type]
      )}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className={cn(
                "text-sm font-medium",
                isCompleted && "line-through text-muted-foreground",
                isSkipped && "line-through text-muted-foreground"
              )}>
                {activity.title || activity.template?.title}
              </h4>
              {isRequired && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Obrigatória
                </span>
              )}
            </div>
            {activity.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {activity.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-muted-foreground">
                {activityLabels[activity.activity_type]}
              </span>
              {activity.due_at && (
                <span className={cn(
                  "text-[10px] flex items-center gap-1",
                  isOverdue ? "text-red-500" : "text-muted-foreground"
                )}>
                  <Clock className="h-3 w-3" />
                  {formatDate(activity.due_at)}
                  {isOverdue && " (atrasada)"}
                </span>
              )}
              {isCompleted && activity.points_earned > 0 && (
                <span className="text-[10px] text-green-500 font-medium">
                  +{activity.points_earned} pts
                </span>
              )}
            </div>
          </div>

          {/* Status/Actions */}
          <div className="flex items-center gap-2">
            {isCompleted && (
              <div className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
            {isSkipped && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <SkipForward className="h-5 w-5" />
              </div>
            )}
            {isPending && showActions && (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onComplete}
                  disabled={isCompleting || isSkipping}
                  className="h-7 px-2 text-xs"
                >
                  {isCompleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Concluir
                    </>
                  )}
                </Button>
                {!isRequired && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onSkip}
                    disabled={isCompleting || isSkipping}
                    className="h-7 px-2 text-xs text-muted-foreground"
                  >
                    {isSkipping ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <SkipForward className="h-3 w-3 mr-1" />
                        Pular
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Completed By */}
        {isCompleted && activity.completed_by_user && (
          <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
            Concluída por {activity.completed_by_user.name} em{' '}
            {activity.completed_at ? formatDate(activity.completed_at) : '-'}
          </div>
        )}
      </div>
    </motion.div>
  )
}
