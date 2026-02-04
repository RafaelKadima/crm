import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Loader2,
  ExternalLink,
  Clock,
  Shield,
  Plus,
  Settings,
  Smartphone,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useMetaStatus,
  useMetaIntegrations,
  useConnectMeta,
  useDisconnectMeta,
  useRefreshMetaToken,
  type MetaIntegration,
} from '@/hooks/useMetaIntegrations'
import {
  useFacebookSDK,
  useMetaEmbeddedSignup,
} from '@/hooks/useMetaEmbeddedSignup'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { WhatsAppProfileEditor } from './WhatsAppProfileEditor'

export function MetaWhatsAppCard() {
  const { data: status, isLoading: loadingStatus } = useMetaStatus()
  const { data: integrations, isLoading: loadingIntegrations } = useMetaIntegrations()
  const connectMutation = useConnectMeta()
  const disconnectMutation = useDisconnectMeta()
  const refreshTokenMutation = useRefreshMetaToken()

  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null)
  const [editProfileId, setEditProfileId] = useState<string | null>(null)
  const [coexistenceMode, setCoexistenceMode] = useState(false)

  // Embedded Signup - carrega SDK se configurado
  const appId = status?.app_id || ''
  const configId = status?.config_id || ''
  const isEmbeddedSignupConfigured = status?.embedded_signup_configured || false

  const { isLoaded: isSDKLoaded } = useFacebookSDK(appId)
  const { startEmbeddedSignup, isProcessing: isEmbeddedProcessing } = useMetaEmbeddedSignup()

  const handleConnect = () => {
    // Se Embedded Signup está configurado e SDK carregado, usa ele
    if (isEmbeddedSignupConfigured && isSDKLoaded && configId) {
      startEmbeddedSignup({
        appId,
        configId,
        featureType: coexistenceMode ? 'whatsapp_business_app_onboarding' : '',
      })
    } else {
      // Fallback para OAuth redirect
      connectMutation.mutate()
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      await disconnectMutation.mutateAsync(id)
      toast.success('WhatsApp desconectado com sucesso')
      setConfirmDisconnect(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao desconectar')
    }
  }

  const handleRefreshToken = async (id: string) => {
    try {
      await refreshTokenMutation.mutateAsync(id)
      toast.success('Token renovado com sucesso')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao renovar token')
    }
  }

  const getStatusBadge = (integration: MetaIntegration) => {
    if (integration.status === 'active') {
      if (integration.is_expiring_soon) {
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Expirando em {integration.days_until_expiration} dias
          </Badge>
        )
      }
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Ativo
        </Badge>
      )
    }

    if (integration.status === 'expired') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expirado
        </Badge>
      )
    }

    if (integration.status === 'reauth_required') {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Reautorizacao necessaria
        </Badge>
      )
    }

    return null
  }

  const isLoading = loadingStatus || loadingIntegrations
  const hasIntegrations = integrations && integrations.length > 0
  const isConfigured = status?.oauth_configured
  const isConnecting = connectMutation.isPending || isEmbeddedProcessing

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-muted/50 rounded-xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-green-500">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">WhatsApp Business API</h3>
              {hasIntegrations && (
                <Badge variant="success" className="text-xs">
                  {integrations.length} conectado{integrations.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte sua conta WhatsApp Business via Meta Cloud API
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isConfigured ? (
          <div className="text-center py-6">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h4 className="font-medium mb-2">Configuracao necessaria</h4>
            <p className="text-sm text-muted-foreground mb-4">
              As credenciais do Meta App (APP_ID e APP_SECRET) precisam ser configuradas no servidor.
            </p>
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
            >
              Criar Meta App
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <>
            {/* Lista de integracoes */}
            {hasIntegrations && (
              <div className="space-y-3 mb-6">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-4 bg-accent/30 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Phone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {integration.display_phone_number || integration.phone_number_id}
                          </span>
                          {getStatusBadge(integration)}
                          {integration.is_coexistence && (
                            <Badge variant="outline" className="flex items-center gap-1 text-blue-400 border-blue-400/30">
                              <Smartphone className="w-3 h-3" />
                              Coexistencia
                            </Badge>
                          )}
                        </div>
                        {integration.verified_name && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {integration.verified_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botao de editar perfil */}
                      {integration.status === 'active' && (
                        <button
                          onClick={() => setEditProfileId(integration.id)}
                          className="p-2 hover:bg-muted-foreground/20 rounded-lg transition-colors text-muted-foreground hover:text-white"
                          title="Editar perfil do WhatsApp"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}

                      {/* Botao de renovar token */}
                      {(integration.is_expiring_soon || integration.needs_reauth) && (
                        <button
                          onClick={() => handleRefreshToken(integration.id)}
                          disabled={refreshTokenMutation.isPending}
                          className="p-2 hover:bg-muted-foreground/20 rounded-lg transition-colors text-yellow-400"
                          title="Renovar token"
                        >
                          {refreshTokenMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Botao de desconectar */}
                      {confirmDisconnect === integration.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDisconnect(integration.id)}
                            disabled={disconnectMutation.isPending}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                          >
                            {disconnectMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Confirmar'
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDisconnect(null)}
                            className="px-3 py-1 bg-muted-foreground/20 hover:bg-accent rounded-lg text-sm transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDisconnect(integration.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          title="Desconectar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Toggle Coexistencia */}
            {isEmbeddedSignupConfigured && (
              <div className="mb-4">
                <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">Modo Coexistencia</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      Conecte um numero ja em uso no WhatsApp Business App mantendo o App funcionando
                    </p>
                  </div>
                  <Switch
                    checked={coexistenceMode}
                    onCheckedChange={setCoexistenceMode}
                  />
                </div>
                {coexistenceMode && (
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-300 space-y-1">
                        <p>O numero deve estar em uso no WhatsApp Business App ha pelo menos 7 dias.</p>
                        <p>Mensagens enviadas pelo App serao sincronizadas com o CRM automaticamente.</p>
                        <p>Selo azul (OBA) nao e suportado no modo coexistencia.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Botao conectar */}
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEmbeddedProcessing ? 'Processando...' : 'Conectando...'}
                </>
              ) : (
                <>
                  {hasIntegrations ? (
                    <>
                      <Plus className="w-5 h-5" />
                      {coexistenceMode ? 'Adicionar numero existente' : 'Adicionar outro numero'}
                    </>
                  ) : (
                    <>
                      {coexistenceMode ? (
                        <>
                          <Smartphone className="w-5 h-5" />
                          Conectar numero existente
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-5 h-5" />
                          Conectar WhatsApp
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </button>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center mt-4">
              {isEmbeddedSignupConfigured
                ? 'Um popup sera aberto para voce conectar sua conta WhatsApp Business'
                : 'Voce sera redirecionado para o Facebook para autorizar o acesso ao WhatsApp Business'}
            </p>
          </>
        )}
      </div>

      {/* Profile Editor Modal */}
      {editProfileId && (
        <WhatsAppProfileEditor
          integrationId={editProfileId}
          open={!!editProfileId}
          onOpenChange={(open) => {
            if (!open) setEditProfileId(null)
          }}
        />
      )}
    </motion.div>
  )
}
