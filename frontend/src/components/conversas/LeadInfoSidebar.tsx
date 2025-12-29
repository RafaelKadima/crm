import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  X,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  User,
  Tag,
  Calendar,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Edit,
  ListChecks,
} from 'lucide-react'
import { cn, formatCurrency, formatPhone } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { StageActivityChecklist } from '@/components/stage-activities/StageActivityChecklist'
import type { Lead } from '@/types'
import api from '@/api/axios'

interface LeadInfoSidebarProps {
  lead: Lead
  onClose: () => void
}

export function LeadInfoSidebar({ lead, onClose }: LeadInfoSidebarProps) {
  const [showActivities, setShowActivities] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    contact: true,
    lead: true,
    activities: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Busca atividades da etapa
  const { data: activities } = useQuery({
    queryKey: ['lead-activities', lead.id],
    queryFn: async () => {
      const response = await api.get(`/leads/${lead.id}/stage-activities`)
      return response.data
    },
    enabled: !!lead.id,
  })

  const contact = lead.contact
  const completedActivities = activities?.filter((a: any) => a.is_completed)?.length || 0
  const totalActivities = activities?.length || 0

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Informações do Lead</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact Info */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('contact')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Contato
            </span>
            {expandedSections.contact ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSections.contact && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4"
            >
              <div className="flex items-center gap-3 mb-4">
                <Avatar
                  src={contact?.profile_picture_url}
                  name={contact?.name || 'Lead'}
                  size="lg"
                />
                <div>
                  <h4 className="font-medium">{contact?.name || 'Sem nome'}</h4>
                  {contact?.email && (
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {contact?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatPhone(contact.phone)}</span>
                  </div>
                )}

                {contact?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.email}</span>
                  </div>
                )}

                {contact?.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{contact.address}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Lead Info */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('lead')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Lead
            </span>
            {expandedSections.lead ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSections.lead && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 space-y-3"
            >
              {/* Stage */}
              {lead.stage && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Etapa</span>
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${lead.stage.color}20`,
                      color: lead.stage.color,
                    }}
                  >
                    {lead.stage.name}
                  </span>
                </div>
              )}

              {/* Value */}
              {lead.value && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor
                  </span>
                  <span className="text-sm font-medium text-green-500">
                    {formatCurrency(lead.value)}
                  </span>
                </div>
              )}

              {/* Owner */}
              {lead.owner && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Responsável
                  </span>
                  <span className="text-sm">{lead.owner.name}</span>
                </div>
              )}

              {/* Created at */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Criado em
                </span>
                <span className="text-sm">{formatDate(lead.created_at)}</span>
              </div>

              {/* Expected close */}
              {lead.expected_close_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Previsão
                  </span>
                  <span className="text-sm">{formatDate(lead.expected_close_date)}</span>
                </div>
              )}

              {/* Notes */}
              {lead.notes && (
                <div className="pt-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    Observações
                  </span>
                  <p className="text-sm bg-muted/50 p-2 rounded">{lead.notes}</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Activities */}
        <div className="border-b">
          <button
            onClick={() => toggleSection('activities')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              Atividades
              {totalActivities > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({completedActivities}/{totalActivities})
                </span>
              )}
            </span>
            {expandedSections.activities ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {expandedSections.activities && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4"
            >
              {activities && activities.length > 0 ? (
                <StageActivityChecklist
                  leadId={lead.id}
                  stageId={lead.stage_id}
                  activities={activities}
                  compact
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade para esta etapa
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Customer Data (if exists) */}
        {lead.customer_data && Object.keys(lead.customer_data).length > 0 && (
          <div className="p-4">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Dados do Cliente
            </h4>
            <div className="space-y-2">
              {lead.customer_data.cpf && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CPF</span>
                  <span className="text-sm">{lead.customer_data.cpf}</span>
                </div>
              )}
              {lead.customer_data.birth_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nascimento</span>
                  <span className="text-sm">{lead.customer_data.birth_date}</span>
                </div>
              )}
              {lead.customer_data.cep && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">CEP</span>
                  <span className="text-sm">{lead.customer_data.cep}</span>
                </div>
              )}
              {lead.customer_data.linx_codigo_cliente && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Código Linx</span>
                  <span className="text-sm font-mono">{lead.customer_data.linx_codigo_cliente}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
