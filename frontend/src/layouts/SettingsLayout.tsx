import { useEffect, useMemo, useState } from 'react'
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Building2,
  MessageSquare,
  Radio,
  TrendingUp,
  Bot,
  Plug,
  ShieldCheck,
  Search,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  useHasAnyPermission,
  type PermissionKey,
} from '@/hooks/useHasPermission'
import { cn } from '@/lib/utils'

// ─── Nav structure ────────────────────────────────────────────────────

interface NavItem {
  id: string
  label: string
  href: string
  /** Esconde item se user não tem essa permission */
  permission?: PermissionKey
  badge?: string | number
}

interface NavGroup {
  id: string
  label: string
  icon: typeof User
  items: NavItem[]
  /** Esconde grupo inteiro se user não tem nenhuma das permissions */
  requireAnyPermission?: PermissionKey[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'account',
    label: 'Conta',
    icon: User,
    items: [
      { id: 'profile', label: 'Perfil', href: '/settings/account/profile' },
      { id: 'security', label: 'Segurança', href: '/settings/account/security' },
      { id: 'notifications', label: 'Notificações', href: '/settings/account/notifications' },
    ],
  },
  {
    id: 'company',
    label: 'Empresa',
    icon: Building2,
    items: [
      { id: 'details', label: 'Dados', href: '/settings/company/details' },
      { id: 'branding', label: 'Marca', href: '/settings/company/branding' },
      { id: 'appearance', label: 'Aparência', href: '/settings/company/appearance' },
      { id: 'team', label: 'Equipe', href: '/settings/company/team', permission: 'users_manage' },
    ],
  },
  {
    id: 'support',
    label: 'Atendimento',
    icon: MessageSquare,
    items: [
      { id: 'queues', label: 'Filas', href: '/settings/support/queues', permission: 'queues_view' },
      { id: 'tags', label: 'Tags', href: '/settings/support/tags' },
      { id: 'quick-replies', label: 'Respostas Rápidas', href: '/settings/support/quick-replies' },
      { id: 'auto-replies', label: 'Auto-Replies', href: '/settings/support/auto-replies' },
      { id: 'step-replies', label: 'Fluxos Guiados', href: '/settings/support/step-replies' },
      { id: 'templates', label: 'Templates WhatsApp', href: '/settings/support/templates', permission: 'templates_view' },
    ],
  },
  {
    id: 'channels',
    label: 'Canais',
    icon: Radio,
    items: [
      { id: 'whatsapp', label: 'WhatsApp Business', href: '/settings/channels/whatsapp' },
      { id: 'instagram', label: 'Instagram Direct', href: '/settings/channels/instagram' },
      { id: 'external-ai', label: 'IA Externa', href: '/settings/channels/external-ai' },
      { id: 'webhooks', label: 'Webhooks', href: '/settings/channels/webhooks' },
    ],
  },
  {
    id: 'sales',
    label: 'Vendas & Marketing',
    icon: TrendingUp,
    items: [
      { id: 'pipelines', label: 'Pipelines', href: '/settings/sales/pipelines' },
      { id: 'broadcasts', label: 'Broadcasts', href: '/settings/sales/broadcasts', permission: 'broadcasts_view' },
      { id: 'landing-pages', label: 'Landing Pages', href: '/settings/sales/landing-pages' },
      { id: 'products', label: 'Produtos', href: '/settings/sales/products' },
    ],
  },
  {
    id: 'ai',
    label: 'IA & Automação',
    icon: Bot,
    items: [
      { id: 'agents', label: 'Agentes SDR', href: '/settings/ai/agents' },
      { id: 'knowledge', label: 'Base de Conhecimento', href: '/settings/ai/knowledge' },
      { id: 'guardrails', label: 'Guardrails', href: '/settings/ai/guardrails' },
      { id: 'usage', label: 'Uso & Tokens', href: '/settings/ai/usage' },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrações',
    icon: Plug,
    items: [
      { id: 'linx', label: 'Linx (ERP)', href: '/settings/integrations/linx' },
      { id: 'analytics', label: 'GTM / GA4', href: '/settings/integrations/analytics' },
      { id: 'others', label: 'Outras', href: '/settings/integrations/others' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    requireAnyPermission: ['audit_log_view', 'users_manage', 'sessions_manage'],
    items: [
      { id: 'audit-logs', label: 'Auditoria', href: '/settings/admin/audit-logs', permission: 'audit_log_view' },
      { id: 'security-incidents', label: 'Incidentes de Segurança', href: '/settings/admin/security-incidents', permission: 'audit_log_view' },
      { id: 'custom-profiles', label: 'Perfis Customizados', href: '/settings/admin/custom-profiles', permission: 'users_manage' },
      { id: 'gamification', label: 'Gamification', href: '/settings/admin/gamification' },
    ],
  },
]

// ─── Layout ───────────────────────────────────────────────────────────

export function SettingsLayout() {
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fecha drawer mobile ao navegar
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return NAV_GROUPS
    const q = search.toLowerCase()
    return NAV_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => i.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [search])

  const breadcrumb = useMemo(() => buildBreadcrumb(location.pathname), [location.pathname])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Mobile header com hamburger */}
      <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <h2 className="font-semibold">Configurações</h2>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar — desktop fixa, mobile drawer */}
      <SidebarContent
        filteredGroups={filteredGroups}
        search={search}
        setSearch={setSearch}
        className="hidden lg:flex"
      />

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed left-0 top-0 z-50 h-full w-[85vw] max-w-[320px] lg:hidden"
            >
              <SidebarContent
                filteredGroups={filteredGroups}
                search={search}
                setSearch={setSearch}
                onClose={() => setMobileOpen(false)}
                className="flex h-full"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Breadcrumb */}
        <div className="border-b px-6 py-3 text-sm text-muted-foreground">
          {breadcrumb.map((b, i) => (
            <span key={b.href} className="inline-flex items-center">
              {i > 0 && <ChevronRight className="mx-1.5 h-3.5 w-3.5 opacity-60" />}
              {i === breadcrumb.length - 1 ? (
                <span className="text-foreground font-medium">{b.label}</span>
              ) : (
                <Link to={b.href} className="hover:text-foreground">
                  {b.label}
                </Link>
              )}
            </span>
          ))}
        </div>

        <div className="px-6 py-6 lg:px-8 lg:py-8 max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// ─── Sidebar internals ────────────────────────────────────────────────

