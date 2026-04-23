import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  Users,
  TrendingUp,
  Settings,
  Activity,
  ChevronRight,
  Shield,
  Loader2,
  Crown,
} from 'lucide-react'
import { useSuperAdminDashboard } from '@/hooks/useSuperAdmin'
import { formatDateTime } from '@/lib/utils'

export function SuperAdminDashboard() {
  const { data: stats, isLoading } = useSuperAdminDashboard()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Empresas',
      value: stats?.total_tenants || 0,
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
      link: '/super-admin/tenants',
    },
    {
      title: 'Empresas Ativas',
      value: stats?.active_tenants || 0,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Total de Usuários',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      link: '/super-admin/users',
    },
    {
      title: 'Total de Leads',
      value: stats?.total_leads || 0,
      icon: Activity,
      color: 'from-amber-500 to-amber-600',
    },
  ]

  return (
    <div>
      {/* Hero header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">PLATFORM · SUPER-ADMIN</p>
          <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
            Painel de Controle
          </h1>
          <p className="mt-2 text-[13.5px] text-muted-foreground">
            Métricas de plataforma, tenants, grupos e atividade administrativa.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-[10px] border px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:bg-muted"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <Shield className="h-4 w-4" />
          Voltar ao CRM
        </Link>
      </div>

      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {stat.link ? (
                <Link to={stat.link}>
                  <StatCard stat={stat} />
                </Link>
              ) : (
                <StatCard stat={stat} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Plans Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-muted/50 rounded-xl border border-border p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Distribuição por Plano</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats?.tenants_by_plan || {}).map(([plan, count]) => (
              <div key={plan} className="bg-accent/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{count as number}</p>
                <p className="text-sm text-muted-foreground capitalize">{plan}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tenants */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-muted/50 rounded-xl border border-border"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">Empresas Recentes</h2>
              <Link
                to="/super-admin/tenants"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {stats?.recent_tenants?.map((tenant: any) => (
                <Link
                  key={tenant.id}
                  to={`/super-admin/tenants/${tenant.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Building2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{tenant.plan}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tenant.is_active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {tenant.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity Logs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-muted/50 rounded-xl border border-border"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">Atividades Recentes</h2>
              <Link
                to="/super-admin/logs"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Ver todas <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {stats?.recent_logs?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhuma atividade recente</p>
              ) : (
                stats?.recent_logs?.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Activity className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm">{log.action}</p>
                        <p className="text-xs text-muted-foreground">{log.user?.name}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Link
            to="/super-admin/tenants/new"
            className="flex items-center gap-4 p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all group"
          >
            <Building2 className="w-8 h-8" />
            <div>
              <p className="font-semibold">Nova Empresa</p>
              <p className="text-sm text-blue-200">Criar um novo tenant</p>
            </div>
            <ChevronRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/super-admin/users/new"
            className="flex items-center gap-4 p-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl hover:from-purple-500 hover:to-purple-600 transition-all group"
          >
            <Users className="w-8 h-8" />
            <div>
              <p className="font-semibold">Novo Usuário</p>
              <p className="text-sm text-purple-200">Adicionar usuário</p>
            </div>
            <ChevronRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            to="/super-admin/settings"
            className="flex items-center gap-4 p-6 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl hover:from-gray-500 hover:to-gray-600 transition-all group"
          >
            <Settings className="w-8 h-8" />
            <div>
              <p className="font-semibold">Configurações</p>
              <p className="text-sm text-muted-foreground">Gerenciar sistema</p>
            </div>
            <ChevronRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}

function StatCard({ stat }: { stat: any }) {
  return (
    <div
      className="rounded-[14px] border p-6 transition-colors"
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{stat.title}</p>
          <p className="mt-3 font-display text-[36px] leading-none tracking-[-0.02em]">
            {stat.value.toLocaleString()}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br ${stat.color}`}
        >
          <stat.icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

