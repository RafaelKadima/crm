import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  Kanban,
  MessageSquare,
  CheckSquare,
  BarChart3,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plug,
  Package,
  Globe,
  Radio,
  Bot,
  CalendarDays,
  Clock,
  Shield,
  LayoutGrid,
  Megaphone,
  Headphones,
  TrendingUp,
  FileText,
  Cog,
  BookOpen,
  Home,
  Target,
  Zap,
  Lightbulb,
  ImageIcon,
  PieChart,
  Brain,
  ClipboardCheck,
  FileSpreadsheet,
  Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { useMyFeatures } from '@/hooks/useFeatures'
import { useBranding } from '@/hooks/useBranding'
import { usePermissions } from '@/hooks/usePermissions'
import { OmnifyLogo } from '@/components/OmnifyLogo'

interface NavItem {
  icon: LucideIcon
  label: string
  path: string
  feature?: string
  featureFunction?: string  // Sub-função necessária do módulo (ex: 'ads.dashboard')
  permission?: string  // Ex: 'leads.view_own' ou 'leads.view_all'
  permissions?: string[] // Qualquer uma das permissões
  adminOnly?: boolean
  superAdminOnly?: boolean
}

interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
  defaultOpen?: boolean
}

// Menu organizado por grupos/setores
const navGroups: NavGroup[] = [
  {
    id: 'main',
    label: 'Principal',
    icon: Home,
    defaultOpen: true,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ],
  },
  {
    id: 'support',
    label: 'Atendimento',
    icon: Headphones,
    defaultOpen: true,
    items: [
      { icon: Kanban, label: 'Leads', path: '/leads', permissions: ['leads.view_own', 'leads.view_all'] },
      { icon: MessageSquare, label: 'Tickets', path: '/tickets', permissions: ['tickets.view_own', 'tickets.view_all'] },
      { icon: CalendarDays, label: 'Agendamentos', path: '/appointments', feature: 'appointments', featureFunction: 'appointments.list', permission: 'appointments.view' },
      { icon: Clock, label: 'Minha Agenda', path: '/schedule', feature: 'appointments', featureFunction: 'appointments.schedule', permission: 'appointments.view' },
      { icon: LayoutGrid, label: 'Filas', path: '/queues', adminOnly: true },
      { icon: Radio, label: 'Canais', path: '/channels', permission: 'channels.view' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { icon: Package, label: 'Produtos', path: '/products', feature: 'products', featureFunction: 'products.list', permission: 'products.view' },
      { icon: Globe, label: 'Landing Pages', path: '/landing-pages', feature: 'landing_pages', featureFunction: 'lp.list', permissions: ['landing_pages.view', 'landing_pages.create'] },
      { icon: FileText, label: 'Templates WhatsApp', path: '/whatsapp-templates', permission: 'channels.view' },
      { icon: TrendingUp, label: 'Google Tag Manager', path: '/gtm', adminOnly: true },
    ],
  },
  {
    id: 'ads',
    label: 'Ads Intelligence',
    icon: Target,
    items: [
      { icon: Target, label: 'Dashboard Ads', path: '/ads', feature: 'ads_intelligence', featureFunction: 'ads.dashboard' },
      { icon: Zap, label: '🤖 Criar Campanha (IA)', path: '/ads/agent', feature: 'ads_intelligence', featureFunction: 'ads.create_campaign' },
      { icon: Bot, label: '💬 Chat com Agente', path: '/ads/chat', feature: 'ads_intelligence', featureFunction: 'ads.chat' },
      { icon: ImageIcon, label: '📁 Criativos', path: '/ads/creatives', feature: 'ads_intelligence', featureFunction: 'ads.creatives' },
      { icon: BarChart3, label: 'Campanhas', path: '/ads/campaigns', feature: 'ads_intelligence', featureFunction: 'ads.campaigns' },
      { icon: Lightbulb, label: 'Insights IA', path: '/ads/insights', feature: 'ads_intelligence', featureFunction: 'ads.insights' },
      { icon: Zap, label: 'Automações', path: '/ads/automation', feature: 'ads_intelligence', featureFunction: 'ads.automation' },
      { icon: BookOpen, label: '📚 Base de Conhecimento', path: '/ads/knowledge', feature: 'ads_intelligence', featureFunction: 'ads.knowledge' },
      { icon: Shield, label: '🛡️ Guardrails', path: '/ads/guardrails', feature: 'ads_intelligence', featureFunction: 'ads.guardrails' },
      { icon: Settings, label: 'Contas de Anúncio', path: '/ads/accounts', feature: 'ads_intelligence', featureFunction: 'ads.accounts' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    items: [
      { icon: Users, label: 'Contatos', path: '/contacts', permission: 'contacts.view' },
      { icon: CheckSquare, label: 'Tarefas', path: '/tasks', permissions: ['tasks.view_own', 'tasks.view_all'] },
    ],
  },
  {
    id: 'intelligence',
    label: 'Inteligência',
    icon: Bot,
    items: [
      { icon: Bot, label: 'Agentes IA', path: '/sdr', feature: 'sdr_ia', featureFunction: 'sdr.agents', permission: 'sdr_ia.view' },
      { icon: BarChart3, label: 'Relatórios', path: '/reports', permissions: ['reports.view_own', 'reports.view_all'] },
    ],
  },
  {
    id: 'bi',
    label: 'BI Agent',
    icon: PieChart,
    items: [
      { icon: PieChart, label: 'Dashboard BI', path: '/bi', feature: 'bi_agent', featureFunction: 'bi.dashboard', adminOnly: true },
      { icon: Brain, label: '🤖 Analista IA', path: '/bi/analyst', feature: 'bi_agent', featureFunction: 'bi.analyst', adminOnly: true },
      { icon: ClipboardCheck, label: '📋 Ações Pendentes', path: '/bi/actions', feature: 'bi_agent', featureFunction: 'bi.actions', adminOnly: true },
      { icon: FileSpreadsheet, label: '📊 Relatórios', path: '/bi/reports', feature: 'bi_agent', featureFunction: 'bi.reports', adminOnly: true },
      { icon: Settings2, label: '⚙️ Configurações', path: '/bi/settings', feature: 'bi_agent', featureFunction: 'bi.settings', adminOnly: true },
    ],
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: Cog,
    items: [
      { icon: Plug, label: 'Integrações', path: '/integrations', permission: 'settings.integrations' },
      { icon: Settings, label: 'Configurações', path: '/settings', permission: 'settings.view' },
    ],
  },
  {
    id: 'admin',
    label: 'Administração',
    icon: Shield,
    items: [
      { icon: Building2, label: 'Grupos', path: '/groups', feature: 'groups', featureFunction: 'groups.view', adminOnly: true },
      { icon: Shield, label: 'Super Admin', path: '/super-admin', superAdminOnly: true },
    ],
  },
]

interface NavGroupComponentProps {
  group: NavGroup
  isCollapsed: boolean
  isOpen: boolean
  onToggle: () => void
  filteredItems: NavItem[]
  currentPath: string
  branding: any
}

function NavGroupComponent({
  group,
  isCollapsed,
  isOpen,
  onToggle,
  filteredItems,
  currentPath,
  branding,
}: NavGroupComponentProps) {
  if (filteredItems.length === 0) return null

  const hasActiveItem = filteredItems.some(
    (item) => currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))
  )

  // Se tem apenas 1 item no grupo, renderiza diretamente sem o grupo
  if (filteredItems.length === 1 && group.id === 'main') {
    const item = filteredItems[0]
    const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))

    return (
      <NavLink
        to={item.path}
        className={cn(
          'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300',
          'hover:bg-white/5',
          isActive && 'text-white nav-active'
        )}
      >
        <item.icon className={cn(
          'h-5 w-5 shrink-0 transition-colors',
          isActive ? 'text-white' : 'text-muted-foreground group-hover:text-white/80'
        )} />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className={cn(
                'text-sm font-medium whitespace-nowrap',
                isActive && 'text-white'
              )}
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </NavLink>
    )
  }

  return (
    <div className="mb-1">
      {/* Group Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300',
          'hover:bg-white/5 text-left',
          hasActiveItem && !isCollapsed && 'bg-white/5'
        )}
      >
        <group.icon
          className={cn(
            'h-5 w-5 shrink-0 transition-colors',
            hasActiveItem ? 'text-white' : 'text-muted-foreground'
          )}
        />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <>
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn(
                  'text-sm font-semibold whitespace-nowrap flex-1 font-display tracking-wide',
                  hasActiveItem ? 'text-white' : 'text-foreground/80'
                )}
              >
                {group.label}
              </motion.span>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: isOpen ? 180 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 opacity-60" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </button>

      {/* Group Items */}
      <AnimatePresence initial={false}>
        {(isOpen || isCollapsed) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <ul className={cn(
              'mt-1 space-y-0.5',
              !isCollapsed && 'ml-4 pl-3 border-l border-white/10'
            )}>
              {filteredItems.map((item) => {
                const isActive =
                  currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300',
                        'hover:bg-white/5',
                        isActive && 'text-white nav-active'
                      )}
                    >
                      <item.icon className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-muted-foreground group-hover:text-white/80'
                      )} />
                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className={cn(
                              'text-sm whitespace-nowrap',
                              isActive && 'text-white font-medium'
                            )}
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { tenant, user } = useAuthStore()
  const { data: featuresData, isLoading: featuresLoading } = useMyFeatures()
  const { data: branding } = useBranding()
  const { hasPermission, hasAnyPermission, isAdmin, isSuperAdmin, isLoading: permissionsLoading } = usePermissions()

  // Estado para controlar quais grupos estão abertos
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navGroups.forEach((group) => {
      initial[group.id] = group.defaultOpen ?? false
    })
    return initial
  })

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  // Filtra os itens do menu baseado nas features, sub-funções e permissões
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      // Se é item apenas para super admin
      if (item.superAdminOnly) {
        return user?.is_super_admin || isSuperAdmin || featuresData?.is_super_admin
      }

      // Se é item apenas para admin
      if (item.adminOnly) {
        // Admins ainda precisam verificar features
        const isAdminUser = isAdmin || isSuperAdmin || user?.role === 'admin'
        if (!isAdminUser) return false

        // Verifica feature do tenant para admins
        if (item.feature) {
          if (featuresLoading || !featuresData) return false
          const feature = featuresData.features[item.feature]
          if (!feature?.is_enabled) return false

          // Verifica sub-função se especificada
          if (item.featureFunction) {
            if (feature.all_functions) return true
            if (!feature.enabled_functions?.includes(item.featureFunction)) return false
          }
        }
        return true
      }

      // Super admins vêem tudo (exceto superAdminOnly que já foi verificado)
      if (user?.is_super_admin || isSuperAdmin || featuresData?.is_super_admin) {
        return true
      }

      // Verifica feature do tenant
      if (item.feature) {
        if (featuresLoading || !featuresData) {
          return false
        }
        const feature = featuresData.features[item.feature]
        if (!feature?.is_enabled) {
          return false
        }

        // Verifica sub-função se especificada
        if (item.featureFunction) {
          // Se all_functions = true, tem acesso a tudo
          if (feature.all_functions) {
            // continua para verificar permissões
          } else {
            // Verifica se a sub-função está habilitada
            if (!feature.enabled_functions?.includes(item.featureFunction)) {
              return false
            }
          }
        }
      }

      // Verifica permissão específica
      if (item.permission) {
        if (permissionsLoading) {
          return false
        }
        if (!hasPermission(item.permission)) {
          return false
        }
      }

      // Verifica múltiplas permissões (qualquer uma)
      if (item.permissions && item.permissions.length > 0) {
        if (permissionsLoading) {
          return false
        }
        if (!hasAnyPermission(item.permissions)) {
          return false
        }
      }

      return true
    })
  }

  const companyName = branding?.name || tenant?.name || 'OmniFy HUB'
  const logoUrl = branding?.logo_dark_url || branding?.logo_url

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 280 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col',
        'bg-sidebar sidebar-futuristic'
      )}
      style={{
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Ambient Light Effect */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.02) 0%, transparent 50%)',
        }}
      />

      {/* Logo */}
      <div
        className="relative h-16 flex items-center justify-between px-4 border-b border-white/5"
      >
        <AnimatePresence mode="wait">
          {logoUrl ? (
            // Custom branding logo
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <img src={logoUrl} alt={companyName} className="h-8 object-contain" />
              {!sidebarCollapsed && (
                <span className="font-display font-semibold text-lg tracking-wide">
                  {companyName}
                </span>
              )}
            </motion.div>
          ) : (
            // OmniFy HUB default logo
            <OmnifyLogo
              collapsed={sidebarCollapsed}
              size="md"
              animated={true}
            />
          )}
        </AnimatePresence>

        <button
          onClick={toggleSidebar}
          className={cn(
            'p-2 rounded-lg transition-all duration-300',
            'hover:bg-white/5 hover:text-white',
            'border border-transparent hover:border-white/10'
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Tenant Info */}
      {tenant && !sidebarCollapsed && (
        <div className="relative px-4 py-3 border-b border-white/5">
          <p className="text-xs text-muted-foreground">Empresa</p>
          <p className="text-sm font-medium truncate">{tenant.name}</p>
          {featuresData?.plan_label && (
            <span className={cn(
              'inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-xs font-medium',
              'bg-white/10 text-white/80 border border-white/10'
            )}>
              {featuresData.plan_label}
            </span>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="relative flex-1 py-4 overflow-y-auto scrollbar-thin">
        <div className="px-3 space-y-1">
          {navGroups.map((group) => {
            const filteredItems = filterItems(group.items)

            return (
              <NavGroupComponent
                key={group.id}
                group={group}
                isCollapsed={sidebarCollapsed}
                isOpen={openGroups[group.id]}
                onToggle={() => toggleGroup(group.id)}
                filteredItems={filteredItems}
                currentPath={location.pathname}
                branding={branding?.branding}
              />
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="relative p-4 border-t border-white/5">
        <div className={cn(
          'text-xs font-mono',
          sidebarCollapsed ? 'text-center' : ''
        )}>
          <span className="text-muted-foreground">
            {sidebarCollapsed ? 'v1' : (
              <>
                <span className="text-white">OmniFy</span>
                <span className="text-white/50">HUB</span>
                <span className="text-muted-foreground ml-2">v1.0.0</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Bottom Gradient Line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1), transparent)',
        }}
      />
    </motion.aside>
  )
}
