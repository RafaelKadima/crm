import { useEffect, useRef } from 'react'
import { getEcho, reconnectEcho } from '@/lib/echo'
import { useNotificationStore } from '@/store/notificationStore'
import { useQueryClient } from '@tanstack/react-query'
import { useSoundSettings } from '@/hooks/useSounds'
import { useAuthStore } from '@/store/authStore'

/**
 * Toca um som de notificação usando Web Audio API (sem arquivo externo)
 */
async function playNotificationSound(volume: number) {
  try {
    const ctx = new AudioContext()
    if (ctx.state === 'suspended') await ctx.resume()

    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    const osc1 = ctx.createOscillator()
    osc1.connect(gain)
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, ctx.currentTime)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.15)

    const osc2 = ctx.createOscillator()
    osc2.connect(gain)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.15)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.35)

    gain.gain.setValueAtTime(volume * 0.8, ctx.currentTime)
    gain.gain.setValueAtTime(volume * 0.8, ctx.currentTime + 0.15)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    osc2.onended = () => ctx.close()
  } catch {
    // Silently fail — browser may block audio without user gesture
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
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  useEffect(() => {
    if (!ticketId || !getEcho()) return

    const subscribe = () => {
      const echoInstance = getEcho()
      if (!echoInstance) return
      const channel = echoInstance.private(`ticket.${ticketId}`)
      channel.listen('.message.created', (data: MessageEvent) => {
        onMessageRef.current?.(data)
      })
    }

    subscribe()

    // Re-subscribe on reconnection
    const handleReconnect = () => subscribe()
    window.addEventListener('echo:reconnected', handleReconnect)

    return () => {
      window.removeEventListener('echo:reconnected', handleReconnect)
      getEcho()?.leave(`ticket.${ticketId}`)
    }
  }, [ticketId])
}

/**
 * Hook para escutar mensagens de um lead específico (usado no chat modal)
 */
export function useLeadMessages(
  leadId: string | null,
  onMessage?: (data: MessageEvent) => void,
  onLeadUpdated?: (data: LeadUpdatedEvent) => void
) {
  const queryClient = useQueryClient()
  const onMessageRef = useRef(onMessage)
  const onLeadUpdatedRef = useRef(onLeadUpdated)
  onMessageRef.current = onMessage
  onLeadUpdatedRef.current = onLeadUpdated

  useEffect(() => {
    if (!leadId || !getEcho()) return

    const subscribe = () => {
      const echoInstance = getEcho()
      if (!echoInstance) return
      const channel = echoInstance.private(`lead.${leadId}`)
      channel
        .listen('.message.created', (data: MessageEvent) => {
          queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
          onMessageRef.current?.(data)
        })
        .listen('.lead.updated', (data: LeadUpdatedEvent) => {
          queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
          queryClient.invalidateQueries({ queryKey: ['leads'] })
          onLeadUpdatedRef.current?.(data)
        })
    }

    subscribe()

    const handleReconnect = () => subscribe()
    window.addEventListener('echo:reconnected', handleReconnect)

    return () => {
      window.removeEventListener('echo:reconnected', handleReconnect)
      getEcho()?.leave(`lead.${leadId}`)
    }
  }, [leadId, queryClient])
}

/**
 * Hook global para escutar todas as mensagens do tenant.
 * Deve ser montado UMA VEZ no layout principal.
 */
export function useTenantMessages(tenantId: string | null) {
  const { addUnreadMessage } = useNotificationStore()
  const queryClient = useQueryClient()
  const soundEnabled = useSoundSettings((s) => s.enabled)
  const soundVolume = useSoundSettings((s) => s.volume)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const currentUserRole = useAuthStore((s) => s.user?.role)

  // Use refs for values that change but shouldn't cause re-subscribe
  const soundEnabledRef = useRef(soundEnabled)
  const soundVolumeRef = useRef(soundVolume)
  const currentUserIdRef = useRef(currentUserId)
  const currentUserRoleRef = useRef(currentUserRole)
  soundEnabledRef.current = soundEnabled
  soundVolumeRef.current = soundVolume
  currentUserIdRef.current = currentUserId
  currentUserRoleRef.current = currentUserRole

  useEffect(() => {
    if (!tenantId || !getEcho()) return

    const subscribe = () => {
      const echoInstance = getEcho()
      if (!echoInstance) return
      const channel = echoInstance.private(`tenant.${tenantId}`)

      channel
        .listen('.message.created', (data: MessageEvent) => {
          const isInbound = data.message.direction === 'inbound'
          const userId = currentUserIdRef.current
          const userRole = currentUserRoleRef.current

          // Admin/Gestor receive ALL inbound notifications; vendedor only their own leads
          const isAdminOrGestor = userRole === 'admin' || userRole === 'gestor'
          const isResponsible = isAdminOrGestor ||
            !data.owner_id ||
            String(data.owner_id) === String(userId) ||
            String(data.assigned_user_id) === String(userId)

          if (data.lead_id && isInbound && isResponsible) {
            addUnreadMessage(data.lead_id, data.message.content)

            if (soundEnabledRef.current) {
              playNotificationSound(soundVolumeRef.current)
            }

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
              } catch { /* ignore */ }
            }
          }

          // Only invalidate the specific lead, not ALL leads (avoids heavy re-fetch)
          if (data.lead_id) {
            queryClient.invalidateQueries({ queryKey: ['lead', data.lead_id] })
          }
        })
        .listen('.lead.updated', (data: { action: string; lead: any }) => {
          // Lead updates (transfer, stage change) need full list refresh
          queryClient.invalidateQueries({ queryKey: ['leads'] })
          if (data.lead?.id) {
            queryClient.invalidateQueries({ queryKey: ['lead', data.lead.id] })
          }
        })
    }

    subscribe()

    const handleReconnect = () => {
      // Leave stale channel first, then re-subscribe
      try { getEcho()?.leave(`tenant.${tenantId}`) } catch { /* ignore */ }
      subscribe()
    }
    window.addEventListener('echo:reconnected', handleReconnect)

    return () => {
      window.removeEventListener('echo:reconnected', handleReconnect)
      getEcho()?.leave(`tenant.${tenantId}`)
    }
  }, [tenantId, addUnreadMessage, queryClient])
}

/**
 * Hook to force Echo reconnection when auth token changes (login/refresh).
 */
export function useEchoTokenSync() {
  const token = useAuthStore((s) => s.token)
  const prevTokenRef = useRef(token)

  useEffect(() => {
    if (token && token !== prevTokenRef.current) {
      prevTokenRef.current = token
      reconnectEcho()
    }
  }, [token])
}
