import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { useConversasStore, useActiveConversation } from '@/store/conversasStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useAuthStore } from '@/store/authStore'
// useTenantMessages moved to MainLayout (global)
import { useLeads } from '@/hooks/useLeads'
import { useMarkTicketAsOpened } from '@/hooks/useTicketActions'
import { ConversationsList } from '@/components/conversas/ConversationsList'
import { ChatPanel } from '@/components/conversas/ChatPanel'
import { LeadInfoSidebar } from '@/components/conversas/LeadInfoSidebar'
import type { Lead } from '@/types'

export function ConversasPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { activeLeadId, setActiveLead } = useActiveConversation()
  const { isInfoSidebarOpen, toggleInfoSidebar } = useConversasStore()
  const markAsRead = useNotificationStore((state) => state.markAsRead)
  const markTicketAsOpened = useMarkTicketAsOpened()

  // Ref para controlar se já processamos o lead da URL
  const processedUrlLeadRef = useRef<string | null>(null)

  // WebSocket is global in MainLayout

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

  // Transição pending → open: dispara o endpoint de "primeira abertura" se o ticket
  // mais recente do lead estiver pendente. Idempotente, fire-and-forget — não bloqueia
  // a navegação. NÃO altera ownership; só status + first_viewed_at/first_viewer_id.
  const triggerFirstViewIfPending = (lead: Lead) => {
    const ticket = lead.tickets?.[0]
    if (ticket?.id && ticket.status === 'pending') {
      markTicketAsOpened.mutate(ticket.id)
    }
  }

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
        triggerFirstViewIfPending(lead)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, rawLeads, setActiveLead, markAsRead])

  // Quando seleciona um lead
  const handleSelectLead = (lead: Lead) => {
    setActiveLead(lead.id, lead.tickets?.[0]?.id || null)
    markAsRead(lead.id)
    triggerFirstViewIfPending(lead)
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
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--color-muted)' }}>
      <div className="max-w-sm text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'var(--color-secondary)' }}
        >
          <MessageSquare className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="eyebrow mb-2">INBOX · ESPERANDO</p>
        <h3 className="font-display text-[26px] leading-[1.1] tracking-[-0.015em]">
          {t('empty.noConversationSelected')}
        </h3>
        <p className="mt-2 text-[13.5px] text-muted-foreground">
          {t('empty.selectConversationToStart')}
        </p>
      </div>
    </div>
  )
}
