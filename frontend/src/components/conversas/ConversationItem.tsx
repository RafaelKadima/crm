import { motion } from 'framer-motion'
import { MessageSquare, Instagram, Phone, Mail } from 'lucide-react'
import { cn, formatPhone } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { useNotificationStore } from '@/store/notificationStore'
import type { Lead } from '@/types'

interface ConversationItemProps {
  lead: Lead
  isActive: boolean
  onClick: () => void
}

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  telefone: Phone,
  email: Mail,
}

export function ConversationItem({ lead, isActive, onClick }: ConversationItemProps) {
  const unreadMessages = useNotificationStore((state) => state.unreadMessages)
  const unreadInfo = unreadMessages.get(lead.id)
  const hasUnread = !!unreadInfo && unreadInfo.count > 0

  const ChannelIcon = channelIcons[lead.channel?.type || 'whatsapp'] || MessageSquare
  const contactName = lead.contact?.name || 'Sem nome'
  const contactPhone = lead.contact?.phone ? formatPhone(lead.contact.phone) : ''

  // Formata data da última mensagem
  const formatLastMessage = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Ontem'
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "w-full flex items-start gap-3 p-3 text-left transition-colors",
        isActive && "bg-primary/10 border-l-2 border-primary",
        !isActive && "hover:bg-muted/50"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={undefined}
          name={contactName}
          size="md"
        />
        {/* Channel indicator */}
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 p-1 rounded-full",
          lead.channel?.type === 'whatsapp' ? 'bg-green-500' :
          lead.channel?.type === 'instagram' ? 'bg-pink-500' :
          'bg-blue-500'
        )}>
          <ChannelIcon className="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "font-medium truncate",
            hasUnread && "text-foreground",
            !hasUnread && "text-foreground/80"
          )}>
            {contactName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatLastMessage(lead.last_message_at)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-sm truncate",
            hasUnread ? "text-foreground/80" : "text-muted-foreground"
          )}>
            {unreadInfo?.lastMessagePreview || contactPhone || 'Sem mensagens'}
          </p>

          {/* Unread badge */}
          {hasUnread && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full",
                "bg-primary text-primary-foreground",
                "text-xs font-medium flex items-center justify-center"
              )}
            >
              {unreadInfo.count > 99 ? '99+' : unreadInfo.count}
            </motion.span>
          )}
        </div>

        {/* Stage badge */}
        {lead.stage && (
          <div className="mt-1.5">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: `${lead.stage.color}20`,
                color: lead.stage.color,
              }}
            >
              {lead.stage.name}
            </span>
          </div>
        )}
      </div>
    </motion.button>
  )
}
