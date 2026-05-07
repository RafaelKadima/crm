import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/api/axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

interface Channel {
  id: string
  name: string
  type: string
  is_active: boolean
  external_ai_config: ExternalAiConfig | null
}

type Provider = 'none' | 'dialogflow' | 'dify'

interface ExternalAiConfig {
  provider: Provider
  trigger?: 'manual' | 'keyword' | 'auto_after_minutes'
  trigger_keywords?: string[]
  trigger_minutes?: number
  // Dialogflow
  project_id?: string
  location?: string
  agent_id?: string
  language_code?: string
  service_account_token?: string
  // Dify
  api_key?: string
  endpoint?: string
}

export function ExternalAIPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: channelsRes, isLoading } = useQuery<Channel[] | { data: Channel[] }>({
    queryKey: ['channels'],
    queryFn: async () => (await api.get('/channels')).data,
  })

  const channels = Array.isArray(channelsRes) ? channelsRes : channelsRes?.data ?? []
  const whatsappChannels = channels.filter((c) => c.type === 'whatsapp')
  const selected = whatsappChannels.find((c) => c.id === selectedId) ?? whatsappChannels[0]

  useEffect(() => {
    if (!selectedId && whatsappChannels[0]) setSelectedId(whatsappChannels[0].id)
  }, [whatsappChannels, selectedId])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" />
          IA externa (Dialogflow / Dify)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Encaminha mensagens recebidas pra um agente externo (Google
          Dialogflow CX ou Dify) por canal. Útil pra reaproveitar bots já
          treinados em outras plataformas. O hand-off pra humano é detectado
          automaticamente quando a IA não responde ou retorna marcador.
        </p>
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted/30" />
      ) : whatsappChannels.length === 0 ? (
        <Card>
          <CardContent className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Conecte ao menos um canal WhatsApp antes de configurar IA externa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="text-sm">Canal:</Label>
            <Select value={selected?.id ?? ''} onValueChange={setSelectedId}>
              <SelectTrigger className="max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {whatsappChannels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && !selected.is_active && (
              <Badge variant="secondary">Inativo</Badge>
            )}
          </div>

          {selected && (
            <ChannelExternalAiForm
              channel={selected}
              onSaved={() => queryClient.invalidateQueries({ queryKey: ['channels'] })}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Form por canal ──────────────────────────────────────────────────

function ChannelExternalAiForm({ channel, onSaved }: { channel: Channel; onSaved: () => void }) {
  const initial = channel.external_ai_config ?? { provider: 'none' as Provider }
  const [config, setConfig] = useState<ExternalAiConfig>(initial)
  const [saving, setSaving] = useState(false)

  // Reseta quando troca de canal
  useEffect(() => {
    setConfig(channel.external_ai_config ?? { provider: 'none' })
  }, [channel.id, channel.external_ai_config])

  const set = (patch: Partial<ExternalAiConfig>) => setConfig((p) => ({ ...p, ...patch }))

  const submit = async () => {
    setSaving(true)
    try {
      await api.put(`/channels/${channel.id}`, {
        external_ai_config: config.provider === 'none' ? null : config,
      })
      toast.success('Configuração salva.')
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{channel.name}</CardTitle>
        <CardDescription>
          Quando ativada, mensagens entrantes neste canal são encaminhadas
          pro provider externo antes do agente interno responder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Provider</Label>
          <Select value={config.provider} onValueChange={(v) => set({ provider: v as Provider })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Desativado</SelectItem>
              <SelectItem value="dialogflow">Google Dialogflow CX</SelectItem>
              <SelectItem value="dify">Dify</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {config.provider !== 'none' && (
          <>
            <div className="space-y-1.5">
              <Label>Trigger (quando acionar)</Label>
              <Select
                value={config.trigger ?? 'manual'}
                onValueChange={(v) => set({ trigger: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (atendente inicia)</SelectItem>
                  <SelectItem value="keyword">Keyword (palavra-chave)</SelectItem>
                  <SelectItem value="auto_after_minutes">Auto após X minutos sem resposta humana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.trigger === 'keyword' && (
              <div className="space-y-1.5">
                <Label>Keywords</Label>
                <Textarea
                  rows={2}
                  value={(config.trigger_keywords ?? []).join(', ')}
                  onChange={(e) =>
                    set({
                      trigger_keywords: e.target.value
                        .split(/[,\n]/)
                        .map((k: string) => k.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="ajuda, suporte, dúvida"
                />
              </div>
            )}

            {config.trigger === 'auto_after_minutes' && (
              <div className="space-y-1.5">
                <Label>Minutos sem resposta humana</Label>
                <Input
                  type="number"
                  value={config.trigger_minutes ?? 5}
                  onChange={(e) => set({ trigger_minutes: Number(e.target.value) })}
                />
              </div>
            )}

            {config.provider === 'dialogflow' && (
              <DialogflowFields config={config} set={set} />
            )}

            {config.provider === 'dify' && (
              <DifyFields config={config} set={set} />
            )}

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>
                Se o adapter detectar que a IA não soube responder (intent
                "handoff/human" no Dialogflow OU marcador "[handoff]" no Dify),
                o flag de handoff é desligado automaticamente — atendente humano
                assume na próxima mensagem.
              </span>
            </div>
          </>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Provider-specific fields ────────────────────────────────────────

function DialogflowFields({
  config, set,
}: { config: ExternalAiConfig; set: (patch: Partial<ExternalAiConfig>) => void }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 px-4 py-3">
      <h4 className="text-sm font-medium">Dialogflow CX (v3)</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Project ID *</Label>
          <Input value={config.project_id ?? ''} onChange={(e) => set({ project_id: e.target.value })} placeholder="my-project-12345" />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input value={config.location ?? 'global'} onChange={(e) => set({ location: e.target.value })} placeholder="global" />
        </div>
        <div className="space-y-1.5">
          <Label>Agent ID *</Label>
          <Input value={config.agent_id ?? ''} onChange={(e) => set({ agent_id: e.target.value })} placeholder="uuid do agente" />
        </div>
        <div className="space-y-1.5">
          <Label>Language code</Label>
          <Input value={config.language_code ?? 'pt-BR'} onChange={(e) => set({ language_code: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Service account token (OAuth bearer) *</Label>
        <Textarea
          rows={2}
          value={config.service_account_token ?? ''}
          onChange={(e) => set({ service_account_token: e.target.value })}
          placeholder="ya29.a0..."
        />
        <p className="text-xs text-muted-foreground">
          Token expira em 1h. Refresh automático fica pra sprint futura — em
          produção, configure refresh próprio até lá.
        </p>
      </div>
    </div>
  )
}

function DifyFields({
  config, set,
}: { config: ExternalAiConfig; set: (patch: Partial<ExternalAiConfig>) => void }) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 px-4 py-3">
      <h4 className="text-sm font-medium">Dify</h4>
      <div className="space-y-1.5">
        <Label>API Key *</Label>
        <Input
          type="password"
          value={config.api_key ?? ''}
          onChange={(e) => set({ api_key: e.target.value })}
          placeholder="app-xxxxx"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Endpoint</Label>
        <Input
          value={config.endpoint ?? 'https://api.dify.ai/v1'}
          onChange={(e) => set({ endpoint: e.target.value })}
          placeholder="https://api.dify.ai/v1"
        />
        <p className="text-xs text-muted-foreground">
          Use endpoint próprio se Dify estiver self-hosted.
        </p>
      </div>
    </div>
  )
}
