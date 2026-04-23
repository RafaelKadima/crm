import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
    { icon: User,          title: t('settings.profile'),               description: t('settings.profileDesc'),              tab: 'profile' as SettingsTab },
    { icon: Building2,     title: t('settings.company'),               description: t('settings.companyDesc'),              tab: 'company' as SettingsTab },
    { icon: Paintbrush,    title: t('settings.branding'),              description: t('settings.brandingDesc'),             tab: 'branding' as SettingsTab },
    { icon: MessageSquare, title: t('settings.channelsIntegrations'),  description: t('settings.channelsIntegrationsDesc'), tab: 'channels' as SettingsTab },
    { icon: Bot,           title: t('settings.aiAutomation'),          description: t('settings.aiAutomationDesc'),         tab: 'ai-automation' as SettingsTab },
    { icon: BarChart3,     title: t('settings.gtm'),                   description: t('settings.gtmDesc'),                  tab: 'gtm' as SettingsTab },
    { icon: CalendarClock, title: t('settings.activities'),            description: t('settings.activitiesDesc'),           tab: 'activities' as SettingsTab },
    { icon: Trophy,        title: t('settings.gamification'),          description: t('settings.gamificationDesc'),         tab: 'gamification' as SettingsTab },
    { icon: Users,         title: t('settings.team'),                  description: t('settings.teamDesc'),                 tab: 'team' as SettingsTab },
    { icon: Bell,          title: t('settings.notifications'),         description: t('settings.notificationsDesc'),        tab: 'notifications' as SettingsTab },
    { icon: Palette,       title: t('settings.appearance'),            description: t('settings.appearanceDesc'),           tab: 'appearance' as SettingsTab },
  ]

  const activeSection = settingsSections.find((s) => s.tab === activeTab)

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="eyebrow">WORKSPACE · SETTINGS</p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
          {t('settings.title')}
        </h1>
        <p className="mt-2 max-w-[540px] text-[13.5px] text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </motion.div>

      {/* Layout: secondary sidebar + content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Secondary sidebar */}
        <motion.nav
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          aria-label="Settings sections"
          className="space-y-0.5"
        >
          {settingsSections.map((section) => {
            const isActive = section.tab === activeTab
            return (
              <button
                key={section.title}
                onClick={() => section.tab && setActiveTab(section.tab)}
                disabled={!section.tab}
                className="group flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors"
                style={
                  isActive
                    ? { background: 'var(--color-secondary)', color: 'var(--color-foreground)' }
                    : { color: 'var(--color-muted-foreground)' }
                }
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--color-muted)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <section.icon
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={isActive ? 2.15 : 1.75}
                />
                <span className={`text-[13px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {section.title}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="settings-active-dot"
                    className="ml-auto h-1.5 w-1.5 rounded-full"
                    style={{ background: 'var(--color-bold-ink)' }}
                  />
                )}
              </button>
            )
          })}
        </motion.nav>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.21, 0.87, 0.35, 1] }}
          className="min-w-0"
        >
          {activeSection && (
            <div
              className="mb-5 pb-4 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="eyebrow" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('settings.title', { defaultValue: 'CONFIGURAÇÕES' }).toUpperCase()}
              </p>
              <h2 className="mt-1.5 font-display text-[28px] leading-[1.1] tracking-[-0.015em]">
                {activeSection.title}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">{activeSection.description}</p>
            </div>
          )}

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
