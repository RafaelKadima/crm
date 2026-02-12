import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  MessageSquare,
  Phone,
  CheckCircle,
  Settings,
  Loader2,
  User,
  Building2,
  AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { useMetaIntegrations, type MetaIntegration } from '@/hooks/useMetaIntegrations'
import { WhatsAppProfileEditor } from '@/components/integrations/WhatsAppProfileEditor'
import { Badge } from '@/components/ui/Badge'

export function WhatsAppProfilePage() {
  const { t } = useTranslation()
  const { data: integrations, isLoading } = useMetaIntegrations()
  const [editProfileId, setEditProfileId] = useState<string | null>(null)

  const activeIntegrations = integrations?.filter(i => i.status === 'active') || []

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
        ) : activeIntegrations.length === 0 ? (
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
            {activeIntegrations.map((integration, index) => (
              <motion.div
                key={integration.id}
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
                        {integration.display_phone_number || integration.phone_number_id}
                      </h3>
                      {integration.verified_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          {integration.verified_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="success" className="flex-shrink-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {t('common.active', 'Ativo')}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>ID: {integration.phone_number_id}</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {t('whatsappProfile.editDescription', 'Edite foto, descricao, endereco e outras informacoes do perfil comercial.')}
                  </p>
                </div>

                {/* Action */}
                <div className="p-4 border-t border-border">
                  <button
                    onClick={() => setEditProfileId(integration.id)}
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
    </div>
  )
}

export default WhatsAppProfilePage
