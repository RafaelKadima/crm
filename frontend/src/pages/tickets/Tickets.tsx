import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { motion } from 'framer-motion'
import { Search, MessageSquare, Clock, User, Loader2, MessageCircle, CheckCircle2, Inbox } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatDateTime } from '@/lib/utils'
import { useTickets } from '@/hooks/useTickets'
import { LeadChatModal } from '@/components/chat/LeadChatModal'
import type { Lead } from '@/types'

const statusConfig: Record<string, { label: string; variant: 'info' | 'warning' | 'secondary' | 'success' }> = {
  open: { label: 'Aberto', variant: 'info' },
  in_progress: { label: 'Em Atendimento', variant: 'warning' },
  waiting_customer: { label: 'Aguardando', variant: 'secondary' },
  closed: { label: 'Encerrado', variant: 'success' },
}

// Filtros simplificados
type StatusFilterType = 'all' | 'pending' | 'open' | 'closed'

const filterTabs: { key: StatusFilterType; label: string; icon: any; color: string }[] = [
  { key: 'all', label: 'Todos', icon: Inbox, color: 'text-muted-foreground' },
  { key: 'pending', label: 'Pendentes', icon: Clock, color: 'text-amber-400' },
  { key: 'open', label: 'Em Atendimento', icon: MessageCircle, color: 'text-blue-400' },
  { key: 'closed', label: 'Encerrados', icon: CheckCircle2, color: 'text-green-400' },
]

export function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('open') // Default: abertos
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Busca todos os tickets (sem filtro de status na API)
  const { data: ticketsData, isLoading, refetch } = useTickets({})

  const allTickets = ticketsData?.data || []

  // Função para determinar o status do ticket
  const getTicketStatus = (ticket: any): 'pending' | 'open' | 'closed' => {
    // Ticket fechado = Encerrado
    if (ticket.status === 'closed') {
      return 'closed'
    }
    
    // Ticket aberto = Em Atendimento (independente de ter mensagens)
    // Pendente seria apenas para leads sem ticket, não para tickets
    return 'open'
  }

  // Verifica se tem mensagem não respondida (para destacar)
  const hasUnreadMessage = (ticket: any): boolean => {
    // Usa last_message do backend (mais eficiente)
    const lastMessage = ticket.last_message || ticket.lastMessage
    if (!lastMessage) return false
    
    // Mensagem do cliente não respondida = precisa piscar
    return lastMessage?.direction === 'inbound' || lastMessage?.sender_type === 'contact'
  }

  // Contadores (calculados a partir de todos os tickets)
  const counts = useMemo(() => {
    let pending = 0
    let open = 0
    let closed = 0
    
    allTickets.forEach((ticket: any) => {
      const status = getTicketStatus(ticket)
      if (status === 'pending') pending++
      else if (status === 'open') open++
      else closed++
    })
    
    return { pending, open, closed, total: allTickets.length }
  }, [allTickets])

  // Filtra por status selecionado
  const ticketsByStatus = useMemo(() => {
    if (statusFilter === 'all') return allTickets
    
    return allTickets.filter((ticket: any) => {
      const status = getTicketStatus(ticket)
      return status === statusFilter
    })
  }, [allTickets, statusFilter])

  // Filtra localmente por busca
  const filteredTickets = useMemo(() => {
    if (!searchQuery) return ticketsByStatus
    const query = searchQuery.toLowerCase()
    return ticketsByStatus.filter((ticket: any) =>
      ticket.contact?.name?.toLowerCase().includes(query) ||
      ticket.contact?.phone?.includes(query) ||
      ticket.subject?.toLowerCase().includes(query)
    )
  }, [ticketsByStatus, searchQuery])

  // Abre o chat do ticket
  const handleTicketClick = (ticket: any) => {
    // Se o ticket tem um lead associado, usa ele diretamente
    if (ticket.lead) {
      // Garante que o lead tem o ticket associado
      const leadWithTicket = {
        ...ticket.lead,
        tickets: [ticket],
      }
      setSelectedLead(leadWithTicket)
      setIsModalOpen(true)
      return
    }

    // Caso contrário, monta um objeto lead a partir do ticket
    const lead: Lead = {
      id: ticket.lead_id || ticket.id,
      tenant_id: ticket.tenant_id,
      contact_id: ticket.contact_id,
      contact: ticket.contact,
      channel_id: ticket.channel_id,
      channel: ticket.channel,
      pipeline_id: ticket.lead?.pipeline_id || '',
      stage_id: ticket.lead?.stage_id || '',
      stage: ticket.lead?.stage,
      owner_id: ticket.assigned_user_id,
      owner: ticket.assigned_user,
      status: ticket.lead?.status || 'em_atendimento',
      tickets: [ticket],
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
    }
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setTimeout(() => setSelectedLead(null), 200)
      refetch() // Atualiza a lista após fechar
    }
  }

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
      <PageHeader
        title="Conversas"
        subtitle={`${filteredTickets.length} ${
          statusFilter === 'pending' ? 'pendentes' :
          statusFilter === 'open' ? 'em atendimento' :
          statusFilter === 'closed' ? 'encerradas' :
          'no total'
        }`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Tabs */}
        <div className="flex bg-muted/50 rounded-lg p-1 gap-1">
          {filterTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                  isActive
                    ? 'bg-accent text-white shadow-md'
                    : 'text-muted-foreground hover:text-white hover:bg-accent/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? tab.color : ''}`} />
                <span className="font-medium">{tab.label}</span>
                {tab.key !== 'all' && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-muted-foreground/20' : 'bg-accent'
                  } ${tab.key === 'pending' && counts.pending > 0 ? 'bg-amber-500/30 text-amber-300' : ''}`}>
                    {tab.key === 'pending' ? counts.pending : tab.key === 'open' ? counts.open : counts.closed}
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
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map((ticket: any, index: number) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={`hover:shadow-lg transition-shadow cursor-pointer hover:border-blue-500/50 relative ${
                hasUnreadMessage(ticket) ? 'ring-2 ring-green-500/50 border-green-500/30' : ''
              }`}
              onClick={() => handleTicketClick(ticket)}
            >
              {/* Badge piscando para mensagem não respondida */}
              {hasUnreadMessage(ticket) && (
                <div className="absolute -top-2 -right-2 z-10">
                  <span className="relative flex h-5 w-5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-green-500 text-white text-[10px] font-bold">
                      !
                    </span>
                  </span>
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative">
                      <Avatar fallback={ticket.contact?.name || 'T'} size="md" />
                      {hasUnreadMessage(ticket) && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{ticket.contact?.name || 'Sem nome'}</h3>
                        <Badge variant={statusConfig[ticket.status]?.variant || 'secondary'}>
                          {statusConfig[ticket.status]?.label || ticket.status}
                        </Badge>
                        {hasUnreadMessage(ticket) && (
                          <span className="text-xs text-green-500 font-medium animate-pulse">
                            Nova mensagem!
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {ticket.contact?.phone && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ticket.contact.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {ticket.messages_count ?? ticket.messages?.length ?? 0} mensagens
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{ticket.channel?.name || 'Direto'}</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredTickets.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Nenhum ticket encontrado</p>
          <p className="text-sm mt-1">
            {searchQuery ? 'Tente ajustar sua busca' : statusFilter === 'open' ? 'Nenhum chat aberto no momento' : 'Nenhum chat encerrado'}
          </p>
        </div>
      )}

      {/* Modal de Chat */}
      <LeadChatModal
        lead={selectedLead}
        open={isModalOpen}
        onOpenChange={handleModalClose}
      />
    </div>
  )
}
