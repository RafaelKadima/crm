import { useEffect, useCallback } from 'react'
import echo from '@/lib/echo'
import { useNotificationStore } from '@/store/notificationStore'
import { useQueryClient } from '@tanstack/react-query'

interface MessageEvent {
  message: {
    id: string
    ticket_id: string
    sender_type: string
    sender_id: string
    direction: string
    content: string
    metadata?: {
      attachment_id?: string
      media_type?: string
      media_url?: string
      file_name?: string
      file_size?: number
      mime_type?: string
      image_url?: string
      audio_url?: string
      video_url?: string
      document_url?: string
    } | null
    sent_at: string
    created_at: string
  }
  ticket: {
    id: string
    lead_id: string
    contact_id: string
    status: string
  }
  lead_id: string
  tenant_id: string
}

interface LeadUpdatedEvent {
  action: 'updated' | 'transferred' | 'deleted'
  lead: {
    id: string
    owner_id?: string
    owner?: {
      id: string
      name: string
    }
    contact?: {
      name: string
    }
    [key: string]: unknown
  }
}

/**
 * Hook para escutar mensagens de um ticket específico
 */
export function useTicketMessages(ticketId: string | null, onMessage?: (data: MessageEvent) => void) {
  useEffect(() => {
    if (!ticketId || !echo) return

    const channel = echo.private(`ticket.${ticketId}`)

    channel.listen('.message.created', (data: MessageEvent) => {
      console.log('📩 Nova mensagem no ticket:', data)
      onMessage?.(data)
    })

    return () => {
      echo?.leave(`ticket.${ticketId}`)
    }
  }, [ticketId, onMessage])
}

/**
 * Hook para escutar mensagens de um lead específico (usado no chat modal)
 * NÃO adiciona notificação - isso é feito pelo useTenantMessages no Kanban
 */
export function useLeadMessages(
  leadId: string | null,
  onMessage?: (data: MessageEvent) => void,
  onLeadUpdated?: (data: LeadUpdatedEvent) => void
) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!leadId || !echo) return

    const channel = echo.private(`lead.${leadId}`)

    channel
      .listen('.message.created', (data: MessageEvent) => {
        console.log('📩 Nova mensagem para o lead:', data)

        // Invalida o cache para atualizar os dados
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] })

        // Chama callback para atualizar o chat
        onMessage?.(data)
      })
      .listen('.lead.updated', (data: LeadUpdatedEvent) => {
        console.log('📝 Lead atualizado via WebSocket:', data.action, data.lead?.id)

        // Invalida o cache para atualizar os dados
        queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
        queryClient.invalidateQueries({ queryKey: ['leads'] })

        // Chama callback para reagir à atualização (transferência, etc)
        onLeadUpdated?.(data)
      })

    return () => {
      echo?.leave(`lead.${leadId}`)
    }
  }, [leadId, onMessage, onLeadUpdated, queryClient])
}

/**
 * Hook para escutar todas as mensagens do tenant (Kanban)
 */
export function useTenantMessages(tenantId: string | null) {
  const { addUnreadMessage } = useNotificationStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tenantId || !echo) {
      if (!echo) {
        console.log('ℹ️ WebSocket disabled - useTenantMessages skipped')
      }
      return
    }

    console.log('🔌 Conectando ao canal tenant:', tenantId)
    const channel = echo.private(`tenant.${tenantId}`)

    channel
      .subscribed(() => {
        console.log('✅ Inscrito no canal tenant:', tenantId)
      })
      .error((error: any) => {
        console.error('❌ Erro ao inscrever no canal tenant:', error)
      })
      .listen('.message.created', (data: MessageEvent) => {
        console.log('📩 Nova mensagem no tenant:', data)

        const isInbound = data.message.direction === 'inbound'

        // Só notifica mensagens RECEBIDAS (inbound), não as enviadas
        if (data.lead_id && isInbound) {
          addUnreadMessage(data.lead_id, data.message.content)

          // Tocar som de nova mensagem
          try {
            const audio = new Audio('/sounds/notification.mp3')
            audio.volume = 0.5
            audio.play().catch(() => {})
          } catch {}

          // Notificação do browser
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              const notification = new Notification('Nova mensagem', {
                body: data.message.content?.substring(0, 80) || 'Você recebeu uma nova mensagem',
                icon: '/favicon.ico',
                tag: `lead-${data.lead_id}`,
                silent: true,
              })
              notification.onclick = () => {
                window.focus()
                notification.close()
              }
              setTimeout(() => notification.close(), 5000)
            } catch {}
          }
        }

        // Invalida o cache de leads para atualizar o Kanban
        queryClient.invalidateQueries({ queryKey: ['leads'] })
      })
      .listen('.lead.updated', (data: { action: string; lead: any }) => {
        console.log('📝 Lead atualizado:', data.action, data.lead?.id)

        // Invalida o cache de leads para atualizar o Kanban
        queryClient.invalidateQueries({ queryKey: ['leads'] })

        if (data.lead?.id) {
          queryClient.invalidateQueries({ queryKey: ['lead', data.lead.id] })
        }
      })

    return () => {
      console.log('🔌 Desconectando do canal tenant:', tenantId)
      echo?.leave(`tenant.${tenantId}`)
    }
  }, [tenantId, addUnreadMessage, queryClient])
}

/**
 * Hook principal para usar WebSockets no app
 * Escuta o canal do tenant para notificações globais
 */
export function useWebSocket() {
  const { addUnreadMessage } = useNotificationStore()
  const queryClient = useQueryClient()

  const connectToTenant = useCallback((tenantId: string) => {
    if (!echo) {
      console.log('ℹ️ WebSocket disabled - connectToTenant skipped')
      return () => {}
    }

    const channel = echo.private(`tenant.${tenantId}`)

    channel.listen('.message.created', (data: MessageEvent) => {
      console.log('🔔 Nova mensagem recebida:', data)

      // Só notifica mensagens RECEBIDAS (inbound), não as enviadas
      const isInbound = data.message.direction === 'inbound'

      // Notificação visual (apenas para mensagens recebidas)
      if (data.lead_id && isInbound) {
        addUnreadMessage(data.lead_id, data.message.content)
      }

      // Atualizar dados
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      if (data.ticket.id) {
        queryClient.invalidateQueries({ queryKey: ['ticket', data.ticket.id] })
      }
      if (data.lead_id) {
        queryClient.invalidateQueries({ queryKey: ['lead', data.lead_id] })
      }

      // Notificação do navegador + som (apenas para mensagens recebidas)
      if (isInbound) {
        // Tocar som de nova mensagem
        try {
          const audio = new Audio('/sounds/notification.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {})
        } catch {}

        // Notificação do browser
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const contactName = data.message.content?.substring(0, 80) || 'Nova mensagem'
            const notification = new Notification('Nova mensagem', {
              body: contactName,
              icon: '/favicon.ico',
              tag: `lead-${data.lead_id}`,
              silent: true,
            })
            notification.onclick = () => {
              window.focus()
              notification.close()
            }
            setTimeout(() => notification.close(), 5000)
          } catch {}
        }
      }
    })

    return () => {
      echo?.leave(`tenant.${tenantId}`)
    }
  }, [addUnreadMessage, queryClient])

  const disconnectAll = useCallback(() => {
    echo?.disconnect()
  }, [])

  return {
    echo,
    connectToTenant,
    disconnectAll,
  }
}
