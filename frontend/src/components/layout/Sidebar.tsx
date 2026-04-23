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

type NavEntry =
  | { type: 'item'; item: NavItem }
  | { type: 'separator' }
  | { type: 'section'; label: string; items: NavItem[] }
  | { type: 'group'; id: string; label: string; icon: LucideIcon; items: NavItem[]; defaultOpen?: boolean }

const navEntries: NavEntry[] = [
  { type: 'item', item: { icon: LayoutDashboard, label: 'nav.dashboard', path: '/' } },

  { type: 'separator' },

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

  {
    type: 'section',
    label: 'sidebar.sales',
    items: [
      { icon: Trophy, label: 'sidebar.goalsKpis', path: '/goals' },
      { icon: BarChart3, label: 'nav.reports', path: '/reports', permissions: ['reports.view_own', 'reports.view_all'] },
    ],
  },

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

  { type: 'item', item: { icon: Plug, label: 'nav.channels', path: '/connect-channels' } },
  { type: 'item', item: { icon: Settings, label: 'nav.settings', path: '/settings', permission: 'settings.view' } },

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

// ─── Bold wordmark ────────────────────────────────────────────────
function BoldWordmark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] font-display text-[20px] leading-none"
        style={{ background: 'var(--color-bold-ink)', color: '#0A0A0C' }}
      >
        O
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-none">
          <div className="omnify-logo-text">
            <span className="omni">Omni</span>
            <span className="fy">Fy</span>
            <span className="dot">.</span>
            <span className="hub">HUB</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Nav item (bold style) ────────────────────────────────────────
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
        'group relative flex items-center gap-2.5 rounded-[10px] transition-colors duration-150',
        'px-2.5 py-[7px]',
        isActive
          ? 'bg-[var(--color-bold-ink)] text-[#0A0A0C] font-semibold'
          : 'text-[rgba(244,243,239,0.65)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F4F3EF]',
        item.hideOnMobile ? 'hidden md:flex' : 'flex'
      )}
    >
      <item.icon className="h-[16px] w-[16px] shrink-0" strokeWidth={isActive ? 2.25 : 1.75} />
      {!isCollapsed && (
        <span className="text-[13px] whitespace-nowrap truncate">
          {t(item.label)}
        </span>
      )}
    </NavLink>
  )
}

function SectionLabel({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
  const { t } = useTranslation()
  if (isCollapsed) return null
  return (
    <div className="px-2.5 pt-4 pb-1.5">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'rgba(244,243,239,0.38)' }}
      >
        {t(label)}
      </span>
    </div>
  )
}

function SeparatorLine({ isCollapsed: _c }: { isCollapsed: boolean }) {
  return (
    <div className="my-2 mx-2.5">
      <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

function CollapsibleGroup({
  id: _id,
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

  if (items.length === 1) {
    return <NavItemLink item={items[0]} isCollapsed={isCollapsed} currentPath={currentPath} />
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'group w-full flex items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-left transition-colors duration-150',
          hasActiveItem
            ? 'text-[#F4F3EF] font-medium'
            : 'text-[rgba(244,243,239,0.65)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F4F3EF]'
        )}
      >
        <Icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.75} />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-[13px] whitespace-nowrap truncate">{t(label)}</span>
            <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </motion.span>
          </>
        )}
      </button>

      <AnimatePresence initial={false}>
        {(isOpen || isCollapsed) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <ul
              className={cn(
                'mt-0.5 space-y-0.5',
                !isCollapsed && 'ml-4 pl-3 border-l'
              )}
              style={!isCollapsed ? { borderColor: 'rgba(255,255,255,0.08)' } : undefined}
            >
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

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    navEntries.forEach((entry) => {
      if (entry.type === 'group') initial[entry.id] = entry.defaultOpen ?? false
    })
    return initial
  })

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

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

  const isItemVisible = (item: NavItem): boolean => {
    return filterItems([item]).length > 0
  }

  const companyName = branding?.name || tenant?.name || 'OmniFy HUB'
  const logoUrl = branding?.logo_dark_url || branding?.logo_url

  const userInitials = (user?.name || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 244 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex-col',
        'bg-sidebar',
        mobileMenuOpen ? 'flex' : 'hidden md:flex'
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) {
          setMobileMenuOpen(false)
        }
      }}
    >
      {/* Header / Logo */}
      <div
        className="relative flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {logoUrl ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logoUrl} alt={companyName} className="h-8 w-8 object-contain rounded-[9px]" />
            {!sidebarCollapsed && (
              <span className="font-display text-[20px] leading-none text-[#F4F3EF] truncate">
                {companyName}
              </span>
            )}
          </div>
        ) : (
          <BoldWordmark collapsed={sidebarCollapsed} />
        )}

        <button
          onClick={toggleSidebar}
          className="cursor-pointer rounded-[8px] p-1.5 text-[rgba(244,243,239,0.55)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[#F4F3EF]"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Workspace switcher */}
      {tenant && !sidebarCollapsed && (
        <div className="px-3 pt-3">
          <div
            className="flex items-center gap-2 rounded-[10px] px-2.5 py-2"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] text-[10px] font-bold"
              style={{ background: 'var(--color-bold-ink)', color: '#0A0A0C' }}
            >
              {(tenant.name || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-semibold leading-tight text-[#F4F3EF] truncate">
                {tenant.name}
              </div>
              {featuresData?.plan_label && (
                <div className="text-[10px] leading-tight text-[rgba(244,243,239,0.5)]">
                  {featuresData.plan_label}
                </div>
              )}
            </div>
            <ChevronDown className="h-3 w-3 shrink-0 text-[rgba(244,243,239,0.5)]" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto scrollbar-thin py-3">
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

      {/* User card */}
      {user && !sidebarCollapsed && (
        <div
          className="flex items-center gap-2.5 px-3 py-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{ background: '#F2D59A', color: '#14110F' }}
          >
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold leading-tight text-[#F4F3EF] truncate">
              {user.name || 'Usuário'}
            </div>
            <div className="text-[10.5px] leading-tight text-[rgba(244,243,239,0.55)] truncate">
              {user.role === 'admin' ? t('sidebar.admin', { defaultValue: 'Admin' }) : user.email || ''}
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  )
}
