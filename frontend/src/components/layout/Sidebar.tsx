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
  Home,
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
      { icon: CalendarDays, label: 'Agendamentos', path: '/appointments', feature: 'appointments', permission: 'appointments.view' },
      { icon: Clock, label: 'Minha Agenda', path: '/schedule', feature: 'appointments', permission: 'appointments.view' },
      { icon: LayoutGrid, label: 'Filas', path: '/queues', adminOnly: true },
      { icon: Radio, label: 'Canais', path: '/channels', permission: 'channels.view' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { icon: Package, label: 'Produtos', path: '/products', feature: 'products', permission: 'products.view' },
      { icon: Globe, label: 'Landing Pages', path: '/landing-pages', feature: 'landing_pages', permissions: ['landing_pages.view', 'landing_pages.create'] },
      { icon: FileText, label: 'Templates WhatsApp', path: '/whatsapp-templates', permission: 'channels.view' },
      { icon: TrendingUp, label: 'Google Tag Manager', path: '/gtm', adminOnly: true },
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
      { icon: Bot, label: 'SDR IA', path: '/sdr', feature: 'sdr_ia', permission: 'sdr_ia.view' },
      { icon: BarChart3, label: 'Relatórios', path: '/reports', permissions: ['reports.view_own', 'reports.view_all'] },
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
      { icon: Building2, label: 'Grupos', path: '/groups', feature: 'groups', adminOnly: true },
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
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-white/10',
          isActive && 'text-white shadow-lg'
        )}
        style={
          isActive
            ? {
                backgroundColor: branding?.primary_color || 'var(--brand-primary)',
                boxShadow: `0 10px 15px -3px ${branding?.primary_color || 'var(--brand-primary)'}33`,
                borderRadius: 'var(--brand-radius)',
              }
            : {
                borderRadius: 'var(--brand-radius)',
              }
        }
      >
        <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-white')} />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-sm font-medium whitespace-nowrap"
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
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
          'hover:bg-white/10 text-left',
          hasActiveItem && !isCollapsed && 'bg-white/5'
        )}
        style={{ borderRadius: 'var(--brand-radius)' }}
      >
        <group.icon
          className={cn('h-5 w-5 shrink-0', hasActiveItem && 'text-sidebar-accent')}
        />
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <>
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn(
                  'text-sm font-semibold whitespace-nowrap flex-1',
                  hasActiveItem && 'text-sidebar-accent'
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
            <ul className={cn('mt-1 space-y-0.5', !isCollapsed && 'ml-4 pl-3 border-l border-white/10')}>
              {filteredItems.map((item) => {
                const isActive =
                  currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                        'hover:bg-white/10',
                        isActive && 'text-white shadow-lg'
                      )}
                      style={
                        isActive
                          ? {
                              backgroundColor: branding?.primary_color || 'var(--brand-primary)',
                              boxShadow: `0 4px 12px -2px ${branding?.primary_color || 'var(--brand-primary)'}40`,
                              borderRadius: 'var(--brand-radius)',
                            }
                          : {
                              borderRadius: 'var(--brand-radius)',
                            }
                      }
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-white')} />
                      <AnimatePresence mode="wait">
                        {!isCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="text-sm whitespace-nowrap"
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

  // Filtra os itens do menu baseado nas features e permissões
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.filter((item) => {
      // Se é item apenas para super admin
      if (item.superAdminOnly) {
        return user?.is_super_admin || isSuperAdmin || featuresData?.is_super_admin
      }

      // Se é item apenas para admin
      if (item.adminOnly) {
        return isAdmin || isSuperAdmin || user?.role === 'admin'
      }

      // Super admins e Admins vêem tudo (exceto superAdminOnly)
      if (user?.is_super_admin || isSuperAdmin || featuresData?.is_super_admin || isAdmin) {
        // Mas ainda precisa verificar feature do tenant
        if (item.feature) {
          if (featuresLoading || !featuresData) {
            return false
          }
          return featuresData.features[item.feature]?.is_enabled ?? false
        }
        return true
      }

      // Verifica feature do tenant
      if (item.feature) {
        if (featuresLoading || !featuresData) {
          return false
        }
        if (!(featuresData.features[item.feature]?.is_enabled ?? false)) {
          return false
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

  // Extrair cores do branding
  const sidebarBgColor = branding?.branding?.sidebar_color || 'var(--branding-sidebar-bg)'
  const sidebarTextColor = branding?.branding?.sidebar_text_color || 'var(--branding-sidebar-text)'
  const primaryColor = branding?.branding?.primary_color || 'var(--branding-primary)'
  const companyName = branding?.name || tenant?.name || 'CRM'
  const logoUrl = branding?.logo_dark_url || branding?.logo_url

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 280 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 h-screen border-r border-border/10 flex flex-col"
      style={{
        backgroundColor: sidebarBgColor,
        color: sidebarTextColor,
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center justify-between px-4 border-b border-white/10"
        style={{ backgroundColor: sidebarBgColor }}
      >
        <AnimatePresence mode="wait">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="h-8 object-contain" />
              ) : (
                <>
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="text-white font-bold text-lg">
                      {companyName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="font-semibold text-lg" style={{ color: sidebarTextColor }}>
                    {companyName}
                  </span>
                </>
              )}
            </motion.div>
          )}
          {sidebarCollapsed && logoUrl && (
            <motion.img
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={logoUrl}
              alt={companyName}
              className="h-8 w-8 object-contain mx-auto"
            />
          )}
        </AnimatePresence>

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
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
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-xs text-sidebar-foreground/60">Empresa</p>
          <p className="text-sm font-medium truncate">{tenant.name}</p>
          {featuresData?.plan_label && (
            <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-sidebar-accent/20 text-sidebar-accent">
              {featuresData.plan_label}
            </span>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
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
      <div className="p-4 border-t border-white/10">
        <div className={cn('text-xs opacity-50', sidebarCollapsed ? 'text-center' : '')}>
          {sidebarCollapsed ? 'v1' : `${branding?.company_name || 'CRM'} v1.0.0`}
        </div>
      </div>
    </motion.aside>
  )
}
