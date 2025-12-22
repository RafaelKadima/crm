import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Phone, Mail, MessageSquare, Clock, MessageCircle } from 'lucide-react'
import { cn, formatCurrency, formatPhone, truncate } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { StageProgressBar } from '@/components/stage-activities/StageProgressBar'
import { useLeadStageProgress } from '@/hooks/useStageActivities'
import type { Lead } from '@/types'

interface KanbanCardProps {
  lead: Lead
  isDragging?: boolean
  onClick: () => void
}

const channelIcons: Record<string, typeof Phone> = {
  whatsapp: MessageSquare,
  instagram: MessageCircle,
  telefone: Phone,
  email: Mail,
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

  const ChannelIcon = channelIcons[lead.channel?.type || ''] || MessageSquare
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
        "bg-card rounded-xl p-4 shadow-sm border cursor-pointer transition-all relative",
        "hover:shadow-md hover:border-primary/30",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg scale-105 rotate-2",
        hasUnread && "ring-2 ring-green-500/50 border-green-500/30"
      )}
    >
      {/* Unread Notification Badge */}
      {hasUnread && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="relative flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-green-500 text-white text-[10px] font-bold">
              {lead.unread_messages && lead.unread_messages > 9 ? '9+' : lead.unread_messages || '!'}
            </span>
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar
              src={null}
              fallback={lead.contact?.name || 'Lead'}
              size="sm"
            />
            {/* Online/Active indicator */}
            {hasUnread && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card"></span>
            )}
          </div>
          <div>
            <h4 className="font-medium text-sm leading-tight">
              {truncate(lead.contact?.name || 'Sem nome', 20)}
            </h4>
            {lead.contact?.phone && (
              <p className="text-xs text-muted-foreground">
                {formatPhone(lead.contact.phone)}
              </p>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0">
          <ChannelIcon className="h-3 w-3 mr-1" />
          {lead.channel?.name || 'Direto'}
        </Badge>
      </div>

      {/* Title/Notes */}
      {lead.title && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {lead.title}
        </p>
      )}

      {/* New Message Preview */}
      {hasUnread && lead.last_message_at && (
        <div className="mb-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <MessageSquare className="h-3 w-3" />
            <span className="text-xs font-medium">Nova mensagem!</span>
          </div>
        </div>
      )}

      {/* Owner */}
      {lead.owner && (
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-purple-500/10">
          <Avatar
            src={lead.owner.avatar}
            fallback={lead.owner.name}
            size="sm"
            className="h-5 w-5 text-[9px]"
          />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium truncate">
            {lead.owner.name}
          </span>
        </div>
      )}

      {/* Stage Activities Progress */}
      {progress && progress.total > 0 && (
        <div className="mb-3">
          <StageProgressBar progress={progress} variant="minimal" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          {lead.last_interaction_at && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(lead.last_interaction_at).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
        {lead.value && lead.value > 0 && (
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(lead.value)}
          </span>
        )}
      </div>
    </motion.div>
  )
}
