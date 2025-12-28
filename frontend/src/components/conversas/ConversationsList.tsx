import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, MessageSquare, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConversasFilters } from '@/store/conversasStore'
import { ConversationItem } from './ConversationItem'
import type { Lead } from '@/types'

interface ConversationsListProps {
  leads: Lead[]
  isLoading: boolean
  activeLeadId: string | null
  onSelectLead: (lead: Lead) => void
}

const filterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'mine', label: 'Meus' },
  { value: 'unread', label: 'Não lidas' },
] as const

export function ConversationsList({
  leads,
  isLoading,
  activeLeadId,
  onSelectLead,
}: ConversationsListProps) {
  const { filter, searchQuery, setFilter, setSearchQuery } = useConversasFilters()

  // Filtra leads com base nos filtros
  const filteredLeads = leads.filter((lead) => {
    // Busca textual
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const name = lead.contact?.name?.toLowerCase() || ''
      const phone = lead.contact?.phone?.toLowerCase() || ''
      const email = lead.contact?.email?.toLowerCase() || ''
      if (!name.includes(query) && !phone.includes(query) && !email.includes(query)) {
        return false
      }
    }

    // Filtros
    switch (filter) {
      case 'pending':
        return lead.tickets?.some((t) => t.status === 'pending')
      case 'mine':
        // Implementar quando tiver owner_id
        return true
      case 'unread':
        return (lead.unread_messages || 0) > 0
      default:
        return true
    }
  })

  // Ordena por última mensagem
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return dateB - dateA
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Conversas</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-4 py-2 rounded-lg",
              "bg-muted/50 border border-transparent",
              "focus:border-primary focus:outline-none",
              "placeholder:text-muted-foreground text-sm"
            )}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-2 border-b bg-muted/20">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
              filter === option.value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {sortedLeads.map((lead) => (
              <ConversationItem
                key={lead.id}
                lead={lead}
                isActive={activeLeadId === lead.id}
                onClick={() => onSelectLead(lead)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
