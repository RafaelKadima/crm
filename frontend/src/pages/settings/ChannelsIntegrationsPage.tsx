import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Instagram,
  LayoutGrid,
  FileText,
  Plug,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Componentes das páginas existentes
import { ChannelsPage } from '@/pages/channels/Channels'
import { QueuesPage } from '@/pages/queues/QueuesPage'
import { WhatsAppTemplatesPage } from '@/pages/whatsapp-templates/WhatsAppTemplatesPage'
import { IntegrationsSettingsPage } from './IntegrationsSettingsPage'

type TabId = 'whatsapp' | 'instagram' | 'queues' | 'templates' | 'integrations'

interface Tab {
  id: TabId
  labelKey: string
  icon: React.ElementType
  descKey: string
  color: string
}

const tabs: Tab[] = [
  {
    id: 'whatsapp',
    labelKey: 'channelsIntegrations.tabs.whatsapp',
    icon: MessageSquare,
    descKey: 'channelsIntegrations.tabs.whatsappDesc',
    color: 'text-green-500',
  },
  {
    id: 'instagram',
    labelKey: 'channelsIntegrations.tabs.instagram',
    icon: Instagram,
    descKey: 'channelsIntegrations.tabs.instagramDesc',
    color: 'text-pink-500',
  },
  {
    id: 'queues',
    labelKey: 'channelsIntegrations.tabs.queues',
    icon: LayoutGrid,
    descKey: 'channelsIntegrations.tabs.queuesDesc',
    color: 'text-blue-500',
  },
  {
    id: 'templates',
    labelKey: 'channelsIntegrations.tabs.templates',
    icon: FileText,
    descKey: 'channelsIntegrations.tabs.templatesDesc',
    color: 'text-purple-500',
  },
  {
    id: 'integrations',
    labelKey: 'channelsIntegrations.tabs.integrations',
    icon: Plug,
    descKey: 'channelsIntegrations.tabs.integrationsDesc',
    color: 'text-orange-500',
  },
]

// Wrapper para filtrar canais por tipo
function ChannelsFiltered({ type }: { type: 'whatsapp' | 'instagram' }) {
  const { t } = useTranslation()
  const typeLabel = type === 'whatsapp' ? 'WhatsApp Business' : 'Instagram Direct'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
        {type === 'whatsapp' ? (
          <MessageSquare className="h-5 w-5 text-green-500" />
        ) : (
          <Instagram className="h-5 w-5 text-pink-500" />
        )}
        <span className="text-sm text-muted-foreground">
          {t('channelsIntegrations.channelTypeInfo', { type: typeLabel })}
        </span>
      </div>
      <ChannelsPage />
    </div>
  )
}

// Wrapper para a página de templates (remove o bg e padding externos)
function TemplatesWrapper() {
  return (
    <div className="[&>div]:min-h-0 [&>div]:bg-transparent [&>div>div]:px-0 [&>div>div]:py-0">
      <WhatsAppTemplatesPage />
    </div>
  )
}

// Wrapper para a página de integrações (remove o header duplicado)
function IntegrationsWrapper() {
  return (
    <div className="[&>div>div:first-child]:hidden">
      <IntegrationsSettingsPage />
    </div>
  )
}

export function ChannelsIntegrationsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('whatsapp')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plug className="w-6 h-6 text-primary" />
          {t('channelsIntegrations.title')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('channelsIntegrations.subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              <tab.icon className={cn('h-4 w-4', isActive && tab.color)} />
              <span>{t(tab.labelKey)}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm -z-10"
                  transition={{ type: 'spring', duration: 0.3 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'whatsapp' && <ChannelsFiltered type="whatsapp" />}
          {activeTab === 'instagram' && <ChannelsFiltered type="instagram" />}
          {activeTab === 'queues' && <QueuesPage />}
          {activeTab === 'templates' && <TemplatesWrapper />}
          {activeTab === 'integrations' && <IntegrationsWrapper />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default ChannelsIntegrationsPage
