import { useEffect, useCallback } from 'react'
import echo from '@/lib/echo'
import { useNotificationStore } from '@/store/notificationStore'
import { useQueryClient } from '@tanstack/react-query'
import { useSoundSettings } from '@/hooks/useSounds'
import { useAuthStore } from '@/store/authStore'

/**
 * Toca um som de notificação usando Web Audio API (sem arquivo externo)
 */
function playNotificationSound(volume: number) {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    // Primeiro tom (ding)
    const osc1 = ctx.createOscillator()
    osc1.connect(gain)
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, ctx.currentTime)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.15)

    // Segundo tom (mais agudo)
    const osc2 = ctx.createOscillator()
    osc2.connect(gain)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.15)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.35)

    // Volume: usar o valor diretamente (0-1)
    gain.gain.setValueAtTime(volume * 0.8, ctx.currentTime)
    gain.gain.setValueAtTime(volume * 0.8, ctx.currentTime + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    osc2.onended = () => ctx.close()
  } catch {
    // Silently fail
  }
}

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
  owner_id?: string | null
  assigned_user_id?: string | null
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
  const soundEnabled = useSoundSettings((s) => s.enabled)
  const soundVolume = useSoundSettings((s) => s.volume)
  const currentUserId = useAuthStore((s) => s.user?.id)

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

        // Verificar se o usuário atual é o responsável pelo lead
        // Notifica se: não tem owner (lead novo) OU é o owner OU é o assigned do ticket
        const isResponsible = !data.owner_id ||
          String(data.owner_id) === String(currentUserId) ||
          String(data.assigned_user_id) === String(currentUserId)

        // Só notifica mensagens RECEBIDAS (inbound) E se for responsável
        if (data.lead_id && isInbound && isResponsible) {
          addUnreadMessage(data.lead_id, data.message.content)

          // Tocar som de nova mensagem (se habilitado)
          console.log('🔊 Som habilitado:', soundEnabled, 'Volume:', soundVolume, 'Responsável:', isResponsible)
          if (soundEnabled) {
            console.log('🔔 Tocando som de notificação...')
            playNotificationSound(soundVolume)
          }

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
  }, [tenantId, addUnreadMessage, queryClient, soundEnabled, soundVolume, currentUserId])
}

/**
 * Hook principal para usar WebSockets no app
 * Escuta o canal do tenant para notificações globais
 */
export function useWebSocket() {
  const { addUnreadMessage } = useNotificationStore()
  const queryClient = useQueryClient()
  const soundEnabled = useSoundSettings((s) => s.enabled)
  const soundVolume = useSoundSettings((s) => s.volume)

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
        // Tocar som de nova mensagem (se habilitado)
        if (soundEnabled) {
          playNotificationSound(soundVolume)
        }

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
  }, [addUnreadMessage, queryClient, soundEnabled, soundVolume])

  const disconnectAll = useCallback(() => {
    echo?.disconnect()
  }, [])

  return {
    echo,
    connectToTenant,
    disconnectAll,
  }
}
