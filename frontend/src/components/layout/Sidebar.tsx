import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  { type: 'item', item: { icon: LayoutDashboard, label: 'Dashboard', path: '/' } },

  { type: 'separator' },

  // ATENDIMENTO - section flat
  {
    type: 'section',
    label: 'Atendimento',
    items: [
      { icon: Kanban, label: 'Leads', path: '/leads', permissions: ['leads.view_own', 'leads.view_all'] },
      { icon: MessageSquare, label: 'Conversas', path: '/conversas' },
      { icon: Users, label: 'Contatos', path: '/contacts', permission: 'contacts.view' },
      { icon: CheckSquare, label: 'Tarefas', path: '/tasks', permissions: ['tasks.view_own', 'tasks.view_all'] },
      { icon: CalendarDays, label: 'Agendamentos', path: '/appointments', feature: 'appointments', featureFunction: 'appointments.list', permission: 'appointments.view' },
      { icon: Clock, label: 'Minha Agenda', path: '/schedule', feature: 'appointments', featureFunction: 'appointments.schedule', permission: 'appointments.view' },
      { icon: MessageSquareText, label: 'Respostas Rápidas', path: '/quick-replies' },
    ],
  },

  { type: 'separator' },

  // MARKETING - section flat
  {
    type: 'section',
    label: 'Marketing',
    items: [
      { icon: Package, label: 'Produtos', path: '/products', feature: 'products', featureFunction: 'products.list', permission: 'products.view' },
      { icon: Globe, label: 'Landing Pages', path: '/landing-pages', feature: 'landing_pages', featureFunction: 'lp.list', permissions: ['landing_pages.view', 'landing_pages.create'] },
    ],
  },

  { type: 'separator' },

  // VENDAS - section flat
  {
    type: 'section',
    label: 'Vendas',
    items: [
      { icon: Trophy, label: 'Metas e KPIs', path: '/goals' },
      { icon: BarChart3, label: 'Relatórios', path: '/reports', permissions: ['reports.view_own', 'reports.view_all'] },
    ],
  },

  { type: 'separator' },

  // SDR com IA - colapsável
  {
    type: 'group',
    id: 'sdr',
    label: 'SDR com IA',
    icon: Bot,
    defaultOpen: false,
    items: [
      { icon: Bot, label: 'Agentes IA', path: '/sdr', feature: 'sdr_ia', featureFunction: 'sdr.agents', permission: 'sdr_ia.view' },
    ],
  },

  // Ads Intelligence - colapsável
  {
    type: 'group',
    id: 'ads',
    label: 'Ads Intelligence',
    icon: Target,
    defaultOpen: false,
    items: [
      { icon: Target, label: 'Dashboard', path: '/ads', feature: 'ads_intelligence', featureFunction: 'ads.dashboard' },
      { icon: Zap, label: 'Criar Campanha', path: '/ads/agent', feature: 'ads_intelligence', featureFunction: 'ads.create_campaign' },
      { icon: Bot, label: 'Chat com Agente', path: '/ads/chat', feature: 'ads_intelligence', featureFunction: 'ads.chat' },
      { icon: ImageIcon, label: 'Criativos', path: '/ads/creatives', feature: 'ads_intelligence', featureFunction: 'ads.creatives' },
      { icon: BarChart3, label: 'Campanhas', path: '/ads/campaigns', feature: 'ads_intelligence', featureFunction: 'ads.campaigns' },
      { icon: Lightbulb, label: 'Insights', path: '/ads/insights', feature: 'ads_intelligence', featureFunction: 'ads.insights' },
      { icon: Zap, label: 'Automações', path: '/ads/automation', feature: 'ads_intelligence', featureFunction: 'ads.automation' },
    ],
  },

  // Criador de Conteúdo - colapsável
  {
    type: 'group',
    id: 'content',
    label: 'Criador de Conteúdo',
    icon: Video,
    defaultOpen: false,
    items: [
      { icon: PlayCircle, label: 'Dashboard', path: '/content', feature: 'viral_content', featureFunction: 'viral.dashboard' },
      { icon: Bot, label: 'Chat com Agente', path: '/content/chat', feature: 'viral_content', featureFunction: 'viral.generate' },
      { icon: Users, label: 'Criadores', path: '/content/creators', feature: 'viral_content', featureFunction: 'viral.analyze' },
      { icon: TrendingUp, label: 'Busca Viral', path: '/content/viral-search', feature: 'viral_content', featureFunction: 'viral.auto_discover' },
    ],
  },

  // BI Analytics - colapsável, admin only
  {
    type: 'group',
    id: 'bi',
    label: 'BI Analytics',
    icon: PieChart,
    defaultOpen: false,
    items: [
      { icon: PieChart, label: 'Dashboard', path: '/bi', feature: 'bi_agent', featureFunction: 'bi.dashboard', adminOnly: true },
      { icon: Brain, label: 'Analista IA', path: '/bi/analyst', feature: 'bi_agent', featureFunction: 'bi.analyst', adminOnly: true },
      { icon: ClipboardCheck, label: 'Ações Pendentes', path: '/bi/actions', feature: 'bi_agent', featureFunction: 'bi.actions', adminOnly: true },
    ],
  },

  { type: 'separator' },

  // Canais - item direto
  { type: 'item', item: { icon: Plug, label: 'Canais', path: '/connect-channels' } },

  // Configurações - item direto
  { type: 'item', item: { icon: Settings, label: 'Configurações', path: '/settings', permission: 'settings.view' } },

  // Administração - colapsável
  {
    type: 'group',
    id: 'admin',
    label: 'Administração',
    icon: Shield,
    defaultOpen: false,
    items: [
      { icon: Building2, label: 'Grupos', path: '/groups', feature: 'groups', featureFunction: 'groups.view' },
      { icon: Shield, label: 'Super Admin', path: '/super-admin', superAdminOnly: true },
      { icon: History, label: 'Histórico Suporte', path: '/super-admin/support-history', superAdminOnly: true },
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
  const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))

  return (
    <NavLink
      to={item.path}
      className={cn(
        'group items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
        'hover:bg-sidebar-accent/5',
        isActive && 'text-sidebar-accent nav-active',
        item.hideOnMobile ? 'hidden md:flex' : 'flex'
      )}
    >
      <item.icon className={cn(
        'h-[18px] w-[18px] shrink-0 transition-colors',
        isActive ? 'text-sidebar-accent' : 'text-muted-foreground group-hover:text-sidebar-accent/80'
      )} />
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className={cn(
              'text-sm whitespace-nowrap',
              isActive ? 'text-sidebar-accent font-medium' : 'text-sidebar-foreground/70'
            )}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  )
}

function SectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  if (isCollapsed) return null

  return (
    <div className="px-3 pt-2 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </span>
    </div>
  )
}

function SeparatorLine({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className={cn('my-2', isCollapsed ? 'mx-3' : 'mx-3')}>
      <div className="h-px bg-sidebar-accent/5" />
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
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-accent/5 text-left'
        )}
      >
        <Icon className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          hasActiveItem ? 'text-sidebar-accent' : 'text-muted-foreground'
        )} />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <>
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn(
                  'text-sm whitespace-nowrap flex-1',
                  hasActiveItem ? 'text-sidebar-accent font-medium' : 'text-sidebar-foreground/70'
                )}
              >
                {label}
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
              !isCollapsed && 'ml-4 pl-3 border-l border-sidebar-accent/10'
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
        borderRight: '1px solid var(--color-sidebar-accent, rgba(255, 255, 255, 0.06))',
        borderRightColor: 'color-mix(in srgb, var(--color-sidebar-accent) 6%, transparent)',
      }}
      onClick={(e) => {
        // Close mobile menu when clicking a link
        if ((e.target as HTMLElement).closest('a')) {
          setMobileMenuOpen(false)
        }
      }}
    >
      {/* Logo */}
      <div className="relative h-16 flex items-center justify-between px-4 border-b border-sidebar-accent/5">
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
            'p-2 rounded-lg transition-all duration-200',
            'hover:bg-sidebar-accent/5 hover:text-sidebar-accent',
            'border border-transparent hover:border-sidebar-accent/10'
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
        <div className="relative px-4 py-3 border-b border-sidebar-accent/5">
          <p className="text-xs text-muted-foreground">Empresa</p>
          <p className="text-sm font-medium truncate">{tenant.name}</p>
          {featuresData?.plan_label && (
            <span className={cn(
              'inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-xs font-medium',
              'bg-sidebar-accent/10 text-sidebar-accent/80 border border-sidebar-accent/10'
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

      {/* Footer */}
      <div className="relative p-4 border-t border-sidebar-accent/5">
        <div className={cn(
          'text-xs font-mono',
          sidebarCollapsed ? 'text-center' : ''
        )}>
          <span className="text-muted-foreground">
            {sidebarCollapsed ? 'v1' : (
              <>
                <span className="text-sidebar-accent">OmniFy</span>
                <span className="text-sidebar-accent/50">HUB</span>
                <span className="text-muted-foreground ml-2">v1.0.0</span>
              </>
            )}
          </span>
        </div>
      </div>
    </motion.aside>
  )
}
