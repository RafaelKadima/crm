import { useLocation, Link } from 'react-router-dom'
import { Home, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbEntry {
  label: string
  section?: string
}

const routeMap: Record<string, BreadcrumbEntry> = {
  '/': { label: 'Dashboard' },
  // Atendimento
  '/leads': { label: 'Leads', section: 'Atendimento' },
  '/conversas': { label: 'Conversas', section: 'Atendimento' },
  '/tickets': { label: 'Tickets', section: 'Atendimento' },
  '/contacts': { label: 'Contatos', section: 'Atendimento' },
  '/tasks': { label: 'Tarefas', section: 'Atendimento' },
  '/appointments': { label: 'Agendamentos', section: 'Atendimento' },
  '/schedule': { label: 'Minha Agenda', section: 'Atendimento' },
  '/quick-replies': { label: 'Respostas Rápidas', section: 'Atendimento' },
  // Marketing
  '/products': { label: 'Produtos', section: 'Marketing' },
  '/landing-pages': { label: 'Landing Pages', section: 'Marketing' },
  // Vendas
  '/goals': { label: 'Metas e KPIs', section: 'Vendas' },
  '/goals/new': { label: 'Nova Meta', section: 'Vendas' },
  '/reports': { label: 'Relatórios', section: 'Vendas' },
  '/reports/activity-effectiveness': { label: 'Efetividade', section: 'Vendas' },
  // SDR
  '/sdr': { label: 'Agentes IA', section: 'SDR com IA' },
  '/sdr/create': { label: 'Novo Agente', section: 'SDR com IA' },
  // Ads
  '/ads': { label: 'Dashboard', section: 'Ads Intelligence' },
  '/ads/agent': { label: 'Criar Campanha', section: 'Ads Intelligence' },
  '/ads/chat': { label: 'Chat com Agente', section: 'Ads Intelligence' },
  '/ads/creatives': { label: 'Criativos', section: 'Ads Intelligence' },
  '/ads/campaigns': { label: 'Campanhas', section: 'Ads Intelligence' },
  '/ads/insights': { label: 'Insights', section: 'Ads Intelligence' },
  '/ads/automation': { label: 'Automações', section: 'Ads Intelligence' },
  '/ads/accounts': { label: 'Contas', section: 'Ads Intelligence' },
  '/ads/knowledge': { label: 'Base de Conhecimento', section: 'Ads Intelligence' },
  '/ads/guardrails': { label: 'Guardrails', section: 'Ads Intelligence' },
  // Conteúdo
  '/content': { label: 'Dashboard', section: 'Criador de Conteúdo' },
  '/content/chat': { label: 'Chat com Agente', section: 'Criador de Conteúdo' },
  '/content/creators': { label: 'Criadores', section: 'Criador de Conteúdo' },
  '/content/viral-search': { label: 'Busca Viral', section: 'Criador de Conteúdo' },
  '/content/brand-settings': { label: 'Brand Settings', section: 'Criador de Conteúdo' },
  // BI
  '/bi': { label: 'Dashboard', section: 'BI Analytics' },
  '/bi/analyst': { label: 'Analista IA', section: 'BI Analytics' },
  '/bi/actions': { label: 'Ações Pendentes', section: 'BI Analytics' },
  '/bi/reports': { label: 'Relatórios', section: 'BI Analytics' },
  '/bi/settings': { label: 'Configurações', section: 'BI Analytics' },
  // Settings & Admin
  '/settings': { label: 'Configurações' },
  '/groups': { label: 'Grupos', section: 'Administração' },
  '/channels': { label: 'Canais', section: 'Configurações' },
  '/queues': { label: 'Filas', section: 'Configurações' },
  '/integrations': { label: 'Integrações', section: 'Configurações' },
  '/whatsapp-templates': { label: 'Templates WhatsApp', section: 'Configurações' },
  '/gtm': { label: 'Google Tag Manager', section: 'Configurações' },
  // Super Admin
  '/super-admin': { label: 'Super Admin', section: 'Administração' },
  '/super-admin/tenants': { label: 'Tenants', section: 'Super Admin' },
  '/super-admin/tenants/new': { label: 'Novo Tenant', section: 'Super Admin' },
  '/super-admin/groups': { label: 'Grupos', section: 'Super Admin' },
  '/super-admin/support': { label: 'Suporte', section: 'Super Admin' },
  '/super-admin/support-history': { label: 'Histórico Suporte', section: 'Administração' },
}

function findBreadcrumb(pathname: string): BreadcrumbEntry | null {
  // Exact match first
  if (routeMap[pathname]) return routeMap[pathname]

  // Try removing dynamic segments (e.g., /sdr/123/config → /sdr)
  const segments = pathname.split('/').filter(Boolean)
  for (let i = segments.length - 1; i >= 0; i--) {
    const partial = '/' + segments.slice(0, i + 1).join('/')
    if (routeMap[partial]) return routeMap[partial]
  }

  return null
}

export function Breadcrumbs() {
  const { pathname } = useLocation()
  const entry = findBreadcrumb(pathname)

  if (!entry || pathname === '/') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span className="text-foreground font-medium">Dashboard</span>
      </div>
    )
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {entry.section && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-muted-foreground">{entry.section}</span>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
      <span className="text-foreground font-medium">{entry.label}</span>
    </nav>
  )
}
