import { useState, useMemo } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, MessageSquare, MessageCircle, Phone, Mail } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface LeadsTableProps {
  leads: any[]
  stages: any[]
  onLeadClick: (lead: any) => void
}

type SortField = 'contact' | 'phone' | 'value' | 'created_at' | 'owner' | 'stage'
type SortDir = 'asc' | 'desc'

const channelIcons: Record<string, { icon: any; color: string }> = {
  whatsapp: { icon: MessageSquare, color: 'text-green-500' },
  instagram: { icon: MessageCircle, color: 'text-pink-500' },
  messenger: { icon: MessageCircle, color: 'text-blue-500' },
  telefone: { icon: Phone, color: 'text-muted-foreground' },
  email: { icon: Mail, color: 'text-blue-400' },
}

export function LeadsTable({ leads, stages, onLeadClick }: LeadsTableProps) {
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'contact':
          cmp = (a.contact?.name || '').localeCompare(b.contact?.name || '')
          break
        case 'phone':
          cmp = (a.contact?.phone || '').localeCompare(b.contact?.phone || '')
          break
        case 'value':
          cmp = (a.value || 0) - (b.value || 0)
          break
        case 'created_at':
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'owner':
          cmp = (a.owner?.name || '').localeCompare(b.owner?.name || '')
          break
        case 'stage': {
          const sA = stages.find((s: any) => s.id === a.stage_id)
          const sB = stages.find((s: any) => s.id === b.stage_id)
          cmp = (sA?.order || 0) - (sB?.order || 0)
          break
        }
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [leads, sortField, sortDir, stages])

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </TableHead>
  )

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    })
  }

  const getLeadStatus = (lead: any) => {
    const ticket = lead.tickets?.[0]
    if (!ticket) return { label: 'Pendente', variant: 'outline' as const, className: 'text-amber-500 border-amber-500/30' }
    if (ticket.status === 'closed') {
      if (lead.has_new_message) return { label: 'Pendente', variant: 'outline' as const, className: 'text-amber-500 border-amber-500/30' }
      return { label: 'Encerrado', variant: 'outline' as const, className: 'text-muted-foreground border-muted-foreground/30' }
    }
    return { label: 'Em Atendimento', variant: 'outline' as const, className: 'text-blue-500 border-blue-500/30' }
  }

  if (leads.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Nenhum lead encontrado
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHeader field="contact">Contato</SortHeader>
            <SortHeader field="phone">Telefone</SortHeader>
            <TableHead>Canal</TableHead>
            <TableHead>Titulo</TableHead>
            <SortHeader field="stage">Estagio</SortHeader>
            <SortHeader field="value">Valor</SortHeader>
            <SortHeader field="owner">Responsavel</SortHeader>
            <SortHeader field="created_at">Criado em</SortHeader>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLeads.map((lead: any) => {
            const stage = stages.find((s: any) => s.id === lead.stage_id)
            const hasUnread = (lead.unread_messages || 0) > 0 || lead.has_new_message
            const status = getLeadStatus(lead)
            const channelType = lead.channel?.type?.toLowerCase() || ''
            const channelInfo = channelIcons[channelType]
            const ChannelIcon = channelInfo?.icon || MessageSquare

            return (
              <TableRow
                key={lead.id}
                onClick={() => onLeadClick(lead)}
                className={cn(
                  "cursor-pointer transition-colors",
                  hasUnread && "bg-green-500/5 border-l-2 border-l-green-500"
                )}
              >
                {/* Contato */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                      {getInitials(lead.contact?.name || '?')}
                    </div>
                    <span className="font-medium text-sm truncate max-w-[160px]">
                      {lead.contact?.name || 'Sem nome'}
                    </span>
                    {hasUnread && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 text-white text-[10px] font-bold px-1 shrink-0">
                        {lead.unread_messages > 9 ? '9+' : lead.unread_messages || '!'}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Telefone */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatPhone(lead.contact?.phone || '')}
                </TableCell>

                {/* Canal */}
                <TableCell>
                  <ChannelIcon className={cn("h-4 w-4", channelInfo?.color || 'text-muted-foreground')} />
                </TableCell>

                {/* Titulo */}
                <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                  {lead.title || '-'}
                </TableCell>

                {/* Estagio */}
                <TableCell>
                  {stage ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm">{stage.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Valor */}
                <TableCell>
                  {lead.value ? (
                    <span className="text-sm font-medium text-green-500">{formatCurrency(lead.value)}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Responsavel */}
                <TableCell>
                  {lead.owner?.name ? (
                    <Badge variant="outline" className="text-xs">
                      {lead.owner.name}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>

                {/* Criado em */}
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(lead.created_at)}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={status.variant} className={cn("text-xs", status.className)}>
                    {status.label}
                  </Badge>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
