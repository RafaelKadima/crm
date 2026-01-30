import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Star,
  Gift,
  Settings,
  Users,
  Medal,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { TiersManagement } from './TiersManagement'
import { PointRulesManagement } from './PointRulesManagement'
import { RewardsManagement } from './RewardsManagement'
import { AchievementsManagement } from './AchievementsManagement'
import { GamificationSettingsTab } from './GamificationSettingsTab'
import { UserRewardsManagement } from './UserRewardsManagement'

type GamificationTab = 'tiers' | 'points' | 'rewards' | 'achievements' | 'settings' | 'claims'

const tabs = [
  { id: 'tiers' as GamificationTab, icon: Trophy, title: 'Níveis (Tiers)', description: 'Bronze, Prata, Ouro...' },
  { id: 'points' as GamificationTab, icon: Star, title: 'Regras de Pontos', description: 'Pontos por ação' },
  { id: 'rewards' as GamificationTab, icon: Gift, title: 'Recompensas', description: 'Prêmios por tier' },
  { id: 'achievements' as GamificationTab, icon: Medal, title: 'Conquistas', description: 'Badges e achievements' },
  { id: 'claims' as GamificationTab, icon: Users, title: 'Resgates', description: 'Aprovar prêmios' },
  { id: 'settings' as GamificationTab, icon: Settings, title: 'Configurações', description: 'Ajustes gerais' },
]

export function GamificationAdminPage() {
  const [activeTab, setActiveTab] = useState<GamificationTab>('tiers')

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Gamificação"
        subtitle="Configure níveis, pontos, recompensas e conquistas para motivar sua equipe"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegação */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                tab.id === activeTab
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted cursor-pointer'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">{tab.title}</p>
                <p className={`text-xs ${tab.id === activeTab ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {tab.description}
                </p>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Conteúdo */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3"
        >
          {activeTab === 'tiers' && <TiersManagement />}
          {activeTab === 'points' && <PointRulesManagement />}
          {activeTab === 'rewards' && <RewardsManagement />}
          {activeTab === 'achievements' && <AchievementsManagement />}
          {activeTab === 'claims' && <UserRewardsManagement />}
          {activeTab === 'settings' && <GamificationSettingsTab />}
        </motion.div>
      </div>
    </div>
  )
}
