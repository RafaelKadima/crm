import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Instagram,
  Globe,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Trash2,
  Power,
  PowerOff,
  Bot,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  AlertCircle,
  Zap,
  QrCode,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import {
  useChannels,
  useCreateChannel,
  useUpdateChannel,
  useDeleteChannel,
  useTestChannelConnection,
  useUpdateChannelIaMode,
  useToggleChannelActive,
  useInternalStatus,
  channelTypeInfo,
  iaModeInfo,
  whatsappProviderInfo,
  type Channel,
  type ChannelConfig,
  type WhatsAppProviderType,
} from '@/hooks/useChannels'
import { useSdrAgents } from '@/hooks/useSdrAgents'
import { QRCodeModal } from '@/components/channels/QRCodeModal'

const channelIcons = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  webchat: Globe,
  other: MoreHorizontal,
}

export function ChannelsPage() {
  const [search, setSearch] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [isIaModalOpen, setIsIaModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [qrChannel, setQrChannel] = useState<Channel | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'whatsapp' as 'whatsapp' | 'instagram' | 'webchat' | 'other',
    provider_type: 'meta' as WhatsAppProviderType,
    identifier: '',
    ia_mode: 'none' as 'none' | 'ia_sdr' | 'enterprise',
    ia_workflow_id: '',
    sdr_agent_id: '' as string,
    config: {
      phone_number_id: '',
      waba_id: '',
      access_token: '',
      business_account_id: '',
      page_id: '',
      instagram_account_id: '',
    } as ChannelConfig,
  })
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)

  // Queries and mutations
  const { data: channels = [], isLoading } = useChannels()
  const { data: sdrAgents = [] } = useSdrAgents()
  const createChannel = useCreateChannel()
  const updateChannel = useUpdateChannel()
  const deleteChannel = useDeleteChannel()
  const testConnection = useTestChannelConnection()
  const updateIaMode = useUpdateChannelIaMode()
  const toggleActive = useToggleChannelActive()

  // Filter channels
  const filteredChannels = useMemo(() => {
    if (!search) return channels
    const searchLower = search.toLowerCase()
    return channels.filter(
      (channel) =>
        channel.name.toLowerCase().includes(searchLower) ||
        channel.type.toLowerCase().includes(searchLower) ||
        channel.identifier.toLowerCase().includes(searchLower)
    )
  }, [channels, search])

  // Handlers
  const openCreateModal = () => {
    setFormData({
      name: '',
      type: 'whatsapp',
      provider_type: 'meta',
      identifier: '',
      ia_mode: 'none',
      ia_workflow_id: '',
      sdr_agent_id: '',
      config: {
        phone_number_id: '',
        waba_id: '',
        access_token: '',
        business_account_id: '',
        page_id: '',
        instagram_account_id: '',
      },
    })
    setShowAdvancedConfig(false)
    setIsCreateModalOpen(true)
  }

  const openConfigModal = (channel: Channel) => {
    setSelectedChannel(channel)
    setFormData({
      name: channel.name,
      type: channel.type,
      provider_type: channel.provider_type || 'meta',
      identifier: channel.identifier,
      ia_mode: channel.ia_mode,
      ia_workflow_id: channel.ia_workflow_id || '',
      sdr_agent_id: (channel as any).sdr_agent_id || '',
      config: channel.config || {
        phone_number_id: '',
        waba_id: '',
        access_token: '',
        business_account_id: '',
        page_id: '',
        instagram_account_id: '',
      },
    })
    setTestResult(null)
    setIsConfigModalOpen(true)
  }

  const openQRModal = (channel: Channel) => {
    setQrChannel(channel)
    setIsQRModalOpen(true)
  }

  const openIaModal = (channel: Channel) => {
    setSelectedChannel(channel)
    setFormData({
      ...formData,
      ia_mode: channel.ia_mode,
      ia_workflow_id: channel.ia_workflow_id || '',
      sdr_agent_id: (channel as any).sdr_agent_id || '',
    })
    setIsIaModalOpen(true)
  }

  const openDeleteModal = (channel: Channel) => {
    setSelectedChannel(channel)
    setIsDeleteModalOpen(true)
  }

  const handleCreateChannel = async () => {
    try {
      await createChannel.mutateAsync({
        name: formData.name,
        type: formData.type,
        provider_type: formData.type === 'whatsapp' ? formData.provider_type : undefined,
        identifier: formData.identifier,
        ia_mode: formData.ia_mode,
        ia_workflow_id: formData.ia_workflow_id || undefined,
        config: formData.config,
        is_active: true,
      })
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error('Erro ao criar canal:', error)
    }
  }

  const handleUpdateChannel = async () => {
    if (!selectedChannel) return
    try {
      await updateChannel.mutateAsync({
        id: selectedChannel.id,
        name: formData.name,
        identifier: formData.identifier,
        config: formData.config,
      })
      setIsConfigModalOpen(false)
    } catch (error) {
      console.error('Erro ao atualizar canal:', error)
    }
  }

  const handleUpdateIaMode = async () => {
    if (!selectedChannel) return
    try {
      await updateIaMode.mutateAsync({
        channelId: selectedChannel.id,
        iaMode: formData.ia_mode,
        iaWorkflowId: formData.ia_workflow_id || undefined,
        sdrAgentId: formData.sdr_agent_id || undefined,
      })
      setIsIaModalOpen(false)
    } catch (error) {
      console.error('Erro ao atualizar modo IA:', error)
    }
  }

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return
    try {
      await deleteChannel.mutateAsync(selectedChannel.id)
      setIsDeleteModalOpen(false)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao deletar canal')
    }
  }

  const handleTestConnection = async () => {
    if (!selectedChannel) return
    setTestResult(null)
    try {
      const result = await testConnection.mutateAsync(selectedChannel.id)
      setTestResult(result)
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Erro ao testar conexão',
      })
    }
  }

  const handleToggleActive = async (channel: Channel) => {
    try {
      await toggleActive.mutateAsync(channel.id)
    } catch (error) {
      console.error('Erro ao alternar status:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const webhookUrl = `${window.location.origin.replace(':5176', ':8000')}/api/webhooks/meta`

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Canais</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus canais de atendimento e configure a IA SDR
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Canal
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar canais..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Channels Grid */}
      {filteredChannels.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-muted rounded-full">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Nenhum canal encontrado</h3>
              <p className="text-muted-foreground">
                {search
                  ? 'Tente uma busca diferente'
                  : 'Crie seu primeiro canal de atendimento'}
              </p>
            </div>
            {!search && (
              <Button onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Canal
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredChannels.map((channel, index) => {
              const Icon = channelIcons[channel.type] || MoreHorizontal
              const typeInfo = channelTypeInfo[channel.type]
              const iaInfo = iaModeInfo[channel.ia_mode]

              return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      !channel.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Status indicator */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 ${
                        channel.is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />

                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl ${typeInfo.color} text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{channel.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {channel.identifier}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(channel)}
                            title={channel.is_active ? 'Desativar' : 'Ativar'}
                          >
                            {channel.is_active ? (
                              <Power className="h-4 w-4 text-green-500" />
                            ) : (
                              <PowerOff className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Type, Provider and IA badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge variant="outline">{typeInfo.label}</Badge>
                        {channel.type === 'whatsapp' && channel.provider_type === 'internal' && (
                          <Badge variant="outline" className="border-orange-500 text-orange-600">
                            <QrCode className="h-3 w-3 mr-1" />
                            Interno
                          </Badge>
                        )}
                        {channel.type === 'whatsapp' && channel.provider_type === 'internal' && (
                          channel.config?.internal_connected ? (
                            <Badge className="bg-green-500 text-white">
                              <Wifi className="h-3 w-3 mr-1" />
                              Conectado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-muted-foreground">
                              <WifiOff className="h-3 w-3 mr-1" />
                              Desconectado
                            </Badge>
                          )
                        )}
                        <Badge
                          className={`${iaInfo.color} text-white`}
                        >
                          <Bot className="h-3 w-3 mr-1" />
                          {iaInfo.label}
                        </Badge>
                        {!channel.is_active && (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{channel.leads_count || 0} leads</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{channel.tickets_count || 0} tickets</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {channel.type === 'whatsapp' && channel.provider_type === 'internal' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openQRModal(channel)}
                            className={channel.config?.internal_connected ? 'border-green-500 text-green-600' : ''}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            {channel.config?.internal_connected ? 'Conectado' : 'Conectar'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openConfigModal(channel)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configurar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openIaModal(channel)}
                        >
                          <Bot className="h-4 w-4 mr-1" />
                          IA
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => openDeleteModal(channel)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Channel Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent size="lg" className="max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Novo Canal
            </DialogTitle>
            <DialogDescription>
              Configure um novo canal de atendimento
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Channel Type Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tipo do Canal</label>
              <div className="grid grid-cols-2 gap-3">
                {(['whatsapp', 'instagram', 'webchat', 'other'] as const).map((type) => {
                  const info = channelTypeInfo[type]
                  const Icon = channelIcons[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, type })}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        formData.type === type
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
                      }`}
                    >
                      <div className={`p-2.5 rounded-lg ${info.color} text-white shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium block">{info.label}</span>
                        <span className="text-xs text-muted-foreground">{info.description}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* WhatsApp Provider Selection */}
            {formData.type === 'whatsapp' && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Provedor WhatsApp</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['meta', 'internal'] as const).map((provider) => {
                    const info = whatsappProviderInfo[provider]
                    return (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setFormData({ ...formData, provider_type: provider })}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.provider_type === provider
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${provider === 'meta' ? 'bg-blue-500' : 'bg-orange-500'} text-white shrink-0`}>
                            {provider === 'meta' ? <MessageSquare className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                          </div>
                          <span className="font-medium">{info.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                        <div className="flex gap-2 mt-2">
                          {info.supports_templates && (
                            <Badge variant="secondary" className="text-xs">Templates</Badge>
                          )}
                          {info.requires_qr && (
                            <Badge variant="secondary" className="text-xs">QR Code</Badge>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {formData.provider_type === 'internal' && (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                    O provider interno usa conexao via QR Code. Templates do WhatsApp Business nao sao suportados.
                  </p>
                )}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Canal *</label>
              <Input
                placeholder="Ex: WhatsApp Principal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-11"
              />
            </div>

            {/* Identifier */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Identificador *</label>
              <Input
                placeholder={
                  formData.type === 'whatsapp'
                    ? 'Ex: +55 11 99999-9999'
                    : formData.type === 'instagram'
                    ? 'Ex: @seuinstagram'
                    : 'Ex: chat.seusite.com'
                }
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                {formData.type === 'whatsapp'
                  ? 'Número do WhatsApp Business'
                  : formData.type === 'instagram'
                  ? 'Username do Instagram'
                  : 'URL ou identificador único'}
              </p>
            </div>

            {/* IA Mode */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Modo de Atendimento</label>
              <div className="space-y-2">
                {(['none', 'ia_sdr', 'enterprise'] as const).map((mode) => {
                  const info = iaModeInfo[mode]
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({ ...formData, ia_mode: mode })}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                        formData.ia_mode === mode
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full ${info.color} shrink-0`} />
                      <div className="flex-1">
                        <span className="text-sm font-medium block">{info.label}</span>
                        <span className="text-xs text-muted-foreground">{info.description}</span>
                      </div>
                      {formData.ia_mode === mode && (
                        <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Workflow ID (if IA is enabled) */}
            {formData.ia_mode !== 'none' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-sm font-medium">ID do Workflow (n8n)</label>
                <Input
                  placeholder="Ex: abc123"
                  value={formData.ia_workflow_id}
                  onChange={(e) => setFormData({ ...formData, ia_workflow_id: e.target.value })}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  ID do workflow no n8n que será acionado para processar mensagens
                </p>
              </motion.div>
            )}

            {/* Advanced API Configuration - Only for Meta provider */}
            {!(formData.type === 'whatsapp' && formData.provider_type === 'internal') && (
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configuração Avançada (Token e IDs)
                <motion.span
                  animate={{ rotate: showAdvancedConfig ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.span>
              </button>

              <AnimatePresence>
                {showAdvancedConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 space-y-4"
                  >
                    {/* WhatsApp Config (Meta only) */}
                    {formData.type === 'whatsapp' && formData.provider_type === 'meta' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Phone Number ID</label>
                            <Input
                              placeholder="Ex: 123456789012345"
                              value={formData.config.phone_number_id || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, phone_number_id: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">WABA ID</label>
                            <Input
                              placeholder="WhatsApp Business Account ID"
                              value={formData.config.waba_id || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, waba_id: e.target.value },
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Access Token (Permanente)</label>
                          <div className="flex gap-2">
                            <Input
                              type={showToken ? 'text' : 'password'}
                              placeholder="Token de acesso do System User"
                              value={formData.config.access_token || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, access_token: e.target.value },
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowToken(!showToken)}
                            >
                              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Instagram Config */}
                    {formData.type === 'instagram' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Page ID</label>
                            <Input
                              placeholder="ID da Página do Facebook"
                              value={formData.config.page_id || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, page_id: e.target.value },
                                })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Instagram Account ID</label>
                            <Input
                              placeholder="ID da conta Instagram"
                              value={formData.config.instagram_account_id || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, instagram_account_id: e.target.value },
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Access Token</label>
                          <div className="flex gap-2">
                            <Input
                              type={showToken ? 'text' : 'password'}
                              placeholder="Page Access Token"
                              value={formData.config.access_token || ''}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, access_token: e.target.value },
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowToken(!showToken)}
                            >
                              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Você pode configurar isso depois clicando em "Configurar" no canal criado.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/30">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={!formData.name || !formData.identifier || createChannel.isPending}
            >
              {createChannel.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure Channel Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent size="xl" className="max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {selectedChannel && (
                <>
                  {(() => {
                    const Icon = channelIcons[selectedChannel.type]
                    const typeInfo = channelTypeInfo[selectedChannel.type]
                    return (
                      <div className={`p-2 rounded-lg ${typeInfo.color} text-white`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    )
                  })()}
                  Configurar {selectedChannel.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Configure as credenciais de API e outras opções
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Identificador</label>
                <Input
                  value={formData.identifier}
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                />
              </div>
            </div>

            {/* Webhook URL */}
            <div className="p-4 bg-muted rounded-lg">
              <label className="text-sm font-medium mb-2 block">
                URL do Webhook (configure no Meta Business)
              </label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use esta URL como Callback URL no painel do Meta Business
              </p>
            </div>

            {/* WhatsApp Config */}
            {selectedChannel?.type === 'whatsapp' && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  Configuração WhatsApp Business API
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number ID *</label>
                    <Input
                      placeholder="Ex: 123456789012345"
                      value={formData.config.phone_number_id || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, phone_number_id: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">WABA ID *</label>
                    <Input
                      placeholder="WhatsApp Business Account ID"
                      value={formData.config.waba_id || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, waba_id: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Access Token (Permanente) *</label>
                  <div className="flex gap-2">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder="Token de acesso do System User"
                      value={formData.config.access_token || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, access_token: e.target.value },
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Token permanente gerado no Meta Business Suite → System Users
                  </p>
                </div>
              </div>
            )}

            {/* Instagram Config */}
            {selectedChannel?.type === 'instagram' && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  Configuração Instagram Direct
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Page ID *</label>
                    <Input
                      placeholder="ID da Página do Facebook"
                      value={formData.config.page_id || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, page_id: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instagram Account ID</label>
                    <Input
                      placeholder="Preenchido automaticamente"
                      value={formData.config.instagram_account_id || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, instagram_account_id: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Access Token *</label>
                  <div className="flex gap-2">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder="Page Access Token"
                      value={formData.config.access_token || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, access_token: e.target.value },
                        })
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowToken(!showToken)}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  testResult.success
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Instructions */}
            <div className="p-4 bg-muted/50 rounded-xl border">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Instruções
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  Acesse o{' '}
                  <a
                    href="https://business.facebook.com"
                    target="_blank"
                    className="text-primary underline"
                  >
                    Meta Business Suite
                  </a>
                </li>
                <li>Configure a API do WhatsApp ou Instagram</li>
                <li>Copie as credenciais e cole acima</li>
                <li>Configure o Webhook com a URL acima</li>
                <li>Teste a conexão antes de salvar</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/30">
            <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Testar Conexão
            </Button>
            <Button onClick={handleUpdateChannel} disabled={updateChannel.isPending}>
              {updateChannel.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IA Mode Modal */}
      <Dialog open={isIaModalOpen} onOpenChange={setIsIaModalOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-500 text-white">
                <Bot className="h-4 w-4" />
              </div>
              Configurar IA SDR
            </DialogTitle>
            <DialogDescription>
              Configure como a IA irá atender neste canal
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* IA Mode Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Modo de Atendimento</label>
              {(['none', 'ia_sdr', 'enterprise'] as const).map((mode) => {
                const info = iaModeInfo[mode]
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFormData({ ...formData, ia_mode: mode })}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                      formData.ia_mode === mode
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-muted/50 hover:bg-muted hover:border-muted-foreground/20'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${info.color} shrink-0`} />
                    <div className="flex-1">
                      <span className="font-medium block">{info.label}</span>
                      <span className="text-sm text-muted-foreground">{info.description}</span>
                    </div>
                    {formData.ia_mode === mode && (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* SDR Agent Selection */}
            {formData.ia_mode !== 'none' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                {/* SDR Agent Local */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-500" />
                    SDR Agent (IA Local)
                  </label>
                  <select
                    value={formData.sdr_agent_id}
                    onChange={(e) => setFormData({ ...formData, sdr_agent_id: e.target.value })}
                    className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione um SDR Agent...</option>
                    {sdrAgents.filter(a => a.is_active).map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.ai_model})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    SDR Agent criado no CRM para processar mensagens automaticamente
                  </p>
                  {sdrAgents.length === 0 && (
                    <p className="text-xs text-amber-600">
                      Nenhum SDR Agent criado. <a href="/sdr" className="underline">Criar agora</a>
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">ou use n8n</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Workflow n8n (fallback) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">ID do Workflow (n8n)</label>
                  <Input
                    placeholder="Ex: abc123 (opcional se usar SDR Agent)"
                    value={formData.ia_workflow_id}
                    onChange={(e) => setFormData({ ...formData, ia_workflow_id: e.target.value })}
                    className="h-11"
                    disabled={!!formData.sdr_agent_id}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.sdr_agent_id 
                      ? 'Desabilitado quando um SDR Agent está selecionado'
                      : 'Usado apenas se nenhum SDR Agent for selecionado'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Info box */}
            {formData.ia_mode === 'ia_sdr' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20"
              >
                <h4 className="font-medium text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Sobre a IA SDR
                </h4>
                <ul className="text-sm text-purple-700/80 dark:text-purple-400/80 space-y-1">
                  <li>• Qualificação automática de leads</li>
                  <li>• Responde perguntas frequentes</li>
                  <li>• Transfere para humano quando necessário</li>
                  <li>• Move leads entre estágios automaticamente</li>
                </ul>
              </motion.div>
            )}

            {formData.ia_mode === 'enterprise' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20"
              >
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Sobre o modo Enterprise
                </h4>
                <ul className="text-sm text-blue-700/80 dark:text-blue-400/80 space-y-1">
                  <li>• Todas as features do IA SDR</li>
                  <li>• Workflows personalizados avançados</li>
                  <li>• Integração com sistemas externos</li>
                  <li>• Análise de sentimento e priorização</li>
                </ul>
              </motion.div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-muted/30">
            <Button variant="outline" onClick={() => setIsIaModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateIaMode} disabled={updateIaMode.isPending}>
              {updateIaMode.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Excluir Canal
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o canal{' '}
              <strong>{selectedChannel?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 bg-destructive/10 rounded-lg text-destructive">
              <p className="text-sm">
                Esta ação não pode ser desfeita. Canais com leads ou tickets vinculados não podem
                ser excluídos.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChannel}
              disabled={deleteChannel.isPending}
            >
              {deleteChannel.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal for Internal WhatsApp */}
      {qrChannel && (
        <QRCodeModal
          channel={qrChannel}
          isOpen={isQRModalOpen}
          onClose={() => {
            setIsQRModalOpen(false)
            setQrChannel(null)
          }}
        />
      )}
    </div>
  )
}

