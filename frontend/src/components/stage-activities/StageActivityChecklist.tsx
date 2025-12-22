import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { StageProgressBar } from './StageProgressBar'
import { StageActivityItem } from './StageActivityItem'
import { useLeadStageActivities, useLeadStageProgress, useCompleteStageActivity, useSkipStageActivity } from '@/hooks/useStageActivities'
import type { DealStageActivity } from '@/types'

interface StageActivityChecklistProps {
  leadId: string
  onActivityComplete?: (activity: DealStageActivity, pointsEarned: number) => void
  className?: string
  defaultExpanded?: boolean
}

export function StageActivityChecklist({
  leadId,
  onActivityComplete,
  className,
  defaultExpanded = true,
}: StageActivityChecklistProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [skippingId, setSkippingId] = useState<string | null>(null)

  const { data: activities = [], isLoading: activitiesLoading } = useLeadStageActivities(leadId)
  const { data: progress, isLoading: progressLoading } = useLeadStageProgress(leadId)
  const completeActivity = useCompleteStageActivity(leadId)
  const skipActivity = useSkipStageActivity(leadId)

  const handleComplete = async (activityId: string) => {
    setCompletingId(activityId)
    try {
      const response = await completeActivity.mutateAsync(activityId)
      const activity = activities.find(a => a.id === activityId)
      if (activity && onActivityComplete) {
        onActivityComplete(activity, response.data.points_earned)
      }
    } finally {
      setCompletingId(null)
    }
  }

  const handleSkip = async (activityId: string) => {
    setSkippingId(activityId)
    try {
      await skipActivity.mutateAsync(activityId)
    } finally {
      setSkippingId(null)
    }
  }

  const isLoading = activitiesLoading || progressLoading

  if (isLoading) {
    return (
      <div className={cn("space-y-3 animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-2 bg-muted rounded" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!activities.length || !progress) {
    return null
  }

  const pendingActivities = activities.filter(a => a.status === 'pending')
  const completedActivities = activities.filter(a => a.status === 'completed')
  const skippedActivities = activities.filter(a => a.status === 'skipped')

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Progress */}
      <div className="space-y-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Atividades da Etapa</h3>
            {!progress.can_advance && progress.required_pending > 0 && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <StageProgressBar
          progress={progress}
          variant="compact"
          showLabels={!isExpanded}
        />
      </div>

      {/* Activities List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4">
              {/* Pending Activities */}
              {pendingActivities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pendentes ({pendingActivities.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingActivities.map((activity) => (
                      <StageActivityItem
                        key={activity.id}
                        activity={activity}
                        onComplete={() => handleComplete(activity.id)}
                        onSkip={() => handleSkip(activity.id)}
                        isCompleting={completingId === activity.id}
                        isSkipping={skippingId === activity.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Activities */}
              {completedActivities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Concluídas ({completedActivities.length})
                  </h4>
                  <div className="space-y-2">
                    {completedActivities.map((activity) => (
                      <StageActivityItem
                        key={activity.id}
                        activity={activity}
                        showActions={false}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Activities */}
              {skippedActivities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Puladas ({skippedActivities.length})
                  </h4>
                  <div className="space-y-2">
                    {skippedActivities.map((activity) => (
                      <StageActivityItem
                        key={activity.id}
                        activity={activity}
                        showActions={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
