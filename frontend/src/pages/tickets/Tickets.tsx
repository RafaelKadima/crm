import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, MessageSquare, Clock, User, Loader2, MessageCircle, CheckCircle2, Inbox, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { formatDateTime } from '@/lib/utils'
import { useTickets } from '@/hooks/useTickets'
import { useMarkTicketAsOpened } from '@/hooks/useTicketActions'
import { LeadChatModal } from '@/components/chat/LeadChatModal'
import type { Lead } from '@/types'

const statusConfig: Record<string, { label: string; accent: string }> = {
  open:             { label: 'Aberto',         accent: 'var(--color-info)' },
  pending:          { label: 'Pendente',       accent: 'var(--color-warning)' },
  in_progress:      { label: 'Em Atendimento', accent: 'var(--color-warning)' },
  waiting_customer: { label: 'Aguardando',     accent: 'var(--color-muted-foreground)' },
  closed:           { label: 'Encerrado',      accent: 'var(--color-success)' },
}

type StatusFilterType = 'all' | 'waiting_queue' | 'pending' | 'open' | 'closed'

const filterTabs: { key: StatusFilterType; label: string; icon: any }[] = [
  { key: 'all',           label: 'Todos',           icon: Inbox },
  { key: 'waiting_queue', label: 'Aguardando Fila', icon: AlertCircle },
  { key: 'pending',       label: 'Pendentes',       icon: AlertCircle },
  { key: 'open',          label: 'Em Atendimento',  icon: MessageCircle },
  { key: 'closed',        label: 'Encerrados',      icon: CheckCircle2 },
]

