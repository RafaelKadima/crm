import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { useConversasStore, useActiveConversation } from '@/store/conversasStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
import { useTenantMessages } from '@/hooks/useWebSocket'
import { useLeads } from '@/hooks/useLeads'
import { ConversationsList } from '@/components/conversas/ConversationsList'
import { ChatPanel } from '@/components/conversas/ChatPanel'
import { LeadInfoSidebar } from '@/components/conversas/LeadInfoSidebar'
import type { Lead } from '@/types'

export function ConversasPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { activeLeadId, setActiveLead } = useActiveConversation()
  const { isInfoSidebarOpen, toggleInfoSidebar } = useConversasStore()
  const markAsRead = useNotificationStore((state) => state.markAsRead)

  // Ref para controlar se já processamos o lead da URL
  const processedUrlLeadRef = useRef<string | null>(null)

  // WebSocket para notificações em tempo real
  useTenantMessages(user?.tenant_id || null)

  // Busca todos os leads (mesmo hook usado no Kanban)
  const { data: leadsResponse, isLoading: isLoadingLeads } = useLeads()

  // Notification store para enriquecer leads com unread count
  const unreadMessages = useNotificationStore((state) => state.unreadMessages)

  // Extrai leads do response (sem enriquecer aqui para evitar loops)
  const rawLeads = leadsResponse?.data || []

  // Enriquece leads com notificações para exibição
  const leadsData = useMemo(() => {
    return rawLeads.map((lead: Lead) => {
      const notification = unreadMessages.get(lead.id)
      return {
        ...lead,
        unread_messages: notification?.count || 0,
        has_new_message: !!notification,
        last_message_at: notification?.lastMessageAt,
      }
    })
  }, [rawLeads, unreadMessages])

  // Lead ativo (se tiver um selecionado)
  const activeLead = leadsData?.find((lead: Lead) => lead.id === activeLeadId)

  // Se veio da URL com ?lead=xxx, abre essa conversa (apenas uma vez)
  useEffect(() => {
    const leadIdFromUrl = searchParams.get('lead')

    // Só processa se tiver lead na URL, leads carregados, e ainda não processamos este lead
    if (leadIdFromUrl && rawLeads.length > 0 && processedUrlLeadRef.current !== leadIdFromUrl) {
      const lead = rawLeads.find((l: Lead) => l.id === leadIdFromUrl)
      if (lead) {
        processedUrlLeadRef.current = leadIdFromUrl
        setActiveLead(lead.id, lead.tickets?.[0]?.id || null)
        markAsRead(lead.id)
      }
    }
  }, [searchParams, rawLeads, setActiveLead, markAsRead])

  // Quando seleciona um lead
  const handleSelectLead = (lead: Lead) => {
    setActiveLead(lead.id, lead.tickets?.[0]?.id || null)
    markAsRead(lead.id)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Lista de Conversas - Esquerda */}
      <div className="w-80 border-r flex-shrink-0 flex flex-col bg-muted/20">
        <ConversationsList
          leads={leadsData || []}
          isLoading={isLoadingLeads}
          activeLeadId={activeLeadId}
          onSelectLead={handleSelectLead}
        />
      </div>

      {/* Chat Panel - Centro */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeLead ? (
          <ChatPanel
            lead={activeLead}
            onToggleInfo={toggleInfoSidebar}
            isInfoOpen={isInfoSidebarOpen}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Sidebar Info Lead - Direita (colapsável) */}
      <AnimatePresence>
        {activeLead && isInfoSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l flex-shrink-0 overflow-hidden"
          >
            <LeadInfoSidebar
              lead={activeLead}
              onClose={toggleInfoSidebar}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center bg-muted/10">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Nenhuma conversa selecionada</h3>
        <p className="text-muted-foreground max-w-sm">
          Selecione uma conversa na lista ao lado para começar a atender
        </p>
      </div>
    </div>
  )
}
