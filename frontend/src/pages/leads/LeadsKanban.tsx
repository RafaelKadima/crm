import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Loader2, Bell, Settings2, ChevronDown, Upload, MessageCircle, CheckCircle2, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { LeadChatModal } from '@/components/chat/LeadChatModal'
import { PipelineManagerModal } from '@/components/pipelines/PipelineManagerModal'
import { CreateLeadModal } from '@/components/leads/CreateLeadModal'
import { ImportLeadsModal } from './ImportLeadsModal'
import { useLeads, useUpdateLeadStage } from '@/hooks/useLeads'
import { usePipelines, type Pipeline } from '@/hooks/usePipelines'
import { useNotificationStore } from '@/store/notificationStore'
import { useTenantMessages } from '@/hooks/useWebSocket'
import { useAuthStore } from '@/store/authStore'
import type { Lead, PipelineStage } from '@/types'

// Filtros de status de conversa
type TicketFilterType = 'all' | 'pending' | 'open' | 'closed'

const ticketFilterTabs: { key: TicketFilterType; label: string; icon: any; color: string; description: string }[] = [
  { key: 'all', label: 'Todos', icon: Inbox, color: 'text-gray-400', description: 'Todos os leads' },
  { key: 'pending', label: 'Pendentes', icon: Bell, color: 'text-amber-400', description: 'Aguardando atendimento' },
  { key: 'open', label: 'Em Atendimento', icon: MessageCircle, color: 'text-blue-400', description: 'Conversas ativas' },
  { key: 'closed', label: 'Encerrados', icon: CheckCircle2, color: 'text-green-400', description: 'Conversas finalizadas' },
]