export function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('pending')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const markTicketAsOpened = useMarkTicketAsOpened()

  const { data: ticketsData, isLoading, refetch } = useTickets({})
  const { data: waitingQueueData, isLoading: isLoadingWaiting } = useTickets({ waiting_queue: true })

  const allTickets = ticketsData?.data || []
  const waitingQueueTickets = waitingQueueData?.data || []

  const getTicketStatus = (ticket: any): 'pending' | 'open' | 'closed' => {
    if (ticket.status === 'closed') return 'closed'
    if (ticket.status === 'pending') return 'pending'
    return 'open'
  }

  const hasUnreadMessage = (ticket: any): boolean => {
    const lastMessage = ticket.last_message || ticket.lastMessage
    if (!lastMessage) return false
    return lastMessage?.direction === 'inbound' || lastMessage?.sender_type === 'contact'
  }

  const counts = useMemo(() => {
    let waiting_queue = waitingQueueTickets.length
    let pending = 0
    let open = 0
    let closed = 0

    allTickets.forEach((ticket: any) => {
      const status = getTicketStatus(ticket)
      if (status === 'pending') pending++
      else if (status === 'open') open++
      else closed++
    })

    return { waiting_queue, pending, open, closed, total: allTickets.length }
  }, [allTickets, waitingQueueTickets])

  const ticketsByStatus = useMemo(() => {
    if (statusFilter === 'waiting_queue') return waitingQueueTickets
    if (statusFilter === 'all') return allTickets
    return allTickets.filter((ticket: any) => getTicketStatus(ticket) === statusFilter)
  }, [allTickets, waitingQueueTickets, statusFilter])

  const filteredTickets = useMemo(() => {
    if (!searchQuery) return ticketsByStatus
    const query = searchQuery.toLowerCase()
    return ticketsByStatus.filter(
      (ticket: any) =>
        ticket.contact?.name?.toLowerCase().includes(query) ||
        ticket.contact?.phone?.includes(query) ||
        ticket.subject?.toLowerCase().includes(query)
    )
  }, [ticketsByStatus, searchQuery])

  const handleTicketClick = (ticket: any) => {
    if (ticket?.id && ticket.status === 'pending') {
      markTicketAsOpened.mutate(ticket.id)
    }

    if (ticket.lead) {
      setSelectedLead({ ...ticket.lead, tickets: [ticket] })
      setIsModalOpen(true)
      return
    }

    const lead = {
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
    setSelectedLead(lead as Lead)
    setIsModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      setTimeout(() => setSelectedLead(null), 200)
      refetch()
    }
  }

  if (isLoading || isLoadingWaiting) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-bold-ink)' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="eyebrow">INBOX · CONVERSAS</p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
          Conversas
        </h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          <span className="font-display text-[16px] leading-none tracking-[-0.015em]">
            {filteredTickets.length}
          </span>{' '}
          {statusFilter === 'waiting_queue' ? 'aguardando fila' :
           statusFilter === 'pending' ? 'pendentes' :
           statusFilter === 'open' ? 'em atendimento' :
           statusFilter === 'closed' ? 'encerradas' :
           'no total'}
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col gap-3 lg:flex-row lg:items-center"
      >
        <div
          className="flex flex-wrap items-center gap-1 rounded-[12px] p-1"
          style={{ background: 'var(--color-secondary)' }}
        >
          {filterTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = statusFilter === tab.key
            const count =
              tab.key === 'waiting_queue' ? counts.waiting_queue :
              tab.key === 'pending' ? counts.pending :
              tab.key === 'open' ? counts.open :
              tab.key === 'closed' ? counts.closed : counts.total
            const isUrgent = tab.key === 'waiting_queue' && counts.waiting_queue > 0

            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  isUrgent && !isActive ? 'animate-pulse' : ''
                }`}
                style={
                  isActive
                    ? { background: 'var(--color-bold-ink)', color: '#0A0A0C' }
                    : { color: 'var(--color-muted-foreground)' }
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className="rounded-full px-1.5 py-0 text-[10.5px] font-bold"
                  style={{
                    background: isActive ? 'rgba(10,10,12,0.12)' : 'var(--color-card)',
                    color: isActive ? '#0A0A0C' : 'var(--color-muted-foreground)',
                  }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-[10px] pl-10 text-[13.5px]"
          />
        </div>
      </motion.div>

      {/* Waiting queue alert */}
      {statusFilter === 'waiting_queue' && filteredTickets.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-[12px] border p-4"
          style={{
            background: 'rgba(220, 38, 38, 0.07)',
            borderColor: 'rgba(220, 38, 38, 0.28)',
          }}
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#DC2626' }} />
          <div>
            <p className="text-[13.5px] font-semibold" style={{ color: '#B91C1C' }}>
              Atenção · clientes aguardando seleção de fila
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Estes clientes receberam o menu de filas e ainda não selecionaram uma opção. Abra o
              chat e atribua manualmente.
            </p>
          </div>
        </div>
      )}

      {/* Tickets list */}
      <div className="space-y-2">
        {filteredTickets.map((ticket: any, index: number) => {
          const cfg = statusConfig[ticket.status] || { label: ticket.status, accent: 'var(--color-muted-foreground)' }
          const unread = hasUnreadMessage(ticket)
          return (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.35 }}
            >
              <div
                onClick={() => handleTicketClick(ticket)}
                className="group relative cursor-pointer rounded-[12px] border p-4 transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]"
                style={{
                  background: 'var(--color-card)',
                  borderColor: unread ? 'var(--color-bold-ink)' : 'var(--color-border)',
                  boxShadow: unread ? '0 0 0 1px rgba(220,255,0,0.3), 0 0 16px rgba(220,255,0,0.12)' : undefined,
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <Avatar fallback={ticket.contact?.name || 'T'} size="md" />
                    {unread && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2"
                        style={{ background: 'var(--color-bold-ink)', boxShadow: '0 0 0 2px var(--color-card)' }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[14px] font-semibold">{ticket.contact?.name || 'Sem nome'}</h3>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                        style={{
                          background: cfg.accent + '1a',
                          color: cfg.accent,
                        }}
                      >
                        <span
                          aria-hidden
                          className="h-1 w-1 rounded-full"
                          style={{ background: cfg.accent }}
                        />
                        {cfg.label}
                      </span>
                      {statusFilter === 'waiting_queue' && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{
                            background: 'rgba(220,38,38,0.08)',
                            borderColor: 'rgba(220,38,38,0.3)',
                            color: '#DC2626',
                          }}
                        >
                          <AlertCircle className="h-2.5 w-2.5" /> Sem fila
                        </span>
                      )}
                      {unread && (
                        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--color-foreground)' }}>
                          Nova mensagem
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-4 text-[11.5px] text-muted-foreground">
                      {ticket.contact?.phone && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="font-mono">{ticket.contact.phone}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {ticket.messages_count ?? ticket.messages?.length ?? 0} msgs
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(ticket.created_at)}
                      </span>
                    </div>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
                    style={{
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-muted-foreground)',
                    }}
                  >
                    {ticket.channel?.name || 'Direto'}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filteredTickets.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-16 text-center"
        >
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--color-secondary)' }}
          >
            <MessageSquare className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="eyebrow mb-2">INBOX VAZIA</p>
          <h3 className="font-display text-[26px] leading-[1.1] tracking-[-0.015em]">
            Nenhum ticket encontrado
          </h3>
          <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] text-muted-foreground">
            {searchQuery ? 'Tente ajustar sua busca.' :
             statusFilter === 'waiting_queue' ? 'Nenhum cliente aguardando seleção de fila.' :
             statusFilter === 'pending' ? 'Nenhuma conversa pendente. Tudo sob controle.' :
             statusFilter === 'open' ? 'Nenhum chat aberto no momento.' : 'Nenhum chat encerrado.'}
          </p>
        </motion.div>
      )}

      <LeadChatModal lead={selectedLead} open={isModalOpen} onOpenChange={handleModalClose} />
    </div>
  )
}
