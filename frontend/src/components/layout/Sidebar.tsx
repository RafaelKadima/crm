import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  Kanban,
  MessageSquare,
  MessageSquareText,
  CheckSquare,
  BarChart3,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  Globe,
  Bot,
  CalendarDays,
  Clock,
  Shield,
  Target,
  Zap,
  Lightbulb,
  ImageIcon,
  PieChart,
  Brain,
  ClipboardCheck,
  Video,
  PlayCircle,
  TrendingUp,
  Trophy,
  History,
  Plug,
  Megaphone,
  FileText,
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
  featureFunction?: string
  permission?: string
  permissions?: string[]
  adminOnly?: boolean
  superAdminOnly?: boolean
  hideOnMobile?: boolean
}

// Navigation entry types
type NavEntry =
  | { type: 'item'; item: NavItem }
  | { type: 'separator' }
  | { type: 'section'; label: string; items: NavItem[] }
  | { type: 'group'; id: string; label: string; icon: LucideIcon; items: NavItem[]; defaultOpen?: boolean }

const navEntries: NavEntry[] = [
  // Dashboard - item direto
  { type: 'item', item: { icon: LayoutDashboard, label: 'nav.dashboard', path: '/' } },

  { type: 'separator' },

  // ATENDIMENTO - section flat
  {
    type: 'section',
    label: 'sidebar.service',
    items: [
      { icon: Kanban, label: 'nav.leads', path: '/leads', permissions: ['leads.view_own', 'leads.view_all'] },
      { icon: MessageSquare, label: 'nav.conversations', path: '/conversas' },
      { icon: Users, label: 'nav.contacts', path: '/contacts', permission: 'contacts.view' },
      { icon: CheckSquare, label: 'nav.tasks', path: '/tasks', permissions: ['tasks.view_own', 'tasks.view_all'] },
      { icon: CalendarDays, label: 'nav.appointments', path: '/appointments', feature: 'appointments', featureFunction: 'appointments.list', permission: 'appointments.view' },
      { icon: Clock, label: 'nav.schedule', path: '/schedule', feature: 'appointments', featureFunction: 'appointments.schedule', permission: 'appointments.view' },
      { icon: MessageSquareText, label: 'nav.quickReplies', path: '/quick-replies' },
    ],
  },

  { type: 'separator' },

  // MARKETING - section flat
  {
    type: 'section',
    label: 'sidebar.marketing',
    items: [
      { icon: Package, label: 'nav.products', path: '/products', feature: 'products', featureFunction: 'products.list', permission: 'products.view' },
      { icon: Globe, label: 'nav.landingPages', path: '/landing-pages', feature: 'landing_pages', featureFunction: 'lp.list', permissions: ['landing_pages.view', 'landing_pages.create'] },
      { icon: FileText, label: 'nav.whatsappTemplates', path: '/whatsapp-templates' },
      { icon: Megaphone, label: 'nav.broadcasts', path: '/broadcasts' },
      { icon: MessageSquare, label: 'nav.whatsappProfile', path: '/whatsapp-profile' },
    ],
  },

  { type: 'separator' },

  // VENDAS - section flat
  {
    type: 'section',
    label: 'sidebar.sales',
    items: [
      { icon: Trophy, label: 'sidebar.goalsKpis', path: '/goals' },
      { icon: BarChart3, label: 'nav.reports', path: '/reports', permissions: ['reports.view_own', 'reports.view_all'] },
    ],
  },

  // GERENCIAL — Suite de Funil (Topo/Meio/Fim)
  {
    type: 'group',
    id: 'managerial',
    label: 'Gerencial',
    icon: PieChart,
    defaultOpen: false,
    items: [
      { icon: TrendingUp, label: 'Relatório Gerencial', path: '/managerial/funnel' },
      { icon: TrendingUp, label: 'Análise de Perdas', path: '/managerial/losses' },
      { icon: Clock, label: 'Velocity', path: '/managerial/velocity' },
      { icon: Target, label: 'Forecast', path: '/managerial/forecast' },
      { icon: PieChart, label: 'Coorte por Canal', path: '/managerial/cohort' },
      { icon: Settings, label: 'Mapeamento do Funil', path: '/managerial/funnel-mapping' },
    ],
  },

  { type: 'separator' },

  // SDR com IA - colapsável
  {
    type: 'group',
    id: 'sdr',
    label: 'sidebar.sdrAI',
    icon: Bot,
    defaultOpen: false,
    items: [
      { icon: Bot, label: 'sidebar.aiAgents', path: '/sdr', feature: 'sdr_ia', featureFunction: 'sdr.agents', permission: 'sdr_ia.view' },
    ],
  },

  // Ads Intelligence - colapsável
  {
    type: 'group',
    id: 'ads',
    label: 'sidebar.adsIntelligence',
    icon: Target,
    defaultOpen: false,
    items: [
      { icon: Target, label: 'nav.dashboard', path: '/ads', feature: 'ads_intelligence', featureFunction: 'ads.dashboard' },
      { icon: Zap, label: 'sidebar.createCampaign', path: '/ads/agent', feature: 'ads_intelligence', featureFunction: 'ads.create_campaign' },
      { icon: Bot, label: 'sidebar.chatWithAgent', path: '/ads/chat', feature: 'ads_intelligence', featureFunction: 'ads.chat' },
      { icon: ImageIcon, label: 'sidebar.creatives', path: '/ads/creatives', feature: 'ads_intelligence', featureFunction: 'ads.creatives' },
      { icon: BarChart3, label: 'sidebar.campaigns', path: '/ads/campaigns', feature: 'ads_intelligence', featureFunction: 'ads.campaigns' },
      { icon: Lightbulb, label: 'sidebar.insights', path: '/ads/insights', feature: 'ads_intelligence', featureFunction: 'ads.insights' },
      { icon: Zap, label: 'sidebar.automations', path: '/ads/automation', feature: 'ads_intelligence', featureFunction: 'ads.automation' },
    ],
  },

  // Criador de Conteúdo - colapsável
  {
    type: 'group',
    id: 'content',
    label: 'sidebar.contentCreator',
    icon: Video,
    defaultOpen: false,
    items: [
      { icon: PlayCircle, label: 'nav.dashboard', path: '/content', feature: 'viral_content', featureFunction: 'viral.dashboard' },
      { icon: Bot, label: 'sidebar.chatWithAgent', path: '/content/chat', feature: 'viral_content', featureFunction: 'viral.generate' },
      { icon: Users, label: 'sidebar.creators', path: '/content/creators', feature: 'viral_content', featureFunction: 'viral.analyze' },
      { icon: TrendingUp, label: 'sidebar.viralSearch', path: '/content/viral-search', feature: 'viral_content', featureFunction: 'viral.auto_discover' },
    ],
  },

  // BI Analytics - colapsável, admin only
  {
    type: 'group',
    id: 'bi',
    label: 'sidebar.biAnalytics',
    icon: PieChart,
    defaultOpen: false,
    items: [
      { icon: PieChart, label: 'nav.dashboard', path: '/bi', feature: 'bi_agent', featureFunction: 'bi.dashboard', adminOnly: true },
      { icon: Brain, label: 'sidebar.aiAnalyst', path: '/bi/analyst', feature: 'bi_agent', featureFunction: 'bi.analyst', adminOnly: true },
      { icon: ClipboardCheck, label: 'sidebar.pendingActions', path: '/bi/actions', feature: 'bi_agent', featureFunction: 'bi.actions', adminOnly: true },
    ],
  },

  { type: 'separator' },

  // Canais - item direto
  { type: 'item', item: { icon: Plug, label: 'nav.channels', path: '/connect-channels' } },

  // Configurações - item direto
  { type: 'item', item: { icon: Settings, label: 'nav.settings', path: '/settings', permission: 'settings.view' } },

  // Administração - colapsável
  {
    type: 'group',
    id: 'admin',
    label: 'sidebar.administration',
    icon: Shield,
    defaultOpen: false,
    items: [
      { icon: Building2, label: 'nav.groups', path: '/groups', feature: 'groups', featureFunction: 'groups.view' },
      { icon: Shield, label: 'sidebar.superAdmin', path: '/super-admin/tenants', superAdminOnly: true },
      { icon: History, label: 'sidebar.supportHistory', path: '/super-admin/support-history', superAdminOnly: true },
    ],
  },
]

