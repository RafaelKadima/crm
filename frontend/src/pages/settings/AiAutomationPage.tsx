import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Zap,
  BookOpen,
  CreditCard,
  Shield,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Componentes das páginas existentes
import { AiUsageDashboard } from './AiUsageDashboard'

// Lazy imports para as páginas de ads
import AdsGuardrails from '@/pages/ads/AdsGuardrails'
import AdsKnowledgeBase from '@/pages/ads/AdsKnowledgeBase'
import AdsAccounts from '@/pages/ads/AdsAccounts'

type TabId = 'usage' | 'guardrails' | 'knowledge' | 'accounts'

interface Tab {
  id: TabId
  label: string
  icon: React.ElementType
  description: string
  color: string
}

const tabs: Tab[] = [
  {
    id: 'usage',
    label: 'Uso de IA',
    icon: BarChart3,
    description: 'Unidades e consumo',
    color: 'text-blue-500',
  },
  {
    id: 'guardrails',
    label: 'Guardrails',
    icon: Shield,
    description: 'Limites e seguranca',
    color: 'text-amber-500',
  },
  {
    id: 'knowledge',
    label: 'Base de Conhecimento',
    icon: BookOpen,
    description: 'Documentos para IA',
    color: 'text-purple-500',
  },
  {
    id: 'accounts',
    label: 'Contas de Anuncio',
    icon: CreditCard,
    description: 'Meta Ads, Google Ads',
    color: 'text-green-500',
  },
]

// Wrapper para remover headers duplicados
function GuardrailsWrapper() {
  return (
    <div className="[&>div>div:first-child]:hidden [&>div]:min-h-0">
      <AdsGuardrails />
    </div>
  )
}

function KnowledgeWrapper() {
  return (
    <div className="[&>div>div:first-child]:hidden [&>div]:min-h-0">
      <AdsKnowledgeBase />
    </div>
  )
}

function AccountsWrapper() {
  return (
    <div className="[&>div>div:first-child]:hidden [&>div]:min-h-0">
      <AdsAccounts />
    </div>
  )
}

export function AiAutomationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('usage')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-primary" />
          IA & Automacao
        </h2>
        <p className="text-muted-foreground mt-1">
          Gerencie o uso de IA, limites de seguranca e bases de conhecimento
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
              <span>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeAiTabIndicator"
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
          {activeTab === 'usage' && <AiUsageDashboard />}
          {activeTab === 'guardrails' && <GuardrailsWrapper />}
          {activeTab === 'knowledge' && <KnowledgeWrapper />}
          {activeTab === 'accounts' && <AccountsWrapper />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default AiAutomationPage
