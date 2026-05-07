import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Loader2, ExternalLink, KeyRound } from 'lucide-react'
import { useUpdateMetaCredentials, type MetaIntegration } from '@/hooks/useMetaIntegrations'
import { toast } from 'sonner'

interface Props {
  integration: MetaIntegration | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const WABA_VERSIONS = ['v23.0', 'v22.0', 'v21.0', 'v20.0', 'v19.0']

/**
 * Modal pra configurar Business Manager Token (System User Token permanente)
 * + waba_version por integração.
 *
 * Em coexistence, o token do OAuth Embedded Signup vem do app "Tech Provider"
 * e a Meta restringe operações no Business Manager parent (#100). Solução:
 * o admin do BM do tenant gera um System User Token em business.facebook.com
 * com permissões whatsapp_business_management + business_management e cola aqui.
 */
export function BmTokenModal({ integration, open, onOpenChange }: Props) {
  const [bmToken, setBmToken] = useState('')
  const [wabaVersion, setWabaVersion] = useState<string>('')
  const updateCredentials = useUpdateMetaCredentials()

  // Sincroniza waba_version quando o modal abre com uma integração nova.
  // bm_token sempre começa vazio: nunca pré-preenche o input com o valor
  // criptografado (não vem do backend) e qualquer texto digitado é submit.
  useEffect(() => {
    if (open && integration) {
      setWabaVersion(integration.waba_version || '')
      setBmToken('')
    }
  }, [open, integration])

  const handleClose = () => {
    setBmToken('')
    setWabaVersion('')
    onOpenChange(false)
  }

  const handleSave = async () => {
    if (!integration) return

    try {
      const payload: { bm_token?: string | null; waba_version?: string | null } = {}

      // Só envia bm_token se usuário digitou algo (nunca pisotear o que tá lá com vazio)
      if (bmToken.length > 0) {
        payload.bm_token = bmToken
      }
      // waba_version sempre envia (vazio = usa default global)
      payload.waba_version = wabaVersion || null

      await updateCredentials.mutateAsync({ id: integration.id, payload })
      toast.success('Credenciais atualizadas.')
      handleClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar.')
    }
  }

  const handleClearBmToken = async () => {
    if (!integration) return
    if (!confirm('Remover o BM Token desta integração? Templates voltarão a usar o token do OAuth.')) return

    try {
      await updateCredentials.mutateAsync({
        id: integration.id,
        payload: { bm_token: null },
      })
      toast.success('BM Token removido.')
      handleClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao remover.')
    }
  }

  if (!integration) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Business Manager Token
          </DialogTitle>
          <DialogDescription>
            {integration.verified_name || integration.display_phone_number} —{' '}
            <span className="font-mono text-xs">WABA {integration.waba_id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">Quando usar BM Token</p>
            <p className="text-muted-foreground">
              Em <strong>coexistência</strong>, o token do OAuth não consegue criar templates por
              restrição da Meta (erro #100). A solução é um <strong>System User Token permanente</strong>{' '}
              gerado no Business Manager do cliente, com permissões{' '}
              <code className="text-xs bg-background px-1 rounded">whatsapp_business_management</code> e{' '}
              <code className="text-xs bg-background px-1 rounded">business_management</code>.
            </p>
            <p className="text-muted-foreground">Como gerar:</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1 ml-2">
              <li>Entre em business.facebook.com com a conta Meta do cliente</li>
              <li>Configurações → Usuários do Sistema → criar/selecionar System User</li>
              <li>Adicionar Atribuições → marcar a WABA <code className="text-xs">{integration.waba_id}</code></li>
              <li>Gerar Novo Token → marcar permissões acima → Gerar</li>
              <li>Copiar (começa com <code className="text-xs">EAA...</code>) e colar abaixo</li>
            </ol>
            <a
              href="https://business.facebook.com/settings/system-users"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Abrir Business Manager
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bm-token">
              BM Token{' '}
              {integration.has_bm_token && (
                <span className="text-xs text-success">(✓ configurado — deixe vazio pra manter)</span>
              )}
            </Label>
            <Input
              id="bm-token"
              type="password"
              placeholder={integration.has_bm_token ? '••••••••••••••••' : 'EAABs...'}
              value={bmToken}
              onChange={(e) => setBmToken(e.target.value)}
              autoComplete="off"
            />
            {integration.has_bm_token && (
              <button
                type="button"
                onClick={handleClearBmToken}
                className="text-xs text-destructive hover:underline"
                disabled={updateCredentials.isPending}
              >
                Remover BM Token configurado
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="waba-version">Versão Graph API</Label>
            <select
              id="waba-version"
              value={wabaVersion}
              onChange={(e) => setWabaVersion(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input text-foreground"
            >
              <option value="">Padrão (config global)</option>
              {WABA_VERSIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Sobrescreve a versão da Graph API só para esta WABA. Útil para WABAs antigas que ainda
              não foram atualizadas.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={updateCredentials.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateCredentials.isPending}>
            {updateCredentials.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
