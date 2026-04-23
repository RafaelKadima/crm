import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Plus, Search, Loader2, Bell, Settings2, ChevronDown, Upload, MessageCircle, CheckCircle2, Inbox, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { LeadChatModal } from '@/components/chat/LeadChatModal'
import { PipelineManagerModal } from '@/components/pipelines/PipelineManagerModal'
import { CreateLeadModal } from '@/components/leads/CreateLeadModal'
import { ImportLeadsModal } from './ImportLeadsModal'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { SaleClosingModal } from '@/components/sales/SaleClosingModal'
import { useInfiniteLeads, useUpdateLeadStage } from '@/hooks/useLeads'
import { useBatchStageProgress } from '@/hooks/useStageActivities'
import { usePipelines, type Pipeline } from '@/hooks/usePipelines'
import { useNotificationStore } from '@/store/notificationStore'
// useTenantMessages moved to MainLayout (global)
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { Lead, PipelineStage } from '@/types'

// Filtros de status de conversa
type TicketFilterType = 'all' | 'pending' | 'open' | 'closed'

export function LeadsKanbanPage() {
  const { t } = useTranslation()

  const ticketFilterTabs: { key: TicketFilterType; label: string; icon: any; color: string; description: string }[] = [
    { key: 'all', label: t('common.all'), icon: Inbox, color: 'text-muted-foreground', description: t('leads.allLeads') },
    { key: 'pending', label: t('leads.pendingLabel'), icon: Bell, color: 'text-muted-foreground', description: t('leads.awaitingService') },
    { key: 'open', label: t('leads.inServiceLabel'), icon: MessageCircle, color: 'text-muted-foreground', description: t('leads.activeConversations') },
    { key: 'closed', label: t('leads.closedLabel'), icon: CheckCircle2, color: 'text-muted-foreground', description: t('leads.finishedConversations') },
  ]
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('') // Busca com debounce para API
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [localLeads, setLocalLeads] = useState<Lead[]>([])
  const [forceClosingForm, setForceClosingForm] = useState(false) // Para abrir formulário de fechamento
  const [isPipelineManagerOpen, setIsPipelineManagerOpen] = useState(false)
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [showPipelineSelector, setShowPipelineSelector] = useState(false)
  const [ticketFilter, setTicketFilter] = useState<TicketFilterType>('all') // Filtro de status do ticket
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false) // Modal de fechamento de venda
  const [pendingWonLead, setPendingWonLead] = useState<Lead | null>(null) // Lead aguardando fechamento
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')

  // Debounce da busca para evitar muitas requisições
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500) // 500ms de debounce
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch data from API - Carrega todos os leads de uma vez
  // Passa a busca para o backend quando há 3+ caracteres
  const {
    data: leadsData,
    isLoading: leadsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteLeads({
    per_page: 500,
    search: debouncedSearch.length >= 3 ? debouncedSearch : undefined
  })

  // Kanban precisa mostrar TODOS os leads do pipeline. Busca próximas páginas
  // automaticamente até acabar — sem isso, etapas com leads mais antigos ficam vazias.
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines()
  const updateStageMutation = useUpdateLeadStage()

  // Auth store para pegar o tenant_id
  const { user } = useAuthStore()

  // Notification store (WebSocket global in MainLayout)
  const { 
    unreadMessages, 
    markAsRead, 
    addUnreadMessage,
    getTotalUnread,
    markAllAsRead 
  } = useNotificationStore()

  // Flatten all pages into a single array of leads
  const allLeads = useMemo(() => {
    if (!leadsData?.pages) return []
    return leadsData.pages.flatMap(page => page.data || [])
  }, [leadsData])

  // Pré-carrega progresso de atividades de todos os leads em 1 request (evita N+1 no kanban).
  // Resultado popula o cache React Query que KanbanCard::useLeadStageProgress consome.
  const allLeadIds = useMemo(() => allLeads.map((l: Lead) => l.id), [allLeads])
  useBatchStageProgress(allLeadIds)

  // Sync API data with local state
  useEffect(() => {
    if (allLeads.length > 0) {
      setLocalLeads(allLeads)
    }
  }, [allLeads])

  // Get pipelines array
  const pipelinesArray = useMemo(() => {
    if (!pipelines) return []
    return Array.isArray(pipelines) ? pipelines : (pipelines as any)?.data || []
  }, [pipelines])

  // Get selected or default pipeline
  const currentPipeline = useMemo(() => {
    if (!pipelinesArray.length) return null
    if (selectedPipelineId) {
      const found = pipelinesArray.find((p: Pipeline) => p.id === selectedPipelineId)
      if (found) return found
    }
    return pipelinesArray.find((p: Pipeline) => p.is_default) || pipelinesArray[0]
  }, [pipelinesArray, selectedPipelineId])

  // Set initial pipeline
  useEffect(() => {
    if (currentPipeline && !selectedPipelineId) {
      setSelectedPipelineId(currentPipeline.id)
    }
  }, [currentPipeline, selectedPipelineId])

  const stages: PipelineStage[] = useMemo(() => {
    if (!currentPipeline?.stages) return []
    return currentPipeline.stages.map((s: any) => ({
      id: s.id,
      pipeline_id: s.pipeline_id,
      name: s.name,
      color: s.color,
      order: s.order,
      is_final: s.order === currentPipeline.stages.length - 1,
      is_won: s.stage_type === 'won' || s.slug === 'fechamento',
      stage_type: s.stage_type || 'open',
      slug: s.slug,
    })).sort((a: PipelineStage, b: PipelineStage) => a.order - b.order)
  }, [currentPipeline])

  // Enrich leads with notification data and sort unread to top
  const enrichedLeads = useMemo(() => {
    const enriched = localLeads.map((lead) => {
      const notification = unreadMessages.get(lead.id)
      return {
        ...lead,
        unread_messages: notification?.count || 0,
        has_new_message: !!notification,
        last_message_at: notification?.lastMessageAt || lead.last_message_at,
      }
    })

    // Sort: unread first (by most recent message), then rest by last_message_at
    return enriched.sort((a, b) => {
      const aUnread = a.unread_messages > 0 ? 1 : 0
      const bUnread = b.unread_messages > 0 ? 1 : 0
      if (aUnread !== bUnread) return bUnread - aUnread
      // Among unreads (or among reads), sort by most recent message
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return bTime - aTime
    })
  }, [localLeads, unreadMessages])

  // Função para determinar o status do lead baseado no ticket
  const getLeadStatus = (lead: Lead): 'pending' | 'open' | 'closed' => {
    const latestTicket = (lead as any).tickets?.[0]

    // Lead sem ticket = pendente (novo lead que chegou, sem mensagem ainda)
    if (!latestTicket) {
      return 'pending'
    }

    // Status nativo do ticket: pending = ninguém abriu ainda
    if (latestTicket.status === 'pending') {
      return 'pending'
    }

    // Ticket fechado MAS com mensagens não lidas = lead reabriu conversa = pendente
    if (latestTicket.status === 'closed') {
      if (lead.unread_messages && lead.unread_messages > 0) {
        return 'pending' // Cliente mandou msg após encerrar = precisa reabrir
      }
      return 'closed'
    }

    // Ticket aberto/waiting_customer = em atendimento (mesmo com msg não lida)
    // A msg não lida faz o card piscar, mas não muda o status
    return 'open'
  }

  // Verifica se o lead tem mensagem não respondida (para fazer o card piscar)
  const hasUnreadMessage = (lead: Lead): boolean => {
    return (lead.unread_messages ?? 0) > 0
  }

  // Filtra leads por status do ticket
  const leadsFilteredByTicketStatus = useMemo(() => {
    if (ticketFilter === 'all') return enrichedLeads
    
    return enrichedLeads.filter((lead) => {
      const status = getLeadStatus(lead)
      return status === ticketFilter
    })
  }, [enrichedLeads, ticketFilter])

  // Contadores de tickets
  const ticketCounts = useMemo(() => {
    let pending = 0
    let open = 0
    let closed = 0
    
    enrichedLeads.forEach((lead) => {
      const status = getLeadStatus(lead)
      if (status === 'pending') pending++
      else if (status === 'open') open++
      else closed++
    })
    
    return { pending, open, closed, total: enrichedLeads.length }
  }, [enrichedLeads])

  // Verifica se o estágio é de ganho (won)
  const isWonStage = (stageId: string): boolean => {
    const stage = stages.find(s => s.id === stageId)
    if (!stage) return false
    return stage.stage_type === 'won' || stage.is_won
  }

  // Verifica se o estágio é de fechamento (won ou lost)
  const isClosingStage = (stageId: string): boolean => {
    const stage = stages.find(s => s.id === stageId)
    if (!stage) return false
    return stage.stage_type === 'won' ||
           stage.stage_type === 'lost' ||
           stage.is_final ||
           stage.is_won
  }

  const handleLeadMove = (leadId: string, newStageId: string) => {
    // IMMEDIATE local update - no waiting for API
    setLocalLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, stage_id: newStageId } : lead
      )
    )

    // Then sync with API in background
    updateStageMutation.mutate(
      { id: leadId, stage_id: newStageId },
      {
        onError: () => {
          // Revert on error - refetch from API
          if (allLeads.length > 0) {
            setLocalLeads(allLeads)
          }
        },
      }
    )

    // Se moveu para estágio de GANHO, abre o modal de fechamento de venda
    if (isWonStage(newStageId)) {
      const lead = localLeads.find(l => l.id === leadId)
      if (lead) {
        setPendingWonLead(lead)
        setIsSaleModalOpen(true)
      }
    }
    // Se moveu para outro estágio de fechamento (ex: perda), abre o chat normal
    else if (isClosingStage(newStageId)) {
      const lead = localLeads.find(l => l.id === leadId)
      if (lead) {
        const enrichedLead = {
          ...lead,
          stage_id: newStageId,
          stage: stages.find(s => s.id === newStageId),
        }
        setSelectedLead(enrichedLead)
        setForceClosingForm(true)
        setIsModalOpen(true)
      }
    }
  }

  // Callback quando a venda e fechada com sucesso
  const handleSaleSuccess = () => {
    setPendingWonLead(null)
    // Pode mostrar uma notificacao de sucesso se quiser
  }

  const handleLeadClick = (lead: Lead) => {
    // Mark as read when opening
    markAsRead(lead.id)

    // Abre o modal de chat diretamente no Kanban (não navega para outra página)
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      // Clear selection and reset forceClosingForm after modal close animation
      setTimeout(() => {
        setSelectedLead(null)
        setForceClosingForm(false)
      }, 200)
    }
  }

  // Remove lead locally (para exclusão)
  const handleLeadDeleted = (leadId: string) => {
    setLocalLeads(prev => prev.filter(lead => lead.id !== leadId))
    setIsModalOpen(false)
    setSelectedLead(null)
  }

  const handleStageChange = (leadId: string, stageId: string) => {
    handleLeadMove(leadId, stageId)
    // Update selected lead's stage
    setSelectedLead((prev) => 
      prev ? { ...prev, stage_id: stageId, stage: stages.find(s => s.id === stageId) } : null
    )
  }

  const filteredLeads = useMemo(() => {
    // Se busca tem 3+ caracteres, o backend já filtra - não precisa filtrar localmente
    if (debouncedSearch.length >= 3) return leadsFilteredByTicketStatus
    // Se busca tem 1-2 caracteres, filtra localmente nos dados carregados
    if (searchQuery && searchQuery.length < 3) {
      const query = searchQuery.toLowerCase()
      return leadsFilteredByTicketStatus.filter((lead) =>
        lead.contact?.name?.toLowerCase().includes(query) ||
        lead.contact?.phone?.includes(query) ||
        lead.title?.toLowerCase().includes(query)
      )
    }
    return leadsFilteredByTicketStatus
  }, [leadsFilteredByTicketStatus, searchQuery, debouncedSearch])

  const totalUnread = getTotalUnread()
  const isLoading = leadsLoading || pipelinesLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const subtitleCount = `${filteredLeads.length} ${
    ticketFilter === 'pending' ? t('leads.pending') :
    ticketFilter === 'open' ? t('leads.inService') :
    ticketFilter === 'closed' ? t('leads.closed') :
    t('leads.inFunnel')
  }`

  return (
    <div className="flex-1 flex flex-col gap-5 min-h-0">
      {/* ═══════════ HERO HEADER ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="shrink-0 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p className="eyebrow">LEADS · PIPELINE</p>
          <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
            {t('leads.title')}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {subtitleCount}
          </p>

          {/* Pipeline selector inline under title */}
          {(user?.role === 'admin' || user?.role === 'gestor' || pipelinesArray.length > 1) && (
            <div className="relative mt-3 inline-block">
              <button
                onClick={() => setShowPipelineSelector(!showPipelineSelector)}
                className="inline-flex items-center gap-2 rounded-[10px] border px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-muted"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="text-muted-foreground">Pipeline:</span>
                <span>{currentPipeline?.name || t('leads.selectPipeline')}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showPipelineSelector ? 'rotate-180' : ''}`} />
              </button>

              {showPipelineSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-[12px] border shadow-lg"
                  style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                >
                  <div className="max-h-60 overflow-y-auto">
                    {pipelinesArray.map((pipeline: Pipeline) => (
                      <button
                        key={pipeline.id}
                        onClick={() => {
                          setSelectedPipelineId(pipeline.id)
                          setShowPipelineSelector(false)
                        }}
                        className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-muted ${
                          pipeline.id === selectedPipelineId ? 'bg-muted' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{pipeline.name}</p>
                          <p className="text-[11px] text-muted-foreground">{pipeline.stages?.length || 0} {t('leads.stages')}</p>
                        </div>
                        {pipeline.is_default && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ background: 'var(--color-secondary)', color: 'var(--color-muted-foreground)' }}
                          >
                            {t('common.default')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {(user?.role === 'admin' || user?.role === 'gestor') && (
                    <div className="border-t p-2" style={{ borderColor: 'var(--color-border)' }}>
                      <button
                        onClick={() => {
                          setShowPipelineSelector(false)
                          setIsPipelineManagerOpen(true)
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-[8px] px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        {t('leads.managePipelines')}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div
            className="flex items-center gap-1 rounded-[10px] p-1"
            style={{ background: 'var(--color-secondary)' }}
          >
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'rounded-[7px] p-1.5 transition-all',
                viewMode === 'kanban'
                  ? 'shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              style={viewMode === 'kanban' ? { background: 'var(--color-card)', color: 'var(--color-foreground)' } : undefined}
              title="Kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-[7px] p-1.5 transition-all',
                viewMode === 'table'
                  ? 'shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              style={viewMode === 'table' ? { background: 'var(--color-card)', color: 'var(--color-foreground)' } : undefined}
              title="Tabela"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {currentPipeline?.user_permissions?.is_admin && (
            <Button variant="outline" size="sm" onClick={() => setIsPipelineManagerOpen(true)}>
              <Settings2 className="mr-1.5 h-4 w-4" />
              {t('common.manage')}
            </Button>
          )}

          {totalUnread > 0 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Button variant="outline" size="sm" onClick={markAllAsRead} className="relative">
                <Bell className="mr-1.5 h-4 w-4" />
                <span className="font-medium">{totalUnread} {t('leads.newMessages', { count: totalUnread })}</span>
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                    style={{ background: 'var(--color-bold-ink)' }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ background: 'var(--color-bold-ink)' }}
                  />
                </span>
              </Button>
            </motion.div>
          )}

          <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            {t('common.import')}
          </Button>
          <Button variant="bold" size="sm" onClick={() => setIsCreateLeadOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('leads.newLead')}
          </Button>
        </div>
      </motion.div>

      {/* ═══════════ FILTERS ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Status tabs — pill neon for active */}
        <div
          className="flex items-center gap-1 rounded-[12px] p-1"
          style={{ background: 'var(--color-secondary)' }}
        >
          {ticketFilterTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = ticketFilter === tab.key
            const count =
              tab.key === 'pending' ? ticketCounts.pending :
              tab.key === 'open' ? ticketCounts.open :
              tab.key === 'closed' ? ticketCounts.closed : null

            return (
              <button
                key={tab.key}
                onClick={() => setTicketFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-colors'
                )}
                style={
                  isActive
                    ? { background: 'var(--color-bold-ink)', color: '#0A0A0C' }
                    : { color: 'var(--color-muted-foreground)' }
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {count != null && (
                  <span
                    className="rounded-full px-1.5 py-0 text-[10.5px] font-bold"
                    style={{
                      background: isActive ? 'rgba(10,10,12,0.12)' : 'var(--color-card)',
                      color: isActive ? '#0A0A0C' : 'var(--color-muted-foreground)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('leads.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-[10px] pl-10 text-[13.5px]"
          />
        </div>
      </motion.div>

      {/* Kanban Board / Table View */}
      <div className="flex-1 min-h-0 overflow-auto">
        {viewMode === 'kanban' ? (
          stages.length > 0 ? (
            <KanbanBoard
              stages={stages}
              leads={filteredLeads}
              onLeadMove={handleLeadMove}
              onLeadClick={handleLeadClick}
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t('leads.noStagesConfigured')}
            </div>
          )
        ) : (
          <LeadsTable
            leads={filteredLeads}
            stages={stages}
            onLeadClick={handleLeadClick}
          />
        )}
      </div>

      {/* Lead Chat Modal */}
      <LeadChatModal
        lead={selectedLead}
        stages={stages}
        open={isModalOpen}
        onOpenChange={handleModalClose}
        onStageChange={handleStageChange}
        forceClosingForm={forceClosingForm}
        onLeadDeleted={handleLeadDeleted}
      />

      {/* Pipeline Manager Modal */}
      <PipelineManagerModal
        isOpen={isPipelineManagerOpen}
        onClose={() => setIsPipelineManagerOpen(false)}
        initialPipelineId={selectedPipelineId || undefined}
      />

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateLeadOpen}
        onClose={() => setIsCreateLeadOpen(false)}
        pipeline={currentPipeline}
        stages={stages}
      />

      <ImportLeadsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Sale Closing Modal - Abre quando lead vai para estagio de ganho */}
      <SaleClosingModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false)
          setPendingWonLead(null)
        }}
        leadId={pendingWonLead?.id || ''}
        leadName={pendingWonLead?.contact?.name || pendingWonLead?.name || 'Cliente'}
        onSuccess={handleSaleSuccess}
      />

      {/* Click outside to close pipeline selector */}
      {showPipelineSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPipelineSelector(false)}
        />
      )}
    </div>
  )
}
