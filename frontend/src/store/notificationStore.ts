import { create } from 'zustand'

interface UnreadMessage {
  leadId: string
  count: number
  lastMessageAt: string
  lastMessagePreview?: string
}

interface NotificationState {
  unreadMessages: Map<string, UnreadMessage>
  
  // Actions
  addUnreadMessage: (leadId: string, preview?: string) => void
  markAsRead: (leadId: string) => void
  markAllAsRead: () => void
  getUnreadCount: (leadId: string) => number
  hasUnread: (leadId: string) => boolean
  getTotalUnread: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadMessages: new Map(),

  addUnreadMessage: (leadId: string, preview?: string) => {
    set((state) => {
      const newMap = new Map(state.unreadMessages)
      const existing = newMap.get(leadId)
      
      newMap.set(leadId, {
        leadId,
        count: (existing?.count || 0) + 1,
        lastMessageAt: new Date().toISOString(),
        lastMessagePreview: preview,
      })
      
      return { unreadMessages: newMap }
    })
  },

  markAsRead: (leadId: string) => {
    set((state) => {
      const newMap = new Map(state.unreadMessages)
      newMap.delete(leadId)
      return { unreadMessages: newMap }
    })
  },

  markAllAsRead: () => {
    set({ unreadMessages: new Map() })
  },

  getUnreadCount: (leadId: string) => {
    return get().unreadMessages.get(leadId)?.count || 0
  },

  hasUnread: (leadId: string) => {
    return get().unreadMessages.has(leadId)
  },

  getTotalUnread: () => {
    let total = 0
    get().unreadMessages.forEach((msg) => {
      total += msg.count
    })
    return total
  },
}))

// Helper hook to get unread info for a specific lead
export function useLeadNotification(leadId: string) {
  const unreadMessages = useNotificationStore((state) => state.unreadMessages)
  const markAsRead = useNotificationStore((state) => state.markAsRead)
  
  const unreadInfo = unreadMessages.get(leadId)
  
  return {
    hasUnread: !!unreadInfo,
    unreadCount: unreadInfo?.count || 0,
    lastMessageAt: unreadInfo?.lastMessageAt,
    lastMessagePreview: unreadInfo?.lastMessagePreview,
    markAsRead: () => markAsRead(leadId),
  }
}

