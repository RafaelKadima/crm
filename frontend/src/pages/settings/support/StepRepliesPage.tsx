import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Workflow, Plus, Edit2, Trash2, Loader2, Power, PowerOff,
  GripVertical, MessageSquare, Hand, GitBranch, Filter, UserCheck, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/api/axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

// ─── Types ────────────────────────────────────────────────────────────

type StepType = 'send_message' | 'wait_input' | 'condition' | 'branch' | 'handoff_human' | 'end'

interface Step {
  id?: string
  order: number
  type: StepType
  config: Record<string, any>
}

interface StepReply {
  id: string
  tenant_id: string
  channel_id: string | null
  queue_id: string | null
  name: string
  description: string | null
  trigger_type: 'keyword' | 'manual' | 'auto_on_open'
  trigger_config: Record<string, any> | null
  is_active: boolean
  priority: number
  steps?: Step[]
}

const STEP_LABELS: Record<StepType, string> = {
  send_message: 'Enviar mensagem',
  wait_input: 'Aguardar resposta',
  condition: 'Condição',
  branch: 'Menu de opções',
  handoff_human: 'Transferir pra humano',
  end: 'Encerrar',
}

const STEP_ICONS: Record<StepType, typeof MessageSquare> = {
  send_message: MessageSquare,
  wait_input: Hand,
  condition: Filter,
  branch: GitBranch,
  handoff_human: UserCheck,
  end: CheckCircle2,
}

// ─── List page ────────────────────────────────────────────────────────