// ─── Render Components ─────────────────────────────────────────────

function NavItemLink({
  item,
  isCollapsed,
  currentPath,
}: {
  item: NavItem
  isCollapsed: boolean
  currentPath: string
}) {
  const { t } = useTranslation()
  const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))

  return (
    <NavLink
      to={item.path}
      className={cn(
        'group items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150',
        'hover:bg-muted',
        isActive && 'bg-muted text-foreground',
        item.hideOnMobile ? 'hidden md:flex' : 'flex'
      )}
    >
      <item.icon className={cn(
        'h-[18px] w-[18px] shrink-0 transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
      )} />
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className={cn(
              'text-[13px] whitespace-nowrap',
              isActive ? 'text-foreground font-medium' : 'text-sidebar-foreground'
            )}
          >
            {t(item.label)}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  )
}

function SectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  const { t } = useTranslation()
  if (isCollapsed) return null

  return (
    <div className="px-3 pt-2 pb-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {t(label)}
      </span>
    </div>
  )
}

function SeparatorLine({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={cn('my-2', isCollapsed ? 'mx-3' : 'mx-3')}>
      <div className="h-px bg-border" />
    </div>
  )
}

function CollapsibleGroup({
  id,
  label,
  icon: Icon,
  items,
  isCollapsed,
  isOpen,
  onToggle,
  currentPath,
}: {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
  isCollapsed: boolean
  isOpen: boolean
  onToggle: () => void
  currentPath: string
}) {
  const { t } = useTranslation()
  if (items.length === 0) return null

  const hasActiveItem = items.some(
    (item) => currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))
  )

  // Single item in group - render as direct link
  if (items.length === 1) {
    return (
      <NavItemLink item={items[0]} isCollapsed={isCollapsed} currentPath={currentPath} />
    )
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150',
          'hover:bg-muted text-left cursor-pointer'
        )}
      >
        <Icon className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          hasActiveItem ? 'text-accent' : 'text-muted-foreground'
        )} />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <>
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn(
                  'text-[13px] whitespace-nowrap flex-1',
                  hasActiveItem ? 'text-foreground font-medium' : 'text-sidebar-foreground'
                )}
              >
                {t(label)}
              </motion.span>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: isOpen ? 180 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </button>

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
              'mt-0.5 space-y-0.5',
              !isCollapsed && 'ml-4 pl-3 border-l border-border'
            )}>
              {items.map((item) => (
                <li key={item.path}>
                  <NavItemLink item={item} isCollapsed={isCollapsed} currentPath={currentPath} />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Sidebar ──────────────────────────────────────────────────

export function Sidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const { tenant, user } = useAuthStore()
  const { data: featuresData, isLoading: featuresLoading } = useMyFeatures()
  const { data: branding } = useBranding()
  const { hasPermission, hasAnyPermission, isAdmin, isSuperAdmin, isLoading: permissionsLoading } = usePermissions()

  // State for collapsible groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navEntries.forEach((entry) => {
      if (entry.type === 'group') {
        initial[entry.id] = entry.defaultOpen ?? false
      }
    })
    return initial
  })

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  // Filter items based on features, permissions, roles
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      if (item.superAdminOnly) {
        return user?.is_super_admin || isSuperAdmin || featuresData?.is_super_admin
      }

      if (item.adminOnly) {
        const isAdminUser = isAdmin || isSuperAdmin || user?.role === 'admin'
        if (!isAdminUser) return false

        if (item.feature) {
          if (featuresLoading || !featuresData) return false
          const feature = featuresData.features[item.feature]
          if (!feature?.is_enabled) return false
          if (item.featureFunction) {
            if (feature.all_functions) return true
            if (!feature.enabled_functions?.includes(item.featureFunction)) return false
          }
        }
        return true
      }

      if (user?.is_super_admin || isSuperAdmin || featuresData?.is_super_admin) {
        return true
      }

      if (item.feature) {
        if (featuresLoading || !featuresData) return false
        const feature = featuresData.features[item.feature]
        if (!feature?.is_enabled) return false
        if (item.featureFunction) {
          if (!feature.all_functions && !feature.enabled_functions?.includes(item.featureFunction)) {
            return false
          }
        }
      }

      if (item.permission) {
        if (permissionsLoading) return false
        if (!hasPermission(item.permission)) return false
      }

      if (item.permissions && item.permissions.length > 0) {
        if (permissionsLoading) return false
        if (!hasAnyPermission(item.permissions)) return false
      }

      return true
    })
  }

  // Check if single item is visible
  const isItemVisible = (item: NavItem): boolean => {
    return filterItems([item]).length > 0
  }

  const companyName = branding?.name || tenant?.name || 'OmniFy HUB'
  const logoUrl = branding?.logo_dark_url || branding?.logo_url

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 280 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex-col',
        'bg-sidebar',
        // Mobile: hidden by default, shown as overlay when menu is open
        mobileMenuOpen ? 'flex' : 'hidden md:flex'
      )}
      style={{
        borderRight: '1px solid var(--color-border)',
      }}
      onClick={(e) => {
        // Close mobile menu when clicking a link
        if ((e.target as HTMLElement).closest('a')) {
          setMobileMenuOpen(false)
        }
      }}
    >
      {/* Logo */}
      <div className="relative h-16 flex items-center justify-between px-4 border-b border-border">
        <AnimatePresence mode="wait">
          {logoUrl ? (
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
            'p-1.5 rounded-lg transition-colors duration-150',
            'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
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
        <div className="relative px-4 py-3 border-b border-border">
          <p className="text-[11px] text-muted-foreground tracking-wide uppercase">{t('sidebar.company')}</p>
          <p className="text-sm font-medium truncate mt-0.5">{tenant.name}</p>
          {featuresData?.plan_label && (
            <span className={cn(
              'inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium',
              'bg-foreground/10 text-foreground/70 border border-foreground/10'
            )}>
              {featuresData.plan_label}
            </span>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="relative flex-1 py-3 overflow-y-auto scrollbar-thin">
        <div className="px-3 space-y-0.5">
          {navEntries.map((entry, idx) => {
            if (entry.type === 'separator') {
              return <SeparatorLine key={`sep-${idx}`} isCollapsed={sidebarCollapsed} />
            }

            if (entry.type === 'item') {
              if (!isItemVisible(entry.item)) return null
              return (
                <NavItemLink
                  key={entry.item.path}
                  item={entry.item}
                  isCollapsed={sidebarCollapsed}
                  currentPath={location.pathname}
                />
              )
            }

            if (entry.type === 'section') {
              const filtered = filterItems(entry.items)
              if (filtered.length === 0) return null
              return (
                <div key={`section-${entry.label}`}>
                  <SectionLabel label={entry.label} isCollapsed={sidebarCollapsed} />
                  <div className="space-y-0.5">
                    {filtered.map((item) => (
                      <NavItemLink
                        key={item.path}
                        item={item}
                        isCollapsed={sidebarCollapsed}
                        currentPath={location.pathname}
                      />
                    ))}
                  </div>
                </div>
              )
            }

            if (entry.type === 'group') {
              const filtered = filterItems(entry.items)
              if (filtered.length === 0) return null
              return (
                <CollapsibleGroup
                  key={entry.id}
                  id={entry.id}
                  label={entry.label}
                  icon={entry.icon}
                  items={filtered}
                  isCollapsed={sidebarCollapsed}
                  isOpen={openGroups[entry.id]}
                  onToggle={() => toggleGroup(entry.id)}
                  currentPath={location.pathname}
                />
              )
            }

            return null
          })}
        </div>
      </nav>

    </motion.aside>
  )
}
