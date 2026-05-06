import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  ChevronLeft,
  Users,
  FileText,
  Settings,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useChannels } from '@/hooks/useChannels'
import { usePipelines } from '@/hooks/usePipelines'
import { useUsers } from '@/hooks/useUsers'
import { useCreateBroadcast, useBroadcastPreview } from '@/hooks/useBroadcasts'
import { whatsAppTemplatesApi } from '@/api/endpoints'
import type { WhatsAppTemplate, Channel, PipelineStage } from '@/types'

interface CreateBroadcastModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const VARIABLE_FIELDS = [
  { value: 'contact.name', label: 'Nome do contato' },
  { value: 'contact.phone', label: 'Telefone' },
  { value: 'contact.email', label: 'E-mail' },
]

const steps = [
  { icon: FileText, label: 'Campanha' },
  { icon: Users, label: 'Destinatários' },
  { icon: Settings, label: 'Variáveis' },
]

export function CreateBroadcastModal({ open, onOpenChange }: CreateBroadcastModalProps) {
  const [step, setStep] = useState(0)

  // Step 1 — Campaign
  const [name, setName] = useState('')
  const [channelId, setChannelId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [approvedTemplates, setApprovedTemplates] = useState<WhatsAppTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Step 2 — Recipients
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())

  // Step 3 — Variables
  const [variableMappings, setVariableMappings] = useState<Array<{ index: number; field: string }>>([])

  // Data
  const { data: channelsData } = useChannels()
  const { data: pipelinesData } = usePipelines()
  const { data: usersData } = useUsers()
  const createMutation = useCreateBroadcast()
  const previewMutation = useBroadcastPreview()

  // Filter WhatsApp channels
  const whatsappChannels = useMemo(() => {
    const channels = channelsData?.data || channelsData || []
    return (Array.isArray(channels) ? channels : []).filter(
      (c: Channel) => c.type === 'whatsapp'
    )
  }, [channelsData])

  // Pipelines and stages
  const pipelines = useMemo(() => {
    const data = pipelinesData?.data || pipelinesData || []
    return Array.isArray(data) ? data : []
  }, [pipelinesData])

  const selectedPipeline = pipelines.find((p: any) => p.id === filters.pipeline_id)
  const stages: PipelineStage[] = selectedPipeline?.stages || []

  const users = useMemo(() => {
    const data = usersData?.data || usersData || []
    return Array.isArray(data) ? data : []
  }, [usersData])

  // Selected template
  const selectedTemplate = approvedTemplates.find((t) => t.id === templateId)

  // Count template variables
  const variableCount = useMemo(() => {
    if (!selectedTemplate?.body_text) return 0
    const matches = selectedTemplate.body_text.match(/\{\{\d+\}\}/g)
    return matches ? new Set(matches).size : 0
  }, [selectedTemplate])

  // Load approved templates when channel changes
  useEffect(() => {
    if (!channelId) {
      setApprovedTemplates([])
      setTemplateId('')
      return
    }

    setLoadingTemplates(true)
    whatsAppTemplatesApi.getApproved(channelId)
      .then((res) => {
        setApprovedTemplates(res.data.data || [])
        setTemplateId('')
      })
      .catch(() => {
        setApprovedTemplates([])
        toast.error('Erro ao carregar templates')
      })
      .finally(() => setLoadingTemplates(false))
  }, [channelId])

  // Initialize variable mappings when template changes
  useEffect(() => {
    if (variableCount > 0) {
      setVariableMappings(
        Array.from({ length: variableCount }, (_, i) => ({
          index: i,
          field: 'contact.name',
        }))
      )
    } else {
      setVariableMappings([])
    }
  }, [variableCount])

  // Preview recipients
  const handlePreview = () => {
    previewMutation.mutate(filters, {
      onSuccess: (data) => {
        // Select all by default
        const allIds = new Set((data?.data?.contacts || []).map((c: any) => c.id))
        setSelectedContactIds(allIds)
      },
    })
  }

  // Contact list from preview
  const previewContacts: Array<{ id: string; name: string; phone: string }> = previewMutation.data?.data?.contacts || []

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedContactIds.size === previewContacts.length) {
      setSelectedContactIds(new Set())
    } else {
      setSelectedContactIds(new Set(previewContacts.map((c) => c.id)))
    }
  }

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(0)
      setName('')
      setChannelId('')
      setTemplateId('')
      setFilters({})
      setSelectedContactIds(new Set())
      setVariableMappings([])
    }
  }, [open])

  // Submit
  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({
        name,
        channel_id: channelId,
        whatsapp_template_id: templateId,
        filters,
        contact_ids: Array.from(selectedContactIds),
        template_variables: variableMappings,
      })
      toast.success('Broadcast criado com sucesso!')
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao criar broadcast')
    }
  }

  // Validation per step
  const canAdvance = (s: number) => {
    if (s === 0) return !!name.trim() && !!channelId && !!templateId
    if (s === 1) return selectedContactIds.size > 0
    return true
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Novo Broadcast</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 pb-4 border-b border-border">
          {steps.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
                <button
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-foreground/10 text-foreground font-medium'
                      : isDone
                        ? 'text-foreground/70 hover:text-foreground cursor-pointer'
                        : 'text-muted-foreground/50 cursor-not-allowed'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              </div>
            )
          })}
        </div>

        <DialogBody className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepContent key="step0">
                <div className="space-y-5">
                  <div>
                    <Label>Nome da campanha</Label>
                    <Input
                      placeholder="Ex: Promoção de Natal 2026"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label>Canal WhatsApp</Label>
                    <select
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      className="mt-1.5 w-full h-10 px-3 rounded-md border bg-input text-foreground text-sm"
                    >
                      <option value="">Selecione um canal</option>
                      {whatsappChannels.map((ch: Channel) => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Template HSM</Label>
                    {loadingTemplates ? (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando templates...
                      </div>
                    ) : (
                      <select
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        disabled={!channelId || approvedTemplates.length === 0}
                        className="mt-1.5 w-full h-10 px-3 rounded-md border bg-input text-foreground text-sm disabled:opacity-50"
                      >
                        <option value="">
                          {!channelId
                            ? 'Selecione um canal primeiro'
                            : approvedTemplates.length === 0
                              ? 'Nenhum template aprovado'
                              : 'Selecione um template'}
                        </option>
                        {approvedTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Template preview */}
                  {selectedTemplate && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Preview do template</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedTemplate.body_text}
                      </p>
                      {selectedTemplate.footer_text && (
                        <p className="text-xs text-muted-foreground mt-2">{selectedTemplate.footer_text}</p>
                      )}
                    </div>
                  )}
                </div>
              </StepContent>
            )}

            {step === 1 && (
              <StepContent key="step1">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Filtre e selecione os contatos que vão receber o broadcast.
                  </p>

                  {/* Filters */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Pipeline</Label>
                      <select
                        value={filters.pipeline_id || ''}
                        onChange={(e) => setFilters({ ...filters, pipeline_id: e.target.value, stage_id: '' })}
                        className="mt-1.5 w-full h-10 px-3 rounded-md border bg-input text-foreground text-sm"
                      >
                        <option value="">Todos</option>
                        {pipelines.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Etapa</Label>
                      <select
                        value={filters.stage_id || ''}
                        onChange={(e) => setFilters({ ...filters, stage_id: e.target.value })}
                        disabled={!filters.pipeline_id}
                        className="mt-1.5 w-full h-10 px-3 rounded-md border bg-input text-foreground text-sm disabled:opacity-50"
                      >
                        <option value="">Todas</option>
                        {stages.map((s: PipelineStage) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Responsável</Label>
                      <select
                        value={filters.owner_id || ''}
                        onChange={(e) => setFilters({ ...filters, owner_id: e.target.value })}
                        className="mt-1.5 w-full h-10 px-3 rounded-md border bg-input text-foreground text-sm"
                      >
                        <option value="">Todos</option>
                        {users.map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    Buscar destinatários
                  </Button>

                  {/* Contact list with checkboxes */}
                  {previewContacts.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      {/* Header with select all */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/30 border-b">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.size === previewContacts.length && previewContacts.length > 0}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-border accent-success cursor-pointer"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {selectedContactIds.size} de {previewContacts.length} selecionados
                        </span>
                      </div>

                      {/* Contact list */}
                      <div className="max-h-52 overflow-y-auto divide-y divide-border">
                        {previewContacts.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedContactIds.has(c.id)}
                              onChange={() => toggleContact(c.id)}
                              className="h-4 w-4 rounded border-border accent-success cursor-pointer"
                            />
                            <span className="text-sm text-foreground flex-1 truncate">
                              {c.name || 'Sem nome'}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {c.phone}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewMutation.isSuccess && previewContacts.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-warning p-4 bg-muted/30 rounded-lg border">
                      <AlertCircle className="h-4 w-4" />
                      Nenhum contato com telefone encontrado para esses filtros.
                    </div>
                  )}
                </div>
              </StepContent>
            )}

            {step === 2 && (
              <StepContent key="step2">
                <div className="space-y-5">
                  {variableCount === 0 ? (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <p className="text-sm text-muted-foreground">
                        Este template não possui variáveis. As mensagens serão enviadas com o texto fixo.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Configure o valor de cada variável do template.
                      </p>

                      {variableMappings.map((mapping, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <span className="text-sm font-mono text-muted-foreground min-w-[60px]">
                            {`{{${mapping.index}}}`}
                          </span>
                          <select
                            value={mapping.field.startsWith('custom:') ? 'custom' : mapping.field}
                            onChange={(e) => {
                              const newMappings = [...variableMappings]
                              newMappings[i] = {
                                ...newMappings[i],
                                field: e.target.value === 'custom' ? 'custom:' : e.target.value,
                              }
                              setVariableMappings(newMappings)
                            }}
                            className="flex-1 h-10 px-3 rounded-md border bg-input text-foreground text-sm"
                          >
                            {VARIABLE_FIELDS.map((f) => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                            <option value="custom">Texto fixo</option>
                          </select>

                          {mapping.field.startsWith('custom:') && (
                            <Input
                              placeholder="Texto fixo..."
                              value={mapping.field.substring(7)}
                              onChange={(e) => {
                                const newMappings = [...variableMappings]
                                newMappings[i] = { ...newMappings[i], field: `custom:${e.target.value}` }
                                setVariableMappings(newMappings)
                              }}
                              className="flex-1"
                            />
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Final preview */}
                  {selectedTemplate && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <p className="text-xs text-muted-foreground mb-1">Preview final</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {renderTemplatePreview(selectedTemplate.body_text, variableMappings)}
                      </p>
                    </div>
                  )}
                </div>
              </StepContent>
            )}
          </AnimatePresence>
        </DialogBody>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step > 0 ? 'Voltar' : 'Cancelar'}
            </Button>

            {step < 2 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance(step)}
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Criar Broadcast
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StepContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )
}

function renderTemplatePreview(body: string, mappings: Array<{ index: number; field: string }>): string {
  let result = body
  for (const m of mappings) {
    const displayValue = m.field.startsWith('custom:')
      ? m.field.substring(7) || '...'
      : `[${VARIABLE_FIELDS.find((f) => f.value === m.field)?.label || m.field}]`
    result = result.replace(`{{${m.index}}}`, displayValue)
  }
  return result
}

const VARIABLE_FIELDS_MAP = VARIABLE_FIELDS
