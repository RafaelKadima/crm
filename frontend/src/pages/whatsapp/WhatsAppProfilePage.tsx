import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Phone,
  CheckCircle,
  Settings,
  Loader2,
  Building2,
  AlertTriangle,
  Smartphone,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMetaIntegrations } from '@/hooks/useMetaIntegrations'
import { useChannels } from '@/hooks/useChannels'
import { WhatsAppProfileEditor } from '@/components/integrations/WhatsAppProfileEditor'
import { ChannelWhatsAppProfileEditor } from '@/components/integrations/ChannelWhatsAppProfileEditor'
import { Badge } from '@/components/ui/Badge'

// Tipo unificado para exibição
interface WhatsAppNumber {
  id: string
  type: 'meta_integration' | 'channel'
  phoneNumber: string
  name: string | null
  status: string
  isActive: boolean
}

export function WhatsAppProfilePage() {
  const { t } = useTranslation()
  const { data: metaIntegrations, isLoading: loadingMeta } = useMetaIntegrations()
  const { data: channels, isLoading: loadingChannels } = useChannels()

  const [editingItem, setEditingItem] = useState<WhatsAppNumber | null>(null)

  // Combinar meta_integrations ativas
  const metaNumbers: WhatsAppNumber[] = (metaIntegrations || [])
    .filter(i => i.status === 'active')
    .map(i => ({
      id: i.id,
      type: 'meta_integration' as const,
      phoneNumber: i.display_phone_number || i.phone_number_id,
      name: i.verified_name,
      status: i.status,
      isActive: true,
    }))

  // Combinar canais WhatsApp ativos com provider_type = 'meta' e que tenham access_token
  const channelNumbers: WhatsAppNumber[] = (channels || [])
    .filter(c => c.type === 'whatsapp' && c.is_active && c.config?.access_token)
    .map(c => ({
      id: c.id,
      type: 'channel' as const,
      phoneNumber: c.identifier || c.config?.phone_number_id || c.name,
      name: c.name,
      status: c.is_active ? 'active' : 'inactive',
      isActive: c.is_active,
    }))

  // Combinar ambas as fontes
  const allNumbers = [...metaNumbers, ...channelNumbers]

  const isLoading = loadingMeta || loadingChannels

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t('whatsappProfile.title', 'Perfil do WhatsApp Business')}
        description={t('whatsappProfile.description', 'Gerencie as informacoes do seu perfil comercial no WhatsApp')}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : allNumbers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="p-4 rounded-full bg-yellow-500/10 mb-4">
              <AlertTriangle className="w-12 h-12 text-yellow-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t('whatsappProfile.noIntegrations', 'Nenhum WhatsApp conectado')}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {t('whatsappProfile.noIntegrationsDesc', 'Conecte um numero WhatsApp Business para poder editar o perfil da sua empresa.')}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allNumbers.map((item, index) => (
              <motion.div
                key={`${item.type}-${item.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl border border-border overflow-hidden hover:border-green-500/50 transition-colors"
              >
                {/* Header */}
                <div className="p-4 border-b border-border bg-green-500/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {item.phoneNumber}
                      </h3>
                      {item.name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          {item.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge variant="success" className="flex-shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {t('common.active', 'Ativo')}
                      </Badge>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {item.type === 'meta_integration' ? (
                          <>
                            <Smartphone className="w-3 h-3 mr-1" />
                            Embedded
                          </>
                        ) : (
                          <>
                            <Phone className="w-3 h-3 mr-1" />
                            Canal
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {t('whatsappProfile.editDescription', 'Edite foto, descricao, endereco e outras informacoes do perfil comercial.')}
                  </p>
                </div>

                {/* Action */}
                <div className="p-4 border-t border-border">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
                  >
                    <Settings className="w-4 h-4" />
                    {t('whatsappProfile.editProfile', 'Editar Perfil')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Editor Modal - Meta Integration */}
      {editingItem?.type === 'meta_integration' && (
        <WhatsAppProfileEditor
          integrationId={editingItem.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null)
          }}
        />
      )}

      {/* Profile Editor Modal - Channel */}
      {editingItem?.type === 'channel' && (
        <ChannelWhatsAppProfileEditor
          channelId={editingItem.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}

export default WhatsAppProfilePage