function SidebarContent({
  filteredGroups,
  search,
  setSearch,
  onClose,
  className,
}: {
  filteredGroups: NavGroup[]
  search: string
  setSearch: (v: string) => void
  onClose?: () => void
  className?: string
}) {
  return (
    <aside
      className={cn(
        'w-[280px] shrink-0 flex-col border-r bg-card',
        className,
      )}
    >
      <div className="flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Configurações</h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="border-b px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-9"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {filteredGroups.map((group) => (
          <NavGroupView key={group.id} group={group} hasSearch={!!search.trim()} />
        ))}
        {filteredGroups.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">
            Nenhum resultado.
          </p>
        )}
      </nav>
    </aside>
  )
}

function NavGroupView({ group, hasSearch }: { group: NavGroup; hasSearch: boolean }) {
  const Icon = group.icon
  const location = useLocation()
  const isActiveGroup = group.items.some((i) => location.pathname.startsWith(i.href))
  const [open, setOpen] = useState(isActiveGroup || hasSearch)

  // Eager-open quando search filtra ou rota ativa
  useEffect(() => {
    if (hasSearch || isActiveGroup) setOpen(true)
  }, [hasSearch, isActiveGroup])

  // Permission gate no grupo inteiro
  const hasAccess = useHasAnyPermission(...(group.requireAnyPermission ?? []))
  if (group.requireAnyPermission && !hasAccess) return null

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          isActiveGroup && 'text-foreground',
        )}
      >
        <span className="flex items-center gap-2.5">
          <Icon className="h-4 w-4" />
          {group.label}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>

      {open && (
        <ul className="mt-1 space-y-0.5 pl-9">
          {group.items.map((item) => (
            <NavItemView key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}

function NavItemView({ item }: { item: NavItem }) {
  // Permission gate por item
  const allowed = item.permission ? useHasAnyPermission(item.permission) : true
  if (!allowed) return null

  return (
    <li>
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          cn(
            'flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors',
            isActive
              ? 'bg-secondary text-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )
        }
      >
        <span>{item.label}</span>
        {item.badge != null && (
          <span className="text-xs text-muted-foreground">{item.badge}</span>
        )}
      </NavLink>
    </li>
  )
}

// ─── Breadcrumb resolver ──────────────────────────────────────────────

function buildBreadcrumb(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [
    { label: 'Configurações', href: '/settings' },
  ]

  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        crumbs.push({ label: group.label, href: item.href })
        crumbs.push({ label: item.label, href: item.href })
        return crumbs
      }
    }
  }

  return crumbs
}