export function LeadsKanbanPage() {
  const [searchQuery, setSearchQuery] = useState('')
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

  // Fetch data from API
  const { data: leadsData, isLoading: leadsLoading } = useLeads()
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines()
  const updateStageMutation = useUpdateLeadStage()

  // Auth store para pegar o tenant_id
  const { user } = useAuthStore()

  // 🔥 WebSocket: escuta mensagens do tenant em tempo real
  useTenantMessages(user?.tenant_id || null)

  // Notification store
  const { 
    unreadMessages, 
    markAsRead, 
    addUnreadMessage,
    getTotalUnread,
    markAllAsRead 
  } = useNotificationStore()

  // Sync API data with local state
  useEffect(() => {
    if (leadsData?.data) {
      setLocalLeads(leadsData.data)
    }
  }, [leadsData])

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
      is_won: s.slug === 'fechamento',
    })).sort((a: PipelineStage, b: PipelineStage) => a.order - b.order)
  }, [currentPipeline])

  // Enrich leads with notification data
  const enrichedLeads = useMemo(() => {
    return localLeads.map((lead) => {
      const notification = unreadMessages.get(lead.id)
      return {
        ...lead,
        unread_messages: notification?.count || 0,
        has_new_message: !!notification,
        last_message_at: notification?.lastMessageAt,
      }
    })
  }, [localLeads, unreadMessages])

  // Função para determinar o status do lead baseado no ticket
  const getLeadStatus = (lead: Lead): 'pending' | 'open' | 'closed' => {
    const latestTicket = lead.tickets?.[0]
    
    // Lead sem ticket = pendente (novo lead que chegou, sem mensagem ainda)
    if (!latestTicket) {
      return 'pending'
    }
    
    // Ticket fechado MAS com mensagens não lidas = lead reabriu conversa = pendente
    if (latestTicket.status === 'closed') {
      if (lead.unread_messages && lead.unread_messages > 0) {
        return 'pending' // Cliente mandou msg após encerrar = precisa reabrir
      }
      return 'closed'
    }
    
    // Ticket aberto = em atendimento (mesmo com msg não lida, está em atendimento)
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

  // Verifica se o estágio é de fechamento
  const isClosingStage = (stageId: string): boolean => {
    const stage = stages.find(s => s.id === stageId)
    if (!stage) return false
    return stage.is_final || 
           stage.is_won || 
           stage.name?.toLowerCase().includes('fechamento') ||
           stage.name?.toLowerCase().includes('ganho')
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
          if (leadsData?.data) {
            setLocalLeads(leadsData.data)
          }
        },
      }
    )

    // Se moveu para estágio de fechamento, abre o modal com formulário obrigatório
    if (isClosingStage(newStageId)) {
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

  const handleLeadClick = (lead: Lead) => {
    // Mark as read when opening
    markAsRead(lead.id)
    
    // Enrich lead with stage info if not present
    const enrichedLead = {
      ...lead,
      stage: lead.stage || stages.find(s => s.id === lead.stage_id),
      unread_messages: 0,
      has_new_message: false,
    }
    setSelectedLead(enrichedLead)
    setForceClosingForm(false) // Ao clicar normalmente, abre o chat
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
    if (!searchQuery) return leadsFilteredByTicketStatus
    const query = searchQuery.toLowerCase()
    return leadsFilteredByTicketStatus.filter((lead) =>
      lead.contact?.name?.toLowerCase().includes(query) ||
      lead.contact?.phone?.includes(query) ||
      lead.title?.toLowerCase().includes(query)
    )
  }, [leadsFilteredByTicketStatus, searchQuery])

  const totalUnread = getTotalUnread()
  const isLoading = leadsLoading || pipelinesLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground mt-1">
              {filteredLeads.length} {
                ticketFilter === 'pending' ? 'pendentes' : 
                ticketFilter === 'open' ? 'em atendimento' : 
                ticketFilter === 'closed' ? 'encerrados' : 
                'no funil'
              }
            </p>
          </div>
          
          {/* Pipeline Selector - Mostra apenas se admin/gestor OU se tem mais de 1 pipeline */}
          {(user?.role === 'admin' || user?.role === 'gestor' || pipelinesArray.length > 1) && (
            <div className="relative">
              <button
                onClick={() => setShowPipelineSelector(!showPipelineSelector)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="font-medium">{currentPipeline?.name || 'Selecionar Pipeline'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showPipelineSelector ? 'rotate-180' : ''}`} />
              </button>
              
              {showPipelineSelector && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden"
                >
                  <div className="max-h-60 overflow-y-auto">
                    {pipelinesArray.map((pipeline: Pipeline) => (
                      <button
                        key={pipeline.id}
                        onClick={() => {
                          setSelectedPipelineId(pipeline.id)
                          setShowPipelineSelector(false)
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors flex items-center justify-between ${
                          pipeline.id === selectedPipelineId ? 'bg-blue-600/20' : ''
                        }`}
                      >
                        <div>
                          <p className="font-medium">{pipeline.name}</p>
                          <p className="text-xs text-gray-400">{pipeline.stages?.length || 0} estágios</p>
                        </div>
                        {pipeline.is_default && (
                          <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">
                            Padrão
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Só mostra gerenciar pipelines para admin/gestor */}
                  {(user?.role === 'admin' || user?.role === 'gestor') && (
                    <div className="border-t border-gray-700 p-2">
                      <button
                        onClick={() => {
                          setShowPipelineSelector(false)
                          setIsPipelineManagerOpen(true)
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                      >
                        <Settings2 className="w-4 h-4" />
                        Gerenciar Pipelines
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Pipeline settings button */}
          {currentPipeline?.user_permissions?.is_admin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPipelineManagerOpen(true)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Gerenciar
            </Button>
          )}
          
          {/* Notification indicator */}
          {totalUnread > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2"
            >
              <Button 
                variant="outline" 
                size="sm"
                onClick={markAllAsRead}
                className="relative"
              >
                <Bell className="h-4 w-4 mr-2 text-green-500" />
                <span className="text-green-600 font-medium">{totalUnread} nova{totalUnread > 1 ? 's' : ''}</span>
                <span className="absolute -top-1 -right-1 h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </Button>
            </motion.div>
          )}
          <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => setIsCreateLeadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        {/* Status Tabs - Filtro por status do ticket */}
        <div className="flex bg-gray-800/50 rounded-lg p-1 gap-1">
          {ticketFilterTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = ticketFilter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setTicketFilter(tab.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-sm ${
                  isActive
                    ? 'bg-gray-700 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? tab.color : ''}`} />
                <span className="font-medium">{tab.label}</span>
                {tab.key !== 'all' && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-gray-600' : 'bg-gray-700'
                  } ${tab.key === 'pending' && ticketCounts.pending > 0 ? 'bg-amber-500/30 text-amber-300' : ''}`}>
                    {tab.key === 'pending' ? ticketCounts.pending : tab.key === 'open' ? ticketCounts.open : ticketCounts.closed}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Kanban Board */}
      {stages.length > 0 ? (
        <KanbanBoard
          stages={stages}
          leads={filteredLeads}
          onLeadMove={handleLeadMove}
          onLeadClick={handleLeadClick}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum estágio configurado no pipeline
        </div>
      )}

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
