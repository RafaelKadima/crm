import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Phone, Mail, MessageSquare, Clock, MessageCircle, AlertCircle } from 'lucide-react'
import { cn, formatCurrency, formatPhone } from '@/lib/utils'
import { StageProgressBar } from '@/components/stage-activities/StageProgressBar'
import { useLeadStageProgressFromCache } from '@/hooks/useStageActivities'
import type { Lead } from '@/types'

interface KanbanCardProps {
  lead: Lead
  isDragging?: boolean
  onClick: () => void
}

const channelConfig: Record<string, { icon: typeof Phone; color: string }> = {
  whatsapp: { icon: MessageSquare, color: '#25D366' },
  instagram: { icon: MessageCircle, color: '#E1306C' },
  messenger: { icon: MessageCircle, color: '#0084FF' },
  telefone: { icon: Phone, color: 'var(--color-muted-foreground)' },
  email: { icon: Mail, color: 'var(--color-muted-foreground)' },
}

function initialsOf(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
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

  const { data: progress } = useLeadStageProgressFromCache(lead.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const channelType = lead.channel?.type?.toLowerCase() || ''
  const channel = channelConfig[channelType] || { icon: MessageSquare, color: 'var(--color-muted-foreground)' }
  const ChannelIcon = channel.icon
  const hasUnread = (lead.unread_messages && lead.unread_messages > 0) || lead.has_new_message

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--color-card)',
        borderColor: hasUnread ? 'var(--color-bold-ink)' : 'var(--color-border)',
        boxShadow: hasUnread ? '0 0 0 1px rgba(220, 255, 0, 0.3), 0 0 16px rgba(220, 255, 0, 0.12)' : undefined,
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-[12px] border p-3.5 transition-all',
        'hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]',
        (isDragging || isSortableDragging) && 'scale-[1.03] opacity-60'
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                background: hasUnread ? 'var(--color-bold-ink)' : 'var(--color-secondary)',
                color: hasUnread ? '#0A0A0C' : 'var(--color-foreground)',
              }}
            >
              {initialsOf(lead.contact?.name)}
            </span>
            <h4
              className={cn(
                'truncate text-[13.5px] leading-tight',
                hasUnread ? 'font-semibold' : 'font-medium'
              )}
            >
              {lead.contact?.name || 'Sem nome'}
            </h4>
          </div>
          {lead.contact?.phone && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatPhone(lead.contact.phone)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasUnread && (
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                style={{ background: 'var(--color-bold-ink)' }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: 'var(--color-bold-ink)' }}
              />
            </span>
          )}
          <ChannelIcon className="h-4 w-4" style={{ color: channel.color }} />
        </div>
      </div>

      {/* Title */}
      {lead.title && (
        <p className="mb-2 line-clamp-2 text-[11.5px] text-muted-foreground">
          {lead.title}
        </p>
      )}

      {/* Unread banner */}
      {hasUnread && lead.last_message_at && (
        <div
          className="mb-2 flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5"
          style={{
            background: 'rgba(220, 255, 0, 0.1)',
            border: '1px solid rgba(220, 255, 0, 0.25)',
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ background: 'var(--color-bold-ink)' }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--color-bold-ink)' }}
            />
          </span>
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--color-foreground)' }}
          >
            Aguardando resposta
          </span>
        </div>
      )}

      {/* Owner */}
      {lead.owner && (
        <div
          className="mb-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-secondary)' }}
        >
          <span
            aria-hidden
            className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
            style={{ background: '#F2D59A', color: '#14110F' }}
          >
            {initialsOf(lead.owner.name)}
          </span>
          <span className="truncate text-[10.5px] font-medium text-muted-foreground">
            {lead.owner.name}
          </span>
        </div>
      )}

      {/* Stale */}
      {lead.is_stale && (
        <div
          className="mb-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{
            background: 'rgba(217, 119, 6, 0.08)',
            borderColor: 'rgba(217, 119, 6, 0.3)',
            color: 'var(--color-warning)',
          }}
          title="Lead aberto e sem atividade há mais de 90 dias"
        >
          <AlertCircle className="h-3 w-3" />
          Parado há {lead.stale_age_days}d
        </div>
      )}

      {/* Stage Activities Progress */}
      {progress && progress.total > 0 && (
        <div className="mb-2">
          <StageProgressBar progress={progress} variant="minimal" />
        </div>
      )}

      {/* Footer */}
      <div
        className="mt-2 flex items-center justify-between border-t pt-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {lead.last_interaction_at ? (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(lead.last_interaction_at).toLocaleDateString('pt-BR')}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
        {lead.value && lead.value > 0 && (
          <span className="font-display text-[16px] leading-none tracking-[-0.015em]">
            {formatCurrency(lead.value)}
          </span>
        )}
      </div>
    </div>
  )
}
