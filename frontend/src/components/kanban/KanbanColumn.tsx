import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'
import type { Lead, PipelineStage } from '@/types'

interface KanbanColumnProps {
  stage: PipelineStage
  leads: Lead[]
  onLeadClick: (lead: Lead) => void
  isOver?: boolean
  totalLeadsInPipeline?: number
}

export function KanbanColumn({ stage, leads, onLeadClick, isOver, totalLeadsInPipeline = 0 }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  })

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-shrink-0 w-80 h-full"
    >
      <div
        ref={setNodeRef}
        className={cn(
          "bg-muted/30 rounded-xl p-3 h-full flex flex-col transition-all duration-200",
          isOver && "bg-primary/10 ring-2 ring-primary/30 scale-[1.02]"
        )}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between mb-3 px-1 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-sm">{stage.name}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {leads.length}
            </span>
          </div>
          {totalValue > 0 && (
            <span className="text-xs font-semibold text-green-500">
              {formatCurrency(totalValue)}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-muted overflow-hidden mt-2 mb-1 mx-1 shrink-0">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              backgroundColor: stage.color,
              width: `${Math.min((leads.length / Math.max(totalLeadsInPipeline, 1)) * 100, 100)}%`,
            }}
          />
        </div>

        {/* Cards - scrollable area */}
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {leads.map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead)}
              />
            ))}
            {leads.length === 0 && (
              <div className={cn(
                "flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed rounded-lg transition-colors",
                isOver ? "border-primary bg-primary/5" : "border-muted"
              )}>
                {isOver ? "Solte aqui" : "Arraste leads aqui"}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </motion.div>
  )
}
