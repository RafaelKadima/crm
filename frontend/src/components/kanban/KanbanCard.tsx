import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Phone, Mail, MessageSquare, Clock, MessageCircle } from 'lucide-react'
import { cn, formatCurrency, formatPhone } from '@/lib/utils'
import type { Lead } from '@/types'

interface KanbanCardProps {
  lead: Lead
  isDragging?: boolean
  onClick: () => void
}

const channelConfig: Record<string, { icon: typeof Phone; color: string }> = {
  whatsapp: { icon: MessageSquare, color: 'text-[#25D366]' },
  instagram: { icon: MessageCircle, color: 'text-[#E1306C]' },
  messenger: { icon: MessageCircle, color: 'text-[#0084FF]' },
  telefone: { icon: Phone, color: 'text-muted-foreground' },
  email: { icon: Mail, color: 'text-muted-foreground' },
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

  // Stage progress removido do card: gerava 1 request por card → estourava rate limit
  // com pipelines grandes (kanban com 500+ leads = 500+ requests). Mini-barra
  // renderiza quando houver endpoint batch. A barra completa segue no modal do lead.

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const channelType = lead.channel?.type?.toLowerCase() || ''
  const channel = channelConfig[channelType] || { icon: MessageSquare, color: 'text-muted-foreground' }
  const ChannelIcon = channel.icon
  const hasUnread = (lead.unread_messages && lead.unread_messages > 0) || lead.has_new_message

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-card rounded-lg p-3.5 border cursor-pointer transition-all",
        "hover:border-foreground/15",
        (isDragging || isSortableDragging) && "opacity-50 scale-105",
        hasUnread && "border-success bg-success/10 ring-1 ring-success/30 shadow-[0_0_12px_rgba(61,214,140,0.15)]"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className={cn("text-sm leading-tight truncate", hasUnread ? "font-semibold text-foreground" : "font-medium")}>
            {lead.contact?.name || 'Sem nome'}
          </h4>
          {lead.contact?.phone && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formatPhone(lead.contact.phone)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasUnread && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
          )}
          <ChannelIcon className={cn("h-4 w-4", channel.color)} />
        </div>
      </div>

      {/* Title */}
      {lead.title && (
        <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">
          {lead.title}
        </p>
      )}

      {/* New message indicator */}
      {hasUnread && lead.last_message_at && (
        <div className="mb-2 px-2.5 py-1.5 rounded-md bg-success/15 border border-success/25">
          <span className="text-[11px] font-semibold text-success flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            Aguardando resposta
          </span>
        </div>
      )}

      {/* Owner */}
      {lead.owner && (
        <div className="mb-2 px-2 py-1 rounded bg-muted">
          <span className="text-[11px] text-muted-foreground font-medium truncate block">
            {lead.owner.name}
          </span>
        </div>
      )}

      {/* Stage Activities Progress — removido (rate limit). Ver comentário no topo. */}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-border">
        <div className="flex items-center gap-2">
          {lead.last_interaction_at && (
            <div className="flex items-center text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(lead.last_interaction_at).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
        {lead.value && lead.value > 0 && (
          <span className="text-xs font-medium text-foreground">
            {formatCurrency(lead.value)}
          </span>
        )}
      </div>
    </div>
  )
}
