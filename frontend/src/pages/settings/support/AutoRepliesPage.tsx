import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Zap, Plus, Edit2, Trash2, Loader2, Power, PowerOff } from 'lucide-react'
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

interface AutoReply {
  id: string
  tenant_id: string
  channel_id: string | null
  queue_id: string | null
  name: string
  keywords: string[]
  match_type: 'exact' | 'contains' | 'regex'
  response_text: string | null
  response_media_url: string | null
  response_media_type: string | null
  priority: number
  is_active: boolean
  skip_ai_after_match: boolean
}

const MATCH_LABELS: Record<string, string> = {
  exact: 'Exato',
  contains: 'Contém',
  regex: 'Regex',
}

export function AutoRepliesPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<AutoReply | null>(null)
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery<{ data: AutoReply[] }>({
    queryKey: ['auto-replies'],
    queryFn: async () => (await api.get('/auto-replies')).data,
  })

  const handleToggle = async (rule: AutoReply) => {
    try {
      await api.put(`/auto-replies/${rule.id}`, { is_active: !rule.is_active })
      queryClient.invalidateQueries({ queryKey: ['auto-replies'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro.')
    }
  }

  const handleDelete = async (rule: AutoReply) => {
    if (!confirm(`Excluir auto-reply "${rule.name}"?`)) return
    try {
      await api.delete(`/auto-replies/${rule.id}`)
      toast.success('Auto-reply excluído.')
      queryClient.invalidateQueries({ queryKey: ['auto-replies'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao excluir.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            Auto-replies
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Respostas automáticas disparadas por keywords nas mensagens recebidas.
            Atalho determinístico antes da IA — útil pra perguntas frequentes
            (preço, horário, contato).
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova auto-reply
        </Button>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted/30" />
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-3">
              Nenhuma auto-reply criada.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Crie regras pra responder automaticamente palavras-chave.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {data.data
            .sort((a, b) => b.priority - a.priority)
            .map((rule) => (
              <Card key={rule.id} className={rule.is_active ? '' : 'opacity-60'}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium">{rule.name}</span>
                        {rule.is_active ? (
                          <Badge variant="success">Ativa</Badge>
                        ) : (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                        <Badge variant="outline">{MATCH_LABELS[rule.match_type]}</Badge>
                        <Badge variant="outline">Prioridade {rule.priority}</Badge>
                        {rule.skip_ai_after_match && (
                          <Badge variant="outline" title="Quando match, IA não é acionada">
                            Pula IA
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Palavras: {rule.keywords.slice(0, 5).map((k) => (
                          <span key={k} className="font-mono bg-muted px-1.5 py-0.5 rounded mr-1 text-xs">
                            {k}
                          </span>
                        ))}
                        {rule.keywords.length > 5 && (
                          <span className="text-xs">+{rule.keywords.length - 5}</span>
                        )}
                      </div>
                      {rule.response_text && (
                        <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2 line-clamp-2">
                          {rule.response_text}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleToggle(rule)} title={rule.is_active ? 'Desativar' : 'Ativar'}>
                        {rule.is_active ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(rule)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule)}
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
        <AutoReplyEditor
          rule={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['auto-replies'] })
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function AutoReplyEditor({
  rule,
  onClose,
  onSaved,
}: {
  rule: AutoReply | null
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = !rule
  const [name, setName] = useState(rule?.name ?? '')
  const [keywordsText, setKeywordsText] = useState((rule?.keywords ?? []).join(', '))
  const [matchType, setMatchType] = useState<'exact' | 'contains' | 'regex'>(rule?.match_type ?? 'contains')
  const [responseText, setResponseText] = useState(rule?.response_text ?? '')
  const [responseMediaUrl, setResponseMediaUrl] = useState(rule?.response_media_url ?? '')
  const [responseMediaType, setResponseMediaType] = useState<string>(rule?.response_media_type ?? 'image')
  const [priority, setPriority] = useState(rule?.priority ?? 0)
  const [isActive, setIsActive] = useState(rule?.is_active ?? true)
  const [skipAi, setSkipAi] = useState(rule?.skip_ai_after_match ?? true)
  const [saving, setSaving] = useState(false)

  const keywords = keywordsText
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter(Boolean)

  const submit = async () => {
    if (!name.trim()) return toast.error('Nome obrigatório.')
    if (keywords.length === 0) return toast.error('Informe ao menos uma keyword.')
    if (!responseText.trim() && !responseMediaUrl.trim()) {
      return toast.error('Informe response_text ou response_media_url.')
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        keywords,
        match_type: matchType,
        response_text: responseText.trim() || null,
        response_media_url: responseMediaUrl.trim() || null,
        response_media_type: responseMediaUrl.trim() ? responseMediaType : null,
        priority,
        is_active: isActive,
        skip_ai_after_match: skipAi,
      }
      if (isNew) {
        await api.post('/auto-replies', payload)
        toast.success('Auto-reply criada.')
      } else {
        await api.put(`/auto-replies/${rule.id}`, payload)
        toast.success('Auto-reply atualizada.')
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Nova auto-reply' : `Editar: ${rule.name}`}</DialogTitle>
          <DialogDescription>
            Configure quais keywords disparam a resposta automática e o que enviar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ar-name">Nome interno *</Label>
              <Input id="ar-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Resposta de preço" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de match</Label>
              <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contém (substring)</SelectItem>
                  <SelectItem value="exact">Exato</SelectItem>
                  <SelectItem value="regex">Regex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ar-kw">Keywords *</Label>
            <Textarea
              id="ar-kw"
              rows={2}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="preço, valor, quanto custa"
            />
            <p className="text-xs text-muted-foreground">
              Separe por vírgula ou nova linha. {keywords.length} keyword(s).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ar-text">Resposta (texto)</Label>
            <Textarea
              id="ar-text"
              rows={4}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Olá! Nossos preços estão em..."
              maxLength={4096}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ar-media">Mídia (URL opcional)</Label>
            <Input id="ar-media" type="url" value={responseMediaUrl} onChange={(e) => setResponseMediaUrl(e.target.value)} placeholder="https://..." />
            {responseMediaUrl && (
              <Select value={responseMediaType} onValueChange={setResponseMediaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ar-prio">Prioridade</Label>
              <Input id="ar-prio" type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Maior = avalia primeiro.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
              <Label className="text-sm">Ativa</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
              <Label className="text-sm" title="Quando dispara, não aciona IA">Pula IA</Label>
              <Switch checked={skipAi} onCheckedChange={setSkipAi} />
            </div>
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
