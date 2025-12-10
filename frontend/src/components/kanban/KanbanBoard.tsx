import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import type { Lead, PipelineStage } from '@/types'

interface KanbanBoardProps {
  stages: PipelineStage[]
  leads: Lead[]
  onLeadMove: (leadId: string, newStageId: string) => void
  onLeadClick: (lead: Lead) => void
}

export function KanbanBoard({ stages, leads, onLeadMove, onLeadClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    setOverId(over?.id as string || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over) {
      const activeLeadId = active.id as string
      const activeLead = leads.find((l) => l.id === activeLeadId)
      
      if (!activeLead) {
        setActiveId(null)
        setOverId(null)
        return
      }

      let targetStageId: string | null = null

      // Check if dropped directly on a stage (column)
      const isDroppedOnStage = stages.some((s) => s.id === over.id)
      
      if (isDroppedOnStage) {
        targetStageId = over.id as string
      } else {
        // Dropped on another lead - find which stage that lead belongs to
        const overLead = leads.find((l) => l.id === over.id)
        if (overLead) {
          targetStageId = overLead.stage_id
        }
      }

      // Only update if moving to a different stage
      if (targetStageId && targetStageId !== activeLead.stage_id) {
        console.log(`Moving lead ${activeLeadId} to stage ${targetStageId}`)
        onLeadMove(activeLeadId, targetStageId)
      }
    }

    setActiveId(null)
    setOverId(null)
  }

  const getLeadsByStage = (stageId: string) => {
    return leads.filter((lead) => lead.stage_id === stageId)
  }

  // Determine which stage is being hovered
  const getHoveredStageId = (): string | null => {
    if (!overId) return null
    // Check if hovering directly over a stage
    if (stages.some((s) => s.id === overId)) {
      return overId
    }
    // Check if hovering over a lead - return that lead's stage
    const overLead = leads.find((l) => l.id === overId)
    return overLead?.stage_id || null
  }

  const hoveredStageId = getHoveredStageId()

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={getLeadsByStage(stage.id)}
            onLeadClick={onLeadClick}
            isOver={hoveredStageId === stage.id && activeId !== null}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <KanbanCard lead={activeLead} isDragging onClick={() => {}} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
