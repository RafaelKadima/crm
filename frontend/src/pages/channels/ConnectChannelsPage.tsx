import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Instagram,
  Globe,
  QrCode,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  Shield,
  Wifi,
  WifiOff,
  Settings,
  Trash2,
  RefreshCw,
  Clock,
  AlertTriangle,
  ExternalLink,
  Bot,
  ArrowRight,
  Smartphone,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import {
  useMetaStatus,
  useMetaIntegrations,
  useDisconnectMeta,
  useRefreshMetaToken,
  type MetaIntegration,
} from '@/hooks/useMetaIntegrations'
import {
  useFacebookSDK,
  useMetaEmbeddedSignup,
} from '@/hooks/useMetaEmbeddedSignup'
import {
  useChannels,
  useDeleteChannel,
  useToggleChannelActive,
  channelTypeInfo,
  type Channel,
} from '@/hooks/useChannels'
import { QRCodeModal } from '@/components/channels/QRCodeModal'
import { Link } from 'react-router-dom'

interface ChannelType {
  id: string
  name: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  available: boolean
}

export function ConnectChannelsPage() {
  const { t } = useTranslation()

  const channelTypes: ChannelType[] = [
    {
      id: 'whatsapp-meta',
      name: 'WhatsApp Business',
      description: t('channels.whatsappMetaDesc'),
      icon: MessageSquare,
      color: 'text-green-500',
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500/30',
      available: true,
    },
    {
      id: 'whatsapp-internal',
      name: 'WhatsApp (QR Code)',
      description: t('channels.whatsappQrDesc'),
      icon: QrCode,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500/30',
      available: true,
    },
    {
      id: 'instagram',
      name: 'Instagram Direct',
      description: t('channels.instagramDesc'),
      icon: Instagram,
      color: 'text-pink-500',
      bgColor: 'bg-gradient-to-br from-purple-500 to-pink-500',
      borderColor: 'border-pink-500/30',
      available: false,
    },
    {
      id: 'webchat',
      name: 'Webchat',
      description: t('channels.webchatDesc'),
      icon: Globe,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500/30',
      available: false,
    },
  ]
  const [qrChannel, setQrChannel] = useState<Channel | null>(null)
  const [isQRModalOpen, setIsQRModalOpen] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null)
  const [coexistenceMode, setCoexistenceMode] = useState(false)

  // Meta hooks
  const { data: metaStatus, isLoading: loadingStatus } = useMetaStatus()
  const { data: metaIntegrations, isLoading: loadingIntegrations } = useMetaIntegrations()
  const disconnectMutation = useDisconnectMeta()
  const refreshTokenMutation = useRefreshMetaToken()

  // Channel hooks
  const { data: channels = [], isLoading: loadingChannels } = useChannels()
  const deleteChannel = useDeleteChannel()
  const toggleActive = useToggleChannelActive()

  // Embedded Signup
  const appId = metaStatus?.app_id || ''
  const configId = metaStatus?.config_id || ''
  const isEmbeddedSignupConfigured = metaStatus?.embedded_signup_configured || false

  const { isLoaded: isSDKLoaded } = useFacebookSDK(appId)
  const { startEmbeddedSignup, isProcessing: isEmbeddedProcessing } = useMetaEmbeddedSignup()

  // Handlers
  const handleConnectWhatsApp = () => {
    if (!isEmbeddedSignupConfigured) {
      toast.error(t('channels.embeddedSignupNotConfigured'))
      return
    }

    if (!isSDKLoaded) {
      toast.error(t('channels.waitingFacebookSdk'))
      return
    }

    startEmbeddedSignup({
      appId,
      configId,
      featureType: coexistenceMode ? 'whatsapp_business_app_onboarding' : '',
    })
  }

  const handleConnectQR = () => {
    // Para QR, precisamos de um canal interno criado primeiro
    // Navegar para a página de canais para criar um canal interno
    toast.info(t('channels.qrCodeInstructions'))
  }

  const handleDisconnectMeta = async (id: string) => {
    try {
      await disconnectMutation.mutateAsync(id)
      toast.success(t('channels.integrationDisconnected'))
      setConfirmDisconnect(null)
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('channels.errorDisconnecting'))
    }
  }

  const handleRefreshToken = async (id: string) => {
    try {
      await refreshTokenMutation.mutateAsync(id)
      toast.success(t('channels.tokenRefreshed'))
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('channels.errorRefreshingToken'))
    }
  }

  const handleToggleChannel = async (channel: Channel) => {
    try {
      await toggleActive.mutateAsync(channel.id)
    } catch (error) {
      toast.error(t('channels.errorChangingStatus'))
    }
  }

  const handleDeleteChannel = async (channel: Channel) => {
    if (!confirm(t('channels.confirmDeleteChannel', { name: channel.name }))) return
    try {
      await deleteChannel.mutateAsync(channel.id)
      toast.success(t('channels.channelDeleted'))
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('channels.errorDeletingChannel'))
    }
  }

  const getStatusBadge = (integration: MetaIntegration) => {
    if (integration.status === 'active') {
      if (integration.is_expiring_soon) {
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {t('channels.status.expiresIn', { days: integration.days_until_expiration })}
          </Badge>
        )
      }
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {t('channels.status.active')}
        </Badge>
      )
    }
    if (integration.status === 'expired') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          {t('channels.status.expired')}
        </Badge>
      )
    }
    if (integration.status === 'reauth_required') {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {t('channels.status.reauth')}
        </Badge>
      )
    }
    return null
  }

  const isLoading = loadingStatus || loadingIntegrations || loadingChannels
  const whatsappChannels = channels.filter((c) => c.type === 'whatsapp')
  const internalChannels = whatsappChannels.filter((c) => c.provider_type === 'internal')
  const metaChannels = whatsappChannels.filter((c) => c.provider_type === 'meta')
  const hasConnectedChannels = whatsappChannels.length > 0 || (metaIntegrations && metaIntegrations.length > 0)

  return (
    <div className="space-y-8">
      <PageHeader
        title={t('channels.connectChannels')}
        subtitle={t('channels.connectSubtitle')}
        actions={
          <Link to="/channels">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              {t('channels.manageChannels')}
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Coexistence Toggle */}
          {isEmbeddedSignupConfigured && (
            <div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">{t('channels.coexistenceMode')}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-6">
                    {t('channels.coexistenceModeDesc')}
                  </p>
                </div>
                <Switch
                  checked={coexistenceMode}
                  onCheckedChange={setCoexistenceMode}
                />
              </div>
              {coexistenceMode && (
                <div className="mt-2 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-300 space-y-1">
                      <p>{t('channels.coexistenceInfo1')}</p>
                      <p>{t('channels.coexistenceInfo2')}</p>
                      <p>{t('channels.coexistenceInfo3')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Canal Types Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('channels.addNewChannel')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {channelTypes.map((type, index) => (
                <motion.div
                  key={type.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`relative overflow-hidden transition-all hover:shadow-lg ${
                      type.available
                        ? 'cursor-pointer hover:border-primary/50'
                        : 'opacity-60'
                    } ${type.borderColor}`}
                    onClick={() => {
                      if (!type.available) return
                      if (type.id === 'whatsapp-meta') handleConnectWhatsApp()
                      if (type.id === 'whatsapp-internal') handleConnectQR()
                    }}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 ${type.bgColor}`} />
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className={`p-4 rounded-2xl ${type.bgColor} text-white`}>
                          <type.icon className="h-7 w-7" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-base">{type.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {type.description}
                          </p>
                        </div>
                        {type.available ? (
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={
                              (type.id === 'whatsapp-meta' && isEmbeddedProcessing) ||
                              (type.id === 'whatsapp-meta' && !isEmbeddedSignupConfigured)
                            }
                          >
                            {type.id === 'whatsapp-meta' && isEmbeddedProcessing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {t('common.processing')}
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                {t('channels.connect')}
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="w-full justify-center py-1.5">
                            {t('common.comingSoon')}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Meta Status Warning */}
          {!isEmbeddedSignupConfigured && metaStatus?.oauth_configured && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {t('channels.embeddedSignupNotConfiguredTitle')}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  {t('channels.embeddedSignupNotConfiguredMessage')}
                </p>
              </div>
            </div>
          )}

          {!metaStatus?.oauth_configured && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {t('channels.metaCredentialsNotConfigured')}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  {t('channels.metaCredentialsMessage')}{' '}
                  <a
                    href="https://developers.facebook.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1"
                  >
                    {t('channels.createMetaApp')} <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Connected Channels Section */}
          {hasConnectedChannels && (
            <div>
              <h3 className="text-lg font-semibold mb-4">{t('channels.connectedChannels')}</h3>
              <div className="space-y-3">
                {/* Meta Integrations */}
                {metaIntegrations && metaIntegrations.map((integration) => {
                  const linkedChannel = metaChannels.find(
                    (c) => c.config?.phone_number_id === integration.phone_number_id
                  )

                  return (
                    <motion.div
                      key={integration.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500 text-white">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">
                              {integration.verified_name || integration.display_phone_number || 'WhatsApp Business'}
                            </span>
                            {getStatusBadge(integration)}
                            <Badge variant="outline" className="text-xs">
                              Meta Cloud API
                            </Badge>
                            {integration.is_coexistence && (
                              <Badge variant="outline" className="flex items-center gap-1 text-xs text-blue-400 border-blue-400/30">
                                <Smartphone className="w-3 h-3" />
                                {t('channels.coexistence')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            {integration.display_phone_number && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {integration.display_phone_number}
                              </span>
                            )}
                            {integration.verified_name && (
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {integration.verified_name}
                              </span>
                            )}
                          </div>
                          {linkedChannel && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {t('channels.channel')}: {linkedChannel.name}
                              </Badge>
                              {linkedChannel.ia_mode !== 'none' && (
                                <Badge className="text-xs bg-purple-500 text-white">
                                  <Bot className="h-3 w-3 mr-1" />
                                  IA {linkedChannel.ia_mode === 'ia_sdr' ? 'SDR' : 'Enterprise'}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {linkedChannel && (
                          <Link to="/channels">
                            <Button variant="ghost" size="sm" title="Configurar canal">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}

                        {(integration.is_expiring_soon || integration.needs_reauth) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefreshToken(integration.id)}
                            disabled={refreshTokenMutation.isPending}
                            title="Renovar token"
                          >
                            {refreshTokenMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 text-amber-500" />
                            )}
                          </Button>
                        )}

                        {confirmDisconnect === integration.id ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDisconnectMeta(integration.id)}
                              disabled={disconnectMutation.isPending}
                            >
                              {disconnectMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                t('common.confirm')
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDisconnect(null)}
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDisconnect(integration.id)}
                            className="text-destructive hover:text-destructive"
                            title={t('channels.disconnect')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )
                })}

                {/* Internal WhatsApp Channels */}
                {internalChannels.map((channel) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-orange-500 text-white">
                        <QrCode className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{channel.name}</span>
                          {channel.is_active ? (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {t('channels.status.active')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{t('channels.status.inactive')}</Badge>
                          )}
                          <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                            QR Code
                          </Badge>
                          {channel.config?.internal_connected ? (
                            <Badge className="bg-green-500 text-white text-xs">
                              <Wifi className="h-3 w-3 mr-1" />
                              {t('channels.status.connected')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <WifiOff className="h-3 w-3 mr-1" />
                              {t('channels.status.disconnected')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {channel.identifier}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setQrChannel(channel)
                          setIsQRModalOpen(true)
                        }}
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        {channel.config?.internal_connected ? t('channels.reconnect') : t('channels.connect')}
                      </Button>
                      <Link to="/channels">
                        <Button variant="ghost" size="sm" title={t('channels.configure')}>
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleChannel(channel)}
                        title={channel.is_active ? t('channels.deactivate') : t('channels.activate')}
                        className={channel.is_active ? 'text-green-500' : 'text-muted-foreground'}
                      >
                        {channel.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      </Button>
                    </div>
                  </motion.div>
                ))}

                {/* Meta channels without integration (orphaned) */}
                {metaChannels
                  .filter((c) => !metaIntegrations?.some((i) => i.phone_number_id === c.config?.phone_number_id))
                  .map((channel) => (
                    <motion.div
                      key={channel.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:border-border/80 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-green-500 text-white">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{channel.name}</span>
                            {channel.is_active ? (
                              <Badge variant="success" className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {t('channels.status.active')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">{t('channels.status.inactive')}</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              Meta Cloud API
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {channel.identifier}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to="/channels">
                          <Button variant="ghost" size="sm" title={t('channels.configure')}>
                            <Settings className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!hasConnectedChannels && (
            <div className="text-center py-12">
              <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{t('channels.noChannelConnected')}</h3>
              <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                {t('channels.connectFirstChannel')}
              </p>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/channels"
              className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="font-medium">{t('channels.manageChannels')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('channels.manageChannelsDesc')}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/whatsapp-templates"
              className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <p className="font-medium">{t('channels.whatsappTemplates')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('channels.whatsappTemplatesDesc')}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </>
      )}

      {/* QR Code Modal */}
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
