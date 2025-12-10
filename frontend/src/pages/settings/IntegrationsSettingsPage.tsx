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
} from 'lucide-react'
import { useChannels } from '@/hooks/useChannels'
import { Link } from 'react-router-dom'

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
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  // API Key fictícia para demonstração
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="w-6 h-6 text-blue-500" />
          Integrações
        </h2>
        <p className="text-gray-400 mt-1">
          Conecte serviços externos ao seu CRM
        </p>
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
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "5511999999999",
  "source": "landing_page",
  "utm_source": "google",
  "utm_campaign": "black_friday"
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}

