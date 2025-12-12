import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Building2, Users, Plug, Bell, Palette, Paintbrush, Zap } from 'lucide-react'
import { CompanySettingsPage } from './CompanySettingsPage'
import { TeamSettingsPage } from './TeamSettingsPage'
import { IntegrationsSettingsPage } from './IntegrationsSettingsPage'
import { NotificationsSettingsPage } from './NotificationsSettingsPage'
import { AppearanceSettingsPage } from './AppearanceSettingsPage'
import { BrandingSettingsPage } from './BrandingSettingsPage'
import { ProfileSettingsPage } from './ProfileSettingsPage'
import { AiUsageDashboard } from './AiUsageDashboard'

type SettingsTab = 'profile' | 'company' | 'team' | 'integrations' | 'notifications' | 'appearance' | 'branding' | 'ai-usage'

const settingsSections = [
  { icon: User, title: 'Perfil', description: 'Suas informações pessoais', tab: 'profile' as SettingsTab },
  { icon: Building2, title: 'Empresa', description: 'Dados da empresa', tab: 'company' as SettingsTab },
  { icon: Paintbrush, title: 'Identidade Visual', description: 'Logo, cores e marca', tab: 'branding' as SettingsTab },
  { icon: Zap, title: 'Uso de IA', description: 'Unidades e pacotes', tab: 'ai-usage' as SettingsTab },
  { icon: Users, title: 'Equipe', description: 'Gerenciar usuários', tab: 'team' as SettingsTab },
  { icon: Plug, title: 'Integrações', description: 'Conectar serviços', tab: 'integrations' as SettingsTab },
  { icon: Bell, title: 'Notificações', description: 'Preferências de alertas', tab: 'notifications' as SettingsTab },
  { icon: Palette, title: 'Aparência', description: 'Tema e personalização', tab: 'appearance' as SettingsTab },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências
        </p>
      </div>

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
          {activeTab === 'ai-usage' && <AiUsageDashboard />}
          {activeTab === 'team' && <TeamSettingsPage />}
          {activeTab === 'integrations' && <IntegrationsSettingsPage />}
          {activeTab === 'notifications' && <NotificationsSettingsPage />}
          {activeTab === 'appearance' && <AppearanceSettingsPage />}
        </motion.div>
      </div>
    </div>
  )
}
