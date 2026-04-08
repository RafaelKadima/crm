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
          "bg-muted/20 rounded-xl p-3 h-full flex flex-col transition-all duration-200",
          isOver && "bg-primary/10 ring-2 ring-primary/30 scale-[1.02]"
        )}
      >
        {/* Column Header */}
        <div
          className="flex items-center justify-between mb-3 pl-3 shrink-0 border-l-[3px]"
          style={{ borderColor: stage.color }}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-foreground">{stage.name}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {leads.length}
            </span>
          </div>
          {totalValue > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {formatCurrency(totalValue)}
            </span>
          )}
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
                isOver ? "border-primary bg-primary/5" : "border-border/50"
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
