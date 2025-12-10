import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Instagram,
  Facebook,
  Mail,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import api from '@/api/axios'

interface WhatsAppConfig {
  phone_number_id: string
  access_token: string
  business_account_id: string
}

interface InstagramConfig {
  page_id: string
  access_token: string
  instagram_account_id: string
}

const integrations = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Conecte sua conta WhatsApp Business API para receber e enviar mensagens',
    icon: MessageSquare,
    color: 'bg-green-500',
    available: true,
  },
  {
    id: 'instagram',
    name: 'Instagram Direct',
    description: 'Receba mensagens do Instagram Direct da sua conta Business',
    icon: Instagram,
    color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    available: true,
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    description: 'Conecte sua página do Facebook para receber mensagens',
    icon: Facebook,
    color: 'bg-blue-600',
    available: false,
  },
  {
    id: 'email',
    name: 'Email',
    description: 'Configure seu servidor de email para receber leads',
    icon: Mail,
    color: 'bg-red-500',
    available: false,
  },
]

export function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  
  // WhatsApp state
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({
    phone_number_id: '',
    access_token: '',
    business_account_id: '',
  })
  const [showWhatsappToken, setShowWhatsappToken] = useState(false)
  const [whatsappLoading, setWhatsappLoading] = useState(false)
  const [whatsappResult, setWhatsappResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)

  // Instagram state
  const [instagramConfig, setInstagramConfig] = useState<InstagramConfig>({
    page_id: '',
    access_token: '',
    instagram_account_id: '',
  })
  const [showInstagramToken, setShowInstagramToken] = useState(false)
  const [instagramLoading, setInstagramLoading] = useState(false)
  const [instagramResult, setInstagramResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)

  const whatsappWebhookUrl = `${window.location.origin}/api/webhooks/whatsapp`
  const instagramWebhookUrl = `${window.location.origin}/api/webhooks/instagram`

  // WhatsApp handlers
  const handleTestWhatsApp = async () => {
    if (!whatsappConfig.phone_number_id || !whatsappConfig.access_token) {
      setWhatsappResult({ success: false, message: 'Preencha Phone Number ID e Access Token' })
      return
    }

    setWhatsappLoading(true)
    setWhatsappResult(null)

    try {
      const response = await api.post('/whatsapp/test-connection', {
        phone_number_id: whatsappConfig.phone_number_id,
        access_token: whatsappConfig.access_token,
      })

      if (response.data.success) {
        setWhatsappResult({
          success: true,
          message: `Conexão OK! Número: ${response.data.phone_number || 'N/A'} - ${response.data.verified_name || 'N/A'}`,
          data: response.data,
        })
      } else {
        setWhatsappResult({ success: false, message: response.data.error })
      }
    } catch (error: any) {
      setWhatsappResult({
        success: false,
        message: error.response?.data?.error || 'Erro ao testar conexão',
      })
    } finally {
      setWhatsappLoading(false)
    }
  }

  // Instagram handlers
  const handleTestInstagram = async () => {
    if (!instagramConfig.page_id || !instagramConfig.access_token) {
      setInstagramResult({ success: false, message: 'Preencha Page ID e Access Token' })
      return
    }

    setInstagramLoading(true)
    setInstagramResult(null)

    try {
      const response = await api.post('/instagram/test-connection', {
        page_id: instagramConfig.page_id,
        access_token: instagramConfig.access_token,
      })

      if (response.data.success) {
        // Auto-fill Instagram Account ID
        if (response.data.instagram_account_id) {
          setInstagramConfig({
            ...instagramConfig,
            instagram_account_id: response.data.instagram_account_id,
          })
        }

        setInstagramResult({
          success: true,
          message: `Conexão OK! @${response.data.instagram_username || 'N/A'} - ${response.data.followers_count?.toLocaleString() || '0'} seguidores`,
          data: response.data,
        })
      } else {
        setInstagramResult({ success: false, message: response.data.error })
      }
    } catch (error: any) {
      setInstagramResult({
        success: false,
        message: error.response?.data?.error || 'Erro ao testar conexão',
      })
    } finally {
      setInstagramLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    alert('Para salvar, primeiro selecione ou crie um canal nas configurações.')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Integrações</h1>
        <p className="text-muted-foreground mt-1">
          Conecte seus canais de atendimento
        </p>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration, index) => (
          <motion.div
            key={integration.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`cursor-pointer transition-all ${
                selectedIntegration === integration.id
                  ? 'ring-2 ring-primary'
                  : 'hover:shadow-lg'
              } ${!integration.available ? 'opacity-60' : ''}`}
              onClick={() => integration.available && setSelectedIntegration(integration.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${integration.color} text-white`}>
                      <integration.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {integration.name}
                        {!integration.available && (
                          <Badge variant="secondary">Em breve</Badge>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  {integration.available && (
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* WhatsApp Configuration */}
      {selectedIntegration === 'whatsapp' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                Configurar WhatsApp Business API
              </CardTitle>
              <CardDescription>
                Configure sua integração com a API oficial do WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook URL */}
              <div className="p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium mb-2 block">
                  URL do Webhook (configure no Meta Business)
                </label>
                <div className="flex gap-2">
                  <Input value={whatsappWebhookUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(whatsappWebhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use esta URL como Callback URL no painel do Meta Business
                </p>
              </div>

              {/* Configuration Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number ID *</label>
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={whatsappConfig.phone_number_id}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, phone_number_id: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre em: Meta Business → WhatsApp → Configuração da API
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Business Account ID</label>
                  <Input
                    placeholder="Ex: 123456789012345"
                    value={whatsappConfig.business_account_id}
                    onChange={(e) => setWhatsappConfig({ ...whatsappConfig, business_account_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Access Token *</label>
                  <div className="flex gap-2">
                    <Input
                      type={showWhatsappToken ? 'text' : 'password'}
                      placeholder="Token de acesso permanente"
                      value={whatsappConfig.access_token}
                      onChange={(e) => setWhatsappConfig({ ...whatsappConfig, access_token: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                    >
                      {showWhatsappToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gere um token permanente em: Meta Business → Configurações do sistema → Tokens de acesso
                  </p>
                </div>
              </div>

              {/* Test Result */}
              {whatsappResult && (
                <div
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    whatsappResult.success
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-red-500/10 text-red-700 dark:text-red-400'
                  }`}
                >
                  {whatsappResult.success ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span>{whatsappResult.message}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleTestWhatsApp} disabled={whatsappLoading} variant="outline">
                  {whatsappLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
                <Button onClick={handleSaveConfig} disabled={!whatsappResult?.success}>
                  Salvar Configuração
                </Button>
                <Button variant="ghost" asChild>
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação
                  </a>
                </Button>
              </div>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3">Como configurar:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acesse o <a href="https://business.facebook.com" target="_blank" className="text-primary underline">Meta Business Suite</a></li>
                  <li>Vá em WhatsApp → Configuração da API</li>
                  <li>Copie o <strong>Phone Number ID</strong> e <strong>WhatsApp Business Account ID</strong></li>
                  <li>Gere um <strong>Token de Acesso Permanente</strong> em Configurações do Sistema</li>
                  <li>Configure o Webhook com a URL acima e o token de verificação: <code className="bg-muted px-1 rounded">crm_whatsapp_verify_token</code></li>
                  <li>Selecione os campos: <code>messages</code></li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Instagram Configuration */}
      {selectedIntegration === 'instagram' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Configurar Instagram Direct
              </CardTitle>
              <CardDescription>
                Configure sua integração com a API de Mensagens do Instagram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prerequisites */}
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  Requisitos
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Conta Instagram Business ou Creator</li>
                  <li>✓ Página do Facebook conectada ao Instagram</li>
                  <li>✓ App registrado no Meta for Developers</li>
                  <li>✓ Permissões: instagram_basic, instagram_manage_messages, pages_messaging</li>
                </ul>
              </div>

              {/* Webhook URL */}
              <div className="p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium mb-2 block">
                  URL do Webhook (configure no Meta Business)
                </label>
                <div className="flex gap-2">
                  <Input value={instagramWebhookUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(instagramWebhookUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Use esta URL como Callback URL no painel do Meta Business
                </p>
              </div>

              {/* Configuration Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Page ID *</label>
                  <Input
                    placeholder="ID da Página do Facebook"
                    value={instagramConfig.page_id}
                    onChange={(e) => setInstagramConfig({ ...instagramConfig, page_id: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID da Página do Facebook conectada ao Instagram
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Instagram Account ID</label>
                  <Input
                    placeholder="Preenchido automaticamente"
                    value={instagramConfig.instagram_account_id}
                    onChange={(e) => setInstagramConfig({ ...instagramConfig, instagram_account_id: e.target.value })}
                    readOnly={!!instagramResult?.data?.instagram_account_id}
                    className={instagramResult?.data?.instagram_account_id ? 'bg-muted' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Será preenchido automaticamente ao testar conexão
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Access Token *</label>
                  <div className="flex gap-2">
                    <Input
                      type={showInstagramToken ? 'text' : 'password'}
                      placeholder="Token de acesso da página"
                      value={instagramConfig.access_token}
                      onChange={(e) => setInstagramConfig({ ...instagramConfig, access_token: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowInstagramToken(!showInstagramToken)}
                    >
                      {showInstagramToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use o Page Access Token (não o User Token)
                  </p>
                </div>
              </div>

              {/* Test Result */}
              {instagramResult && (
                <div
                  className={`p-4 rounded-lg ${
                    instagramResult.success
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                      : 'bg-red-500/10 text-red-700 dark:text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {instagramResult.success ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    <span>{instagramResult.message}</span>
                  </div>
                  {instagramResult.success && instagramResult.data?.profile_picture && (
                    <div className="mt-3 flex items-center gap-3">
                      <img 
                        src={instagramResult.data.profile_picture} 
                        alt="Profile" 
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium">@{instagramResult.data.instagram_username}</p>
                        <p className="text-xs text-muted-foreground">
                          {instagramResult.data.instagram_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleTestInstagram} disabled={instagramLoading} variant="outline">
                  {instagramLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
                <Button onClick={handleSaveConfig} disabled={!instagramResult?.success}>
                  Salvar Configuração
                </Button>
                <Button variant="ghost" asChild>
                  <a
                    href="https://developers.facebook.com/docs/instagram-api/guides/messaging"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação
                  </a>
                </Button>
              </div>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3">Como configurar:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Acesse o <a href="https://developers.facebook.com" target="_blank" className="text-primary underline">Meta for Developers</a></li>
                  <li>Crie um App ou use um existente</li>
                  <li>Adicione o produto <strong>Instagram</strong> ao seu App</li>
                  <li>No <a href="https://business.facebook.com/settings/pages" target="_blank" className="text-primary underline">Business Settings</a>, conecte sua Página do Facebook ao Instagram</li>
                  <li>Gere um <strong>Page Access Token</strong> com as permissões necessárias</li>
                  <li>Configure o Webhook com a URL acima e o token: <code className="bg-muted px-1 rounded">crm_instagram_verify_token</code></li>
                  <li>Assine os campos: <code>messages, messaging_postbacks</code></li>
                </ol>
              </div>

              {/* Limitations */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">Limitações da API</h4>
                <ul className="text-sm text-amber-700/80 dark:text-amber-400/80 space-y-1">
                  <li>• Janela de resposta: 24 horas após última mensagem do usuário</li>
                  <li>• Máximo de 1000 caracteres por mensagem</li>
                  <li>• Não é possível iniciar conversas (apenas responder)</li>
                  <li>• Stories mentions são recebidos, mas têm janela de 24h</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