export function StepRepliesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<StepReply | null>(null)
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery<{ data: (StepReply & { steps_count?: number })[] }>({
    queryKey: ['step-replies'],
    queryFn: async () => (await api.get('/step-replies')).data,
  })

  const handleToggle = async (flow: StepReply) => {
    try {
      await api.put(`/step-replies/${flow.id}`, { is_active: !flow.is_active })
      queryClient.invalidateQueries({ queryKey: ['step-replies'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro.')
    }
  }

  const handleDelete = async (flow: StepReply) => {
    if (!confirm(`Excluir fluxo "${flow.name}"?`)) return
    try {
      await api.delete(`/step-replies/${flow.id}`)
      toast.success('Fluxo excluído.')
      queryClient.invalidateQueries({ queryKey: ['step-replies'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao excluir.')
    }
  }

  const handleEdit = async (flow: StepReply) => {
    // Fetch full flow com steps[]
    try {
      const res = await api.get(`/step-replies/${flow.id}`)
      setEditing(res.data.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao carregar.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Workflow className="h-5 w-5 text-muted-foreground" />
            Fluxos guiados
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Workflows multi-passo determinísticos. Útil pra qualificação inicial,
            menu de opções, FAQ árvore e agendamento. Atalho mais sofisticado que
            auto-replies, sem precisar de IA.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo fluxo
        </Button>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted/30" />
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <Workflow className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-3">Nenhum fluxo criado.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {data.data
            .sort((a, b) => b.priority - a.priority)
            .map((flow) => (
              <Card key={flow.id} className={flow.is_active ? '' : 'opacity-60'}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium">{flow.name}</span>
                        {flow.is_active ? (
                          <Badge variant="success">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                        <Badge variant="outline">Trigger: {flow.trigger_type}</Badge>
                        <Badge variant="outline">{flow.steps_count ?? 0} step(s)</Badge>
                        <Badge variant="outline">P {flow.priority}</Badge>
                      </div>
                      {flow.description && (
                        <p className="text-xs text-muted-foreground">{flow.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(flow)}>
                        {flow.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(flow)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(flow)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </ul>
      )}

      {(editing || creating) && (
        <FlowEditorDialog
          flow={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['step-replies'] })
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Editor (list-based — drag-drop fica pra Phase 2) ────────────────

function FlowEditorDialog({
  flow,
  onClose,
  onSaved,
}: {
  flow: StepReply | null
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = !flow
  const [name, setName] = useState(flow?.name ?? '')
  const [description, setDescription] = useState(flow?.description ?? '')
  const [triggerType, setTriggerType] = useState<'keyword' | 'manual' | 'auto_on_open'>(
    flow?.trigger_type ?? 'keyword',
  )
  const [keywords, setKeywords] = useState((flow?.trigger_config?.keywords ?? []).join(', '))
  const [matchType, setMatchType] = useState<'contains' | 'exact'>(
    flow?.trigger_config?.match_type ?? 'contains',
  )
  const [priority, setPriority] = useState(flow?.priority ?? 0)
  const [isActive, setIsActive] = useState(flow?.is_active ?? true)
  const [steps, setSteps] = useState<Step[]>(
    (flow?.steps ?? []).map((s) => ({ ...s, config: s.config ?? {} })),
  )
  const [saving, setSaving] = useState(false)

  const addStep = (type: StepType) => {
    setSteps((prev) => [
      ...prev,
      {
        order: prev.length + 1,
        type,
        config: defaultConfigFor(type),
      },
    ])
  }

  const updateStep = (idx: number, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const removeStep = (idx: number) => {
    setSteps((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    )
  }

  const moveStep = (idx: number, delta: number) => {
    const target = idx + delta
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    const [moved] = next.splice(idx, 1)
    next.splice(target, 0, moved)
    setSteps(next.map((s, i) => ({ ...s, order: i + 1 })))
  }

  const submit = async () => {
    if (!name.trim()) return toast.error('Nome obrigatório.')
    if (steps.length === 0) return toast.error('Adicione ao menos um step.')
    if (triggerType === 'keyword' && !keywords.trim()) {
      return toast.error('Keywords são obrigatórias quando trigger é "keyword".')
    }

    setSaving(true)
    try {
      const triggerConfig =
        triggerType === 'keyword'
          ? {
              keywords: keywords.split(/[,\n]/).map((k: string) => k.trim()).filter(Boolean),
              match_type: matchType,
            }
          : null

      const payload = {
        name: name.trim(),
        description: description?.trim() || null,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        priority,
        is_active: isActive,
        steps: steps.map((s, i) => ({
          order: i + 1,
          type: s.type,
          config: s.config,
        })),
      }

      if (isNew) {
        await api.post('/step-replies', payload)
        toast.success('Fluxo criado.')
      } else {
        await api.put(`/step-replies/${flow.id}`, payload)
        toast.success('Fluxo atualizado.')
      }
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Novo fluxo guiado' : `Editar: ${flow.name}`}</DialogTitle>
          <DialogDescription>
            Configure trigger e os passos. Cada passo executa em sequência;
            condições e menus podem fazer jump pra outros passos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Metadata */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="flow-name">Nome *</Label>
              <Input id="flow-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Qualificação inicial" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flow-prio">Prioridade</Label>
              <Input id="flow-prio" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flow-desc">Descrição</Label>
            <Textarea id="flow-desc" rows={2} value={description ?? ''} onChange={(e) => setDescription(e.target.value)} placeholder="Quando esse fluxo é usado..." />
          </div>

          {/* Trigger */}
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-medium">Trigger</h4>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Keyword (palavras-chave)</SelectItem>
                <SelectItem value="manual">Manual (atendente inicia)</SelectItem>
                <SelectItem value="auto_on_open">Auto ao abrir ticket</SelectItem>
              </SelectContent>
            </Select>

            {triggerType === 'keyword' && (
              <>
                <div className="space-y-1.5">
                  <Label>Keywords</Label>
                  <Textarea rows={2} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="oi, menu, ajuda" />
                </div>
                <div className="space-y-1.5">
                  <Label>Match</Label>
                  <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contém</SelectItem>
                      <SelectItem value="exact">Exato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Passos ({steps.length})</h4>
              <div className="flex gap-1">
                {(['send_message', 'wait_input', 'condition', 'branch', 'handoff_human', 'end'] as StepType[]).map((t) => {
                  const Icon = STEP_ICONS[t]
                  return (
                    <Button key={t} variant="outline" size="sm" onClick={() => addStep(t)} title={STEP_LABELS[t]}>
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  )
                })}
              </div>
            </div>

            {steps.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed bg-muted/30 px-6 py-8 text-center text-sm text-muted-foreground">
                Sem passos. Adicione usando os botões acima.
              </div>
            ) : (
              <ul className="space-y-2">
                {steps.map((step, idx) => (
                  <StepCard
                    key={idx}
                    step={step}
                    idx={idx}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < steps.length - 1}
                    onUpdate={(patch) => updateStep(idx, patch)}
                    onRemove={() => removeStep(idx)}
                    onMoveUp={() => moveStep(idx, -1)}
                    onMoveDown={() => moveStep(idx, 1)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
            <Label className="text-sm">Fluxo ativo</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isNew ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Step card (config inline por type) ──────────────────────────────

function StepCard({
  step, idx, canMoveUp, canMoveDown, onUpdate, onRemove, onMoveUp, onMoveDown,
}: {
  step: Step
  idx: number
  canMoveUp: boolean
  canMoveDown: boolean
  onUpdate: (patch: Partial<Step>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const Icon = STEP_ICONS[step.type]
  return (
    <li className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{idx + 1}.</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{STEP_LABELS[step.type]}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={!canMoveUp} title="Mover pra cima">
            ↑
          </Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={!canMoveDown} title="Mover pra baixo">
            ↓
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <StepConfigEditor step={step} onUpdate={onUpdate} />
    </li>
  )
}

function StepConfigEditor({ step, onUpdate }: { step: Step; onUpdate: (patch: Partial<Step>) => void }) {
  const setConfig = (patch: Record<string, any>) => onUpdate({ config: { ...step.config, ...patch } })

  switch (step.type) {
    case 'send_message':
      return (
        <Textarea
          rows={2}
          value={step.config.text ?? ''}
          onChange={(e) => setConfig({ text: e.target.value })}
          placeholder="Texto da mensagem (use {{variavel}} pra interpolar context)"
        />
      )

    case 'wait_input':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            type="number"
            value={step.config.timeout_seconds ?? 600}
            onChange={(e) => setConfig({ timeout_seconds: Number(e.target.value) })}
            placeholder="Timeout (segundos)"
          />
          <Input
            value={step.config.save_to_field ?? ''}
            onChange={(e) => setConfig({ save_to_field: e.target.value })}
            placeholder="Salvar em context.X"
          />
        </div>
      )

    case 'condition':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input value={step.config.field ?? ''} onChange={(e) => setConfig({ field: e.target.value })} placeholder="context.field" />
          <Select value={step.config.operator ?? 'equals'} onValueChange={(v) => setConfig({ operator: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">=</SelectItem>
              <SelectItem value="contains">contém</SelectItem>
              <SelectItem value="gt">&gt;</SelectItem>
              <SelectItem value="lt">&lt;</SelectItem>
              <SelectItem value="empty">vazio</SelectItem>
              <SelectItem value="not_empty">não vazio</SelectItem>
            </SelectContent>
          </Select>
          <Input value={step.config.value ?? ''} onChange={(e) => setConfig({ value: e.target.value })} placeholder="valor" />
          <Input
            type="number"
            value={step.config.true_step_order ?? ''}
            onChange={(e) => setConfig({ true_step_order: Number(e.target.value) })}
            placeholder="Se verdadeiro: ir pro step #"
          />
          <Input
            type="number"
            value={step.config.false_step_order ?? ''}
            onChange={(e) => setConfig({ false_step_order: Number(e.target.value) })}
            placeholder="Se falso: ir pro step #"
          />
        </div>
      )

    case 'branch':
      return <BranchEditor step={step} onUpdate={onUpdate} />

    case 'handoff_human':
      return (
        <Textarea
          rows={2}
          value={step.config.message ?? ''}
          onChange={(e) => setConfig({ message: e.target.value })}
          placeholder="Mensagem opcional antes de transferir (ex: 'Vou te conectar com um atendente')"
        />
      )

    case 'end':
      return (
        <Textarea
          rows={2}
          value={step.config.message ?? ''}
          onChange={(e) => setConfig({ message: e.target.value })}
          placeholder="Mensagem de encerramento opcional"
        />
      )
  }
}

function BranchEditor({ step, onUpdate }: { step: Step; onUpdate: (patch: Partial<Step>) => void }) {
  const options = (step.config.options ?? []) as Array<{ label: string; value: string; target_step_order: number }>

  const addOpt = () => {
    onUpdate({
      config: {
        ...step.config,
        options: [...options, { label: '', value: String(options.length + 1), target_step_order: 0 }],
      },
    })
  }

  const updateOpt = (idx: number, patch: Partial<typeof options[0]>) => {
    onUpdate({
      config: {
        ...step.config,
        options: options.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
      },
    })
  }

  const removeOpt = (idx: number) => {
    onUpdate({
      config: {
        ...step.config,
        options: options.filter((_, i) => i !== idx),
      },
    })
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={step.config.prompt ?? ''}
        onChange={(e) => onUpdate({ config: { ...step.config, prompt: e.target.value } })}
        placeholder="Pergunta do menu (ex: 'Em que posso ajudar?')"
      />
      <div className="space-y-1.5">
        {options.map((opt, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <Input value={opt.value} onChange={(e) => updateOpt(idx, { value: e.target.value })} placeholder="1" className="w-16" />
            <Input value={opt.label} onChange={(e) => updateOpt(idx, { label: e.target.value })} placeholder="Falar com vendas" className="flex-1" />
            <Input
              type="number"
              value={opt.target_step_order}
              onChange={(e) => updateOpt(idx, { target_step_order: Number(e.target.value) })}
              placeholder="step #"
              className="w-24"
            />
            <Button variant="ghost" size="icon" onClick={() => removeOpt(idx)} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addOpt}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar opção
        </Button>
      </div>
    </div>
  )
}

function defaultConfigFor(type: StepType): Record<string, any> {
  switch (type) {
    case 'send_message':
      return { text: '' }
    case 'wait_input':
      return { timeout_seconds: 600, save_to_field: '' }
    case 'condition':
      return { field: '', operator: 'equals', value: '' }
    case 'branch':
      return { prompt: '', options: [] }
    case 'handoff_human':
      return { message: '' }
    case 'end':
      return { message: '' }
  }
}
