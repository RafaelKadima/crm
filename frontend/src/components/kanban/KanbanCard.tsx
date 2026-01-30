import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Phone, Mail, MessageSquare, Clock, MessageCircle } from 'lucide-react'
import { cn, formatCurrency, formatPhone } from '@/lib/utils'
import { StageProgressBar } from '@/components/stage-activities/StageProgressBar'
import { useLeadStageProgress } from '@/hooks/useStageActivities'
import type { Lead } from '@/types'

interface KanbanCardProps {
  lead: Lead
  isDragging?: boolean
  onClick: () => void
}

// Channel icons with colors
const channelConfig: Record<string, { icon: typeof Phone; color: string }> = {
  whatsapp: { icon: MessageSquare, color: 'text-green-500' },
  instagram: { icon: MessageCircle, color: 'text-pink-500' },
  messenger: { icon: MessageCircle, color: 'text-blue-500' },
  telefone: { icon: Phone, color: 'text-muted-foreground' },
  email: { icon: Mail, color: 'text-blue-400' },
}

export function KanbanCard({ lead, isDragging, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id })

  // Busca progresso das atividades do lead
  const { data: progress } = useLeadStageProgress(lead.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const channelType = lead.channel?.type?.toLowerCase() || ''
  const channel = channelConfig[channelType] || { icon: MessageSquare, color: 'text-muted-foreground' }
  const ChannelIcon = channel.icon
  const hasUnread = (lead.unread_messages && lead.unread_messages > 0) || lead.has_new_message

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg p-3 shadow-sm border cursor-pointer transition-all relative",
        "hover:shadow-md hover:border-primary/30",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg scale-105 rotate-2",
        hasUnread && "ring-2 ring-green-500/50 border-green-500/30"
      )}
    >
      {/* Unread Notification Badge */}
      {hasUnread && (
        <div className="absolute -top-1.5 -right-1.5 z-10">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-green-500 text-white text-[8px] font-bold">
              {lead.unread_messages && lead.unread_messages > 9 ? '9+' : lead.unread_messages || '!'}
            </span>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-xs leading-tight truncate">
            {lead.contact?.name || 'Sem nome'}
          </h4>
          {lead.contact?.phone && (
            <p className="text-[10px] text-muted-foreground">
              {formatPhone(lead.contact.phone)}
            </p>
          )}
        </div>
        <ChannelIcon className={cn("h-4 w-4 shrink-0", channel.color)} />
      </div>

      {/* Title/Notes */}
      {lead.title && (
        <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">
          {lead.title}
        </p>
      )}

      {/* New Message Preview */}
      {hasUnread && lead.last_message_at && (
        <div className="mb-2 p-1.5 rounded bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <MessageSquare className="h-3 w-3" />
            <span className="text-[10px] font-medium">Nova mensagem!</span>
          </div>
        </div>
      )}

      {/* Owner */}
      {lead.owner && (
        <div className="mb-2 px-2 py-1 rounded bg-purple-500/10">
          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate block">
            {lead.owner.name}
          </span>
        </div>
      )}

      {/* Stage Activities Progress */}
      {progress && progress.total > 0 && (
        <div className="mb-2">
          <StageProgressBar progress={progress} variant="minimal" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t">
        <div className="flex items-center gap-2">
          {lead.last_interaction_at && (
            <div className="flex items-center text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(lead.last_interaction_at).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
        {lead.value && lead.value > 0 && (
          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(lead.value)}
          </span>
        )}
      </div>
    </motion.div>
  )
}
