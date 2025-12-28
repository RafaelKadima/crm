import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type FilterType = 'all' | 'pending' | 'mine' | 'unread'

interface ConversasState {
  // Conversa ativa
  activeLeadId: string | null
  activeTicketId: string | null

  // Filtros
  filter: FilterType
  searchQuery: string

  // UI
  isInfoSidebarOpen: boolean

  // Ações
  setActiveLead: (leadId: string, ticketId?: string | null) => void
  clearActiveLead: () => void
  setFilter: (filter: FilterType) => void
  setSearchQuery: (query: string) => void
  toggleInfoSidebar: () => void
  setInfoSidebarOpen: (open: boolean) => void
}

export const useConversasStore = create<ConversasState>()(
  persist(
    (set) => ({
      // Estado inicial
      activeLeadId: null,
      activeTicketId: null,
      filter: 'all',
      searchQuery: '',
      isInfoSidebarOpen: true,

      // Ações
      setActiveLead: (leadId, ticketId = null) => set({
        activeLeadId: leadId,
        activeTicketId: ticketId,
      }),

      clearActiveLead: () => set({
        activeLeadId: null,
        activeTicketId: null,
      }),

      setFilter: (filter) => set({ filter }),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleInfoSidebar: () => set((state) => ({
        isInfoSidebarOpen: !state.isInfoSidebarOpen,
      })),

      setInfoSidebarOpen: (open) => set({ isInfoSidebarOpen: open }),
    }),
    {
      name: 'crm-conversas',
      partialize: (state) => ({
        // Persiste apenas preferências de UI, não a conversa ativa
        filter: state.filter,
        isInfoSidebarOpen: state.isInfoSidebarOpen,
      }),
    }
  )
)

// Helper hook para obter estado da conversa ativa
export function useActiveConversation() {
  const activeLeadId = useConversasStore((state) => state.activeLeadId)
  const activeTicketId = useConversasStore((state) => state.activeTicketId)
  const setActiveLead = useConversasStore((state) => state.setActiveLead)
  const clearActiveLead = useConversasStore((state) => state.clearActiveLead)

  return {
    activeLeadId,
    activeTicketId,
    hasActiveConversation: !!activeLeadId,
    setActiveLead,
    clearActiveLead,
  }
}

// Helper hook para filtros
export function useConversasFilters() {
  const filter = useConversasStore((state) => state.filter)
  const searchQuery = useConversasStore((state) => state.searchQuery)
  const setFilter = useConversasStore((state) => state.setFilter)
  const setSearchQuery = useConversasStore((state) => state.setSearchQuery)

  return {
    filter,
    searchQuery,
    setFilter,
    setSearchQuery,
  }
}
