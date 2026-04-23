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

export function KanbanColumn({ stage, leads, onLeadClick, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id })

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0)
  const stageColor = stage.color || 'var(--color-bold-ink)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.87, 0.35, 1] }}
      className="flex-shrink-0 w-80 h-full"
    >
      <div
        ref={setNodeRef}
        className={cn(
          'flex h-full flex-col rounded-[14px] border p-3 transition-all duration-200',
          isOver && 'scale-[1.01] ring-2'
        )}
        style={{
          background: isOver ? 'rgba(220, 255, 0, 0.04)' : 'var(--color-muted)',
          borderColor: isOver ? 'var(--color-bold-ink)' : 'var(--color-border)',
        }}
      >
        {/* Column header — eyebrow name + count + total in serif */}
        <div className="mb-3 shrink-0 px-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="h-[10px] w-[10px] shrink-0 rounded-full"
                style={{ background: stageColor }}
              />
              <p
                className="truncate text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: 'var(--color-foreground)' }}
              >
                {stage.name}
              </p>
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: 'var(--color-secondary)',
                  color: 'var(--color-muted-foreground)',
                }}
              >
                {leads.length}
              </span>
            </div>
          </div>
          {totalValue > 0 && (
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-[22px] leading-none tracking-[-0.015em]">
                {formatCurrency(totalValue)}
              </span>
            </div>
          )}
        </div>

        {/* Stage color accent line under header */}
        <div
          className="mb-3 h-[2px] w-full shrink-0 rounded-full"
          style={{ background: stageColor, opacity: 0.6 }}
        />

        {/* Cards */}
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto pr-1">
            {leads.map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead)}
              />
            ))}
            {leads.length === 0 && (
              <div
                className={cn(
                  'flex h-24 items-center justify-center rounded-[10px] border-2 border-dashed text-[12.5px] transition-colors'
                )}
                style={{
                  borderColor: isOver ? 'var(--color-bold-ink)' : 'var(--color-border)',
                  color: isOver ? 'var(--color-bold-ink)' : 'var(--color-muted-foreground)',
                  background: isOver ? 'rgba(220, 255, 0, 0.05)' : 'transparent',
                }}
              >
                {isOver ? 'Solte aqui' : 'Arraste leads aqui'}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </motion.div>
  )
}
