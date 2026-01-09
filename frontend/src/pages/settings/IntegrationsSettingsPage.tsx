import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plug,
  MessageSquare,
  Instagram,
  Webhook,
  Key,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Settings,
  Activity,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TestTube2,
  RefreshCw,
} from 'lucide-react'
import { useChannels } from '@/hooks/useChannels'
import {
  useIntegrations,
  useToggleIntegration,
  useDeleteIntegration,
  useTestIntegration,
  integrationTypeInfo,
} from '@/hooks/useIntegrations'
import { IntegrationConfigModal, IntegrationLogsDrawer, MetaWhatsAppCard } from '@/components/integrations'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import type { ExternalIntegration } from '@/types'

const integrations = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Integração com WhatsApp Business API para atendimento',
    icon: MessageSquare,
    color: 'bg-green-500',
    configPath: '/channels',
  },
  {
    id: 'instagram',
    name: 'Instagram DM',
    description: 'Receba e responda mensagens do Instagram Direct',
    icon: Instagram,
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    configPath: '/channels',
  },
  {
    id: 'webhook',
    name: 'Webhooks',
    description: 'Receba eventos de sistemas externos via webhook',
    icon: Webhook,
    color: 'bg-blue-500',
    configPath: null,
  },
]

export function IntegrationsSettingsPage() {
  const { data: channels } = useChannels()
  const { data: externalIntegrations, isLoading: loadingIntegrations, refetch: refetchIntegrations } = useIntegrations()
  const toggleMutation = useToggleIntegration()
  const deleteMutation = useDeleteIntegration()
  const testMutation = useTestIntegration()

  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [editingIntegration, setEditingIntegration] = useState<ExternalIntegration | null>(null)
  const [showLogsDrawer, setShowLogsDrawer] = useState(false)
  const [selectedIntegrationForLogs, setSelectedIntegrationForLogs] = useState<ExternalIntegration | null>(null)

  // API Key ficticia para demonstracao
  const apiKey = 'crm_sk_live_xxxxxxxxxxxxxxxxxxxxxxxx'

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getChannelStatus = (type: string) => {
    const channel = channels?.find((c: any) => c.type === type && c.is_active)
    return !!channel
  }

  const handleToggleIntegration = async (integration: ExternalIntegration) => {
    try {
      await toggleMutation.mutateAsync(integration.id)
      toast.success(integration.is_active ? 'Integracao desativada' : 'Integracao ativada')
    } catch (error) {
      toast.error('Erro ao alterar status')
    }
  }

  const handleDeleteIntegration = async (integration: ExternalIntegration) => {
    if (!confirm(`Deseja realmente excluir a integracao "${integration.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(integration.id)
      toast.success('Integracao excluida')
    } catch (error) {
      toast.error('Erro ao excluir')
    }
  }

  const handleTestIntegration = async (integration: ExternalIntegration) => {
    try {
      const result = await testMutation.mutateAsync(integration.id)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao testar conexao')
    }
  }

  const handleOpenLogs = (integration: ExternalIntegration) => {
    setSelectedIntegrationForLogs(integration)
    setShowLogsDrawer(true)
  }

  const handleEditIntegration = (integration: ExternalIntegration) => {
    setEditingIntegration(integration)
    setShowConfigModal(true)
  }

  const handleNewIntegration = () => {
    setEditingIntegration(null)
    setShowConfigModal(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="w-6 h-6 text-blue-500" />
          Integracoes
        </h2>
        <p className="text-gray-400 mt-1">
          Conecte servicos externos ao seu CRM
        </p>
      </div>

      {/* WhatsApp Business API - Meta Cloud */}
      <MetaWhatsAppCard />

      {/* Integracoes Externas (Linx, Webhooks CRM) */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-purple-400" />
              Integracoes Externas
            </h3>
            <p className="text-gray-400 text-sm">
              Envie leads automaticamente para ERPs, CRMs e outros sistemas
            </p>
          </div>
          <button
            onClick={handleNewIntegration}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Integracao
          </button>
        </div>

        {loadingIntegrations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !externalIntegrations || externalIntegrations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Plug className="w-12 h-12 mb-2 opacity-50" />
            <p>Nenhuma integracao configurada</p>
            <p className="text-sm">Clique em "Nova Integracao" para comecar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {externalIntegrations.map((integration: ExternalIntegration) => {
              const typeInfo = integrationTypeInfo[integration.type] || integrationTypeInfo.other
              return (
                <div
                  key={integration.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    integration.is_active
                      ? 'bg-gray-700/30 border-gray-600'
                      : 'bg-gray-800/50 border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <Plug className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{integration.name}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          integration.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {integration.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                        {integration.last_sync_status && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            integration.last_sync_status === 'success'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {integration.last_sync_status === 'success' ? 'OK' : 'Erro'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {typeInfo.label} - {integration.endpoint_url.substring(0, 50)}...
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestIntegration(integration)}
                      disabled={testMutation.isPending}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                      title="Testar conexao"
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenLogs(integration)}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                      title="Ver logs"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditIntegration(integration)}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                      title="Configurar"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleIntegration(integration)}
                      className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
                      title={integration.is_active ? 'Desativar' : 'Ativar'}
                    >
                      {integration.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteIntegration(integration)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* API Key */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-400" />
          Chave de API
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Use esta chave para integrar sistemas externos com o CRM
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              readOnly
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg font-mono text-sm"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={copyApiKey}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Lista de Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => {
          const isConnected = getChannelStatus(integration.id)
          
          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${integration.color}`}>
                  <integration.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{integration.name}</h3>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" />
                        Conectado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <XCircle className="w-3 h-3" />
                        Desconectado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {integration.description}
                  </p>
                  {integration.configPath && (
                    <Link
                      to={integration.configPath}
                      className="inline-flex items-center gap-1 mt-3 text-sm text-blue-400 hover:text-blue-300"
                    >
                      Configurar
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Webhook Endpoint */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Webhook className="w-5 h-5 text-blue-400" />
          Endpoint de Webhook
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Envie dados para este endpoint para criar leads automaticamente
        </p>

        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
          <p className="text-gray-400 mb-2">POST</p>
          <p className="text-green-400 break-all">
            {window.location.origin}/api/external/webhook
          </p>
        </div>

        <div className="mt-4 p-4 bg-gray-700/30 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">Exemplo de payload:</p>
          <pre className="text-xs text-gray-300 font-mono overflow-x-auto">
{`{
  "name": "Joao Silva",
  "email": "joao@email.com",
  "phone": "5511999999999",
  "source": "landing_page",
  "utm_source": "google",
  "utm_campaign": "black_friday"
}`}
          </pre>
        </div>
      </div>

      {/* Modal de Configuracao */}
      <IntegrationConfigModal
        isOpen={showConfigModal}
        onClose={() => { setShowConfigModal(false); setEditingIntegration(null); }}
        integration={editingIntegration}
      />

      {/* Drawer de Logs */}
      {selectedIntegrationForLogs && (
        <IntegrationLogsDrawer
          isOpen={showLogsDrawer}
          onClose={() => { setShowLogsDrawer(false); setSelectedIntegrationForLogs(null); }}
          integrationId={selectedIntegrationForLogs.id}
          integrationName={selectedIntegrationForLogs.name}
        />
      )}
    </div>
  )
}

