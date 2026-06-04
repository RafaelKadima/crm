import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  KeyRound,
  Smartphone,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  useDiagnoseMetaIntegration,
  type MetaIntegration,
} from '@/hooks/useMetaIntegrations'

interface Props {
  integration: MetaIntegration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Dispara o Embedded Signup pra reconectar o número (com featureType coexistente quando aplicável). */
  onReconnect: (integration: MetaIntegration) => void
  /** Abre o modal de BM Token como fallback. */
  onOpenBmToken: (integration: MetaIntegration) => void
  /** Sinaliza que o popup de reconexão está em andamento. */
  isReconnecting?: boolean
}

type DiagnoseData = {
  token_type: string | null
  token_is_bisuat: boolean
  token_is_valid: boolean
  token_scopes: string[]
  template_management_authorized: boolean
  template_permission_error: { code?: number; message?: string } | null
  guidance: string[]
}

/**
 * Central de permissão de criação de templates por número.
 *
 * Em coexistência, criar template via API exige que o app Omnify seja
 * owner/shared da WABA no Business Manager do cliente — o que é concedido
 * NO PRÓPRIO popup do Embedded Signup quando o admin marca "Controle Total".
 * Este modal verifica o estado real (debug_token + GET /message_templates via
 * endpoint /diagnose) e oferece os caminhos de correção SEM precisar abrir o BM:
 *   1. Reconectar com Controle Total (resolve na origem)
 *   2. BM Token / System User Token (fallback)
 */
export function TemplateAccessModal({
  integration,
  open,
  onOpenChange,
  onReconnect,
  onOpenBmToken,
  isReconnecting = false,
}: Props) {
  const diagnose = useDiagnoseMetaIntegration()
  const [result, setResult] = useState<DiagnoseData | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const lastDiagnosedId = useRef<string | null>(null)

  const runDiagnose = async (id: string) => {
    setErrorMsg(null)
    try {
      const res = await diagnose.mutateAsync(id)
      setResult(res.data)
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      setErrorMsg(
        e?.response?.status === 403
          ? 'Sem permissão para rodar o diagnóstico (requer perfil de administrador). Mostrando o último estado conhecido.'
          : e?.response?.data?.message || 'Não foi possível verificar com o Meta agora.'
      )
    }
  }

  // Roda o diagnóstico ao abrir (uma vez por número), pra mostrar a verdade fresca.
  useEffect(() => {
    if (open && integration && lastDiagnosedId.current !== integration.id) {
      lastDiagnosedId.current = integration.id
      setResult(null)
      void runDiagnose(integration.id)
    }
    if (!open) {
      lastDiagnosedId.current = null
      setResult(null)
      setErrorMsg(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, integration])

  if (!integration) return null

  const isChecking = diagnose.isPending && !result
  // Verdade efetiva: resultado fresco do diagnóstico > flag persistida na integração.
  const authorized =
    result?.template_management_authorized ??
    integration.template_management_authorized ??
    null
  const tokenType = result?.token_type ?? integration.token_type ?? null
  const isCoexistence = integration.is_coexistence
  const errorCode = result?.template_permission_error?.code ?? null

  const name =
    integration.verified_name || integration.display_phone_number || 'WhatsApp Business'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Criação de templates — {name}
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">WABA {integration.waba_id}</span>
            {isCoexistence && (
              <span className="ml-2 inline-flex items-center gap-1 text-info">
                <Smartphone className="h-3 w-3" /> Coexistência
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hero de status */}
          <div
            className={`rounded-lg border p-4 ${
              isChecking
                ? 'border-border bg-muted/30'
                : authorized === true
                  ? 'border-success/30 bg-success/5'
                  : authorized === false
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {isChecking ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mt-0.5" />
              ) : authorized === true ? (
                <ShieldCheck className="h-6 w-6 text-success mt-0.5" />
              ) : (
                <ShieldAlert className="h-6 w-6 text-warning mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-medium">
                  {isChecking
                    ? 'Verificando com o Meta…'
                    : authorized === true
                      ? 'Habilitado — este número pode criar templates'
                      : authorized === false
                        ? 'Pendente — o app ainda não pode criar templates nesta WABA'
                        : 'Status desconhecido — clique em Re-verificar'}
                </p>
                {!isChecking && authorized === false && (
                  <p className="text-sm text-muted-foreground">
                    {errorCode === 100
                      ? 'O Meta recusou com (#100): o app Omnify não está autorizado a gerenciar esta WABA. '
                      : ''}
                    {isCoexistence
                      ? 'Em coexistência isso se resolve reconectando e marcando "Controle Total" no popup — sem entrar no Business Manager.'
                      : 'Reconecte concedendo acesso total à conta do WhatsApp.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Detalhe técnico discreto */}
          {!isChecking && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                {tokenType ? (
                  <CheckCircle2 className="h-3 w-3 text-success" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                Token: <span className="font-mono">{tokenType ?? 'desconhecido'}</span>
                {(tokenType === 'BUSINESS_INTEGRATION_USER' ||
                  tokenType === 'SYSTEM_USER') &&
                  ' ✓'}
              </span>
              {integration.has_bm_token && (
                <span className="inline-flex items-center gap-1 text-success">
                  <KeyRound className="h-3 w-3" /> BM Token configurado
                </span>
              )}
            </div>
          )}

          {/* Orientação do backend */}
          {!isChecking && result?.guidance && result.guidance.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">Como resolver</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                {result.guidance.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {errorMsg && (
            <p className="text-sm text-warning">{errorMsg}</p>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => integration && runDiagnose(integration.id)}
            disabled={diagnose.isPending}
          >
            {diagnose.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-verificar
          </Button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => onOpenBmToken(integration)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Usar BM Token
            </Button>
            {authorized !== true && (
              <Button
                onClick={() => onReconnect(integration)}
                disabled={isReconnecting}
              >
                {isReconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                Reconectar com Controle Total
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
