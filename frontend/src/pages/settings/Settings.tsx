import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { motion } from 'framer-motion'
import { User, Building2, Users, Bell, Palette, Paintbrush, Trophy, CalendarClock, MessageSquare, Bot, BarChart3 } from 'lucide-react'
import { CompanySettingsPage } from './CompanySettingsPage'
import { TeamSettingsPage } from './TeamSettingsPage'
import { NotificationsSettingsPage } from './NotificationsSettingsPage'
import { AppearanceSettingsPage } from './AppearanceSettingsPage'
import { BrandingSettingsPage } from './BrandingSettingsPage'
import { ProfileSettingsPage } from './ProfileSettingsPage'
import { ActivitiesDashboard } from './ActivitiesDashboard'
import { ChannelsIntegrationsPage } from './ChannelsIntegrationsPage'
import { AiAutomationPage } from './AiAutomationPage'
import { GamificationAdminPage } from '@/pages/gamification'
import { GtmSettingsPage } from './GtmSettingsPage'

type SettingsTab = 'profile' | 'company' | 'team' | 'notifications' | 'appearance' | 'branding' | 'gamification' | 'activities' | 'channels' | 'ai-automation' | 'gtm'

export function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const settingsSections = [
    { icon: User, title: t('settings.profile'), description: t('settings.profileDesc'), tab: 'profile' as SettingsTab },
    { icon: Building2, title: t('settings.company'), description: t('settings.companyDesc'), tab: 'company' as SettingsTab },
    { icon: Paintbrush, title: t('settings.branding'), description: t('settings.brandingDesc'), tab: 'branding' as SettingsTab },
    { icon: MessageSquare, title: t('settings.channelsIntegrations'), description: t('settings.channelsIntegrationsDesc'), tab: 'channels' as SettingsTab },
    { icon: Bot, title: t('settings.aiAutomation'), description: t('settings.aiAutomationDesc'), tab: 'ai-automation' as SettingsTab },
    { icon: BarChart3, title: t('settings.gtm'), description: t('settings.gtmDesc'), tab: 'gtm' as SettingsTab },
    { icon: CalendarClock, title: t('settings.activities'), description: t('settings.activitiesDesc'), tab: 'activities' as SettingsTab },
    { icon: Trophy, title: t('settings.gamification'), description: t('settings.gamificationDesc'), tab: 'gamification' as SettingsTab },
    { icon: Users, title: t('settings.team'), description: t('settings.teamDesc'), tab: 'team' as SettingsTab },
    { icon: Bell, title: t('settings.notifications'), description: t('settings.notificationsDesc'), tab: 'notifications' as SettingsTab },
    { icon: Palette, title: t('settings.appearance'), description: t('settings.appearanceDesc'), tab: 'appearance' as SettingsTab },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegação */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-2"
        >
          {settingsSections.map((section) => (
            <button
              key={section.title}
              onClick={() => section.tab && setActiveTab(section.tab)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                section.tab === activeTab
                  ? 'bg-primary text-primary-foreground'
                  : section.tab
                  ? 'hover:bg-muted cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              disabled={!section.tab}
            >
              <section.icon className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm">{section.title}</p>
                <p className={`text-xs ${section.tab === activeTab ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {section.description}
                </p>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Conteúdo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3"
        >
          {activeTab === 'profile' && <ProfileSettingsPage />}
          {activeTab === 'company' && <CompanySettingsPage />}
          {activeTab === 'branding' && <BrandingSettingsPage />}
          {activeTab === 'channels' && <ChannelsIntegrationsPage />}
          {activeTab === 'ai-automation' && <AiAutomationPage />}
          {activeTab === 'gtm' && <GtmSettingsPage />}
          {activeTab === 'activities' && <ActivitiesDashboard />}
          {activeTab === 'gamification' && <GamificationAdminPage />}
          {activeTab === 'team' && <TeamSettingsPage />}
          {activeTab === 'notifications' && <NotificationsSettingsPage />}
          {activeTab === 'appearance' && <AppearanceSettingsPage />}
        </motion.div>
      </div>
    </div>
  )
}
