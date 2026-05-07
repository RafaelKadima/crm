import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/api/axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

// ─── Types ────────────────────────────────────────────────────────────

interface UserSession {
  id: string
  ip: string | null
  device_name: string | null
  last_activity_at: string
  created_at: string
  is_current: boolean
}

interface TwoFactorEnableResponse {
  secret: string
  provisioning_uri: string
  qr_code: string // data URI
}

// ─── Page ─────────────────────────────────────────────────────────────

export function SecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Segurança
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Autenticação de dois fatores e gerenciamento de dispositivos conectados.
        </p>
      </div>

      <TwoFactorCard />
      <SessionsCard />
      <RevokeAllCard />
    </div>
  )
}

// ─── 2FA Card ─────────────────────────────────────────────────────────

interface UserMe {
  id: string
  has_2fa_enabled?: boolean
}

function TwoFactorCard() {
  const { data: me, refetch } = useQuery<UserMe>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me')
      // backend pode retornar two_factor_confirmed_at em outra shape
      const u = res.data.user
      return { ...u, has_2fa_enabled: !!u.two_factor_confirmed_at }
    },
  })

  const enabled = !!me?.has_2fa_enabled
  const [enabling, setEnabling] = useState(false)
  const [enableData, setEnableData] = useState<TwoFactorEnableResponse | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)

  const handleStart = async () => {
    setEnabling(true)
    try {
      const res = await api.post<TwoFactorEnableResponse>('/auth/2fa/enable')
      setEnableData(res.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao iniciar 2FA.')
    } finally {
      setEnabling(false)
    }
  }

  const handleConfirm = async () => {
    if (code.length !== 6) {
      toast.error('Código deve ter 6 dígitos.')
      return
    }
    setConfirming(true)
    try {
      const res = await api.post<{ recovery_codes: string[] }>('/auth/2fa/confirm', { code })
      setRecoveryCodes(res.data.recovery_codes)
      setEnableData(null)
      setCode('')
      refetch()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Código inválido.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Autenticação em duas etapas (2FA)
            {enabled && <Badge variant="success">Ativo</Badge>}
          </CardTitle>
          <CardDescription>
            Adiciona uma camada extra de segurança exigindo um código gerado pelo seu app
            de autenticação (Google Authenticator, Authy, 1Password) a cada login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!enabled && !enableData && (
            <Button onClick={handleStart} disabled={enabling}>
              {enabling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Habilitar 2FA
            </Button>
          )}

          {enableData && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-3">
                  Escaneie o QR code abaixo com seu app de autenticação:
                </p>
                <img src={enableData.qr_code} alt="QR code 2FA" className="rounded-md bg-white p-2 w-48 h-48" />
                <details className="mt-3">
                  <summary className="text-sm text-muted-foreground cursor-pointer">
                    Não consigo escanear — usar código manual
                  </summary>
                  <p className="text-xs font-mono mt-2 break-all p-2 bg-background rounded border">
                    {enableData.secret}
                  </p>
                </details>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="otp">Código de 6 dígitos do app</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleConfirm} disabled={code.length !== 6 || confirming}>
                  {confirming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Confirmar e ativar
                </Button>
                <Button variant="ghost" onClick={() => { setEnableData(null); setCode('') }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {enabled && !enableData && (
            <Button variant="outline" onClick={() => setDisableOpen(true)}>
              Desabilitar 2FA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Recovery codes shown ONCE after confirm */}
      <RecoveryCodesDialog
        codes={recoveryCodes}
        onClose={() => setRecoveryCodes(null)}
      />

      <DisableTwoFactorDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        onSuccess={() => refetch()}
      />
    </>
  )
}

function RecoveryCodesDialog({ codes, onClose }: { codes: string[] | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  if (!codes) return null

  const text = codes.join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const download = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'omnify-recovery-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o && acknowledged) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>2FA habilitado</DialogTitle>
          <DialogDescription>
            <strong>Salve seus códigos de recuperação agora.</strong> Eles permitem entrar
            se você perder acesso ao app de autenticação. Cada código só pode ser usado UMA vez.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4 my-2">
          <ul className="font-mono text-sm space-y-1">
            {codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={copy} className="flex-1">
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button variant="outline" onClick={download} className="flex-1">
            Baixar TXT
          </Button>
        </div>

        <label className="flex items-start gap-2 mt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-muted-foreground">
            Salvei os códigos em local seguro e entendo que esta é a única vez que serão exibidos.
          </span>
        </label>

        <DialogFooter>
          <Button onClick={onClose} disabled={!acknowledged}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DisableTwoFactorDialog({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await api.post('/auth/2fa/disable', { password, code })
      toast.success('2FA desabilitado.')
      onSuccess()
      onClose()
      setPassword('')
      setCode('')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao desabilitar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desabilitar 2FA</DialogTitle>
          <DialogDescription>
            Confirme com sua senha + código atual do app (ou um recovery code não usado).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dis-pass">Senha</Label>
            <Input id="dis-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dis-code">Código (TOTP ou recovery)</Label>
            <Input id="dis-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={submit} disabled={!password || !code || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Desabilitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sessions Card ────────────────────────────────────────────────────

function SessionsCard() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<{ data: UserSession[] }>({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => {
      const res = await api.get('/auth/sessions')
      return res.data
    },
    refetchInterval: 30_000,
  })

  const revoke = async (id: string) => {
    try {
      await api.post(`/auth/sessions/${id}/revoke`)
      toast.success('Sessão revogada.')
      queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao revogar.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          Sessões ativas
        </CardTitle>
        <CardDescription>
          Dispositivos onde você está logado. Revogar uma sessão desconecta apenas
          aquele dispositivo — você continua logado nos demais.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted/30" />
        ) : !data?.data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma sessão registrada.</p>
        ) : (
          <ul className="space-y-3">
            {data.data.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <DeviceIcon device={s.device_name} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{s.device_name ?? 'Dispositivo desconhecido'}</span>
                      {s.is_current && <Badge variant="secondary">Esta sessão</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      IP {s.ip ?? '—'} · última atividade {formatRelative(s.last_activity_at)}
                    </p>
                  </div>
                </div>
                {!s.is_current && (
                  <Button variant="outline" size="sm" onClick={() => revoke(s.id)}>
                    Revogar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function DeviceIcon({ device }: { device: string | null }) {
  const d = (device ?? '').toLowerCase()
  const cls = 'h-5 w-5 text-muted-foreground shrink-0'
  if (d.includes('iphone') || d.includes('android')) return <Smartphone className={cls} />
  if (d.includes('ipad')) return <Tablet className={cls} />
  if (d.includes('mac') || d.includes('windows') || d.includes('linux')) return <Monitor className={cls} />
  return <Globe className={cls} />
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'agora'
  if (sec < 3600) return `${Math.floor(sec / 60)}min atrás`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h atrás`
  return `${Math.floor(sec / 86400)}d atrás`
}

// ─── Revoke all (kill switch) ─────────────────────────────────────────

function RevokeAllCard() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    try {
      await api.post('/auth/revoke-all-tokens')
      toast.success('Todas as sessões foram encerradas.')
      // Logout — token atual também invalidado
      window.location.href = '/login'
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro.')
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Encerrar todas as sessões
          </CardTitle>
          <CardDescription>
            Use em caso de suspeita de invasão. Todos os dispositivos (incluindo este)
            são desconectados imediatamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <LogOut className="h-4 w-4 mr-2" />
            Encerrar todas
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar todas as sessões?</DialogTitle>
            <DialogDescription>
              Você vai precisar fazer login de novo em todos os dispositivos. Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={submit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
