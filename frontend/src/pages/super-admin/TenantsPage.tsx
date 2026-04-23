import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Building2,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  MoreVertical,
  Edit,
  Power,
  Trash2,
  Users,
  TrendingUp,
  Crown,
  Loader2,
  Users2,
} from 'lucide-react'
import { useTenants, useUpdateTenant } from '@/hooks/useSuperAdmin'
import { formatDateTime } from '@/lib/utils'

export function TenantsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useTenants({
    search: search || undefined,
    plan: planFilter || undefined,
    is_active: statusFilter ? statusFilter === 'true' : undefined,
    page,
  })

  const updateTenant = useUpdateTenant()

  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    await updateTenant.mutateAsync({
      tenantId,
      data: { is_active: !currentStatus },
    })
  }

  return (
    <div>
      <div>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              to="/super-admin"
              className="mt-1 rounded-[8px] p-1.5 transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="eyebrow">SUPER-ADMIN · TENANTS</p>
              <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
                Empresas
              </h1>
              <p className="mt-2 text-[13.5px] text-muted-foreground">
                Gerenciar tenants do sistema.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/super-admin/groups"
              className="inline-flex items-center gap-1.5 rounded-[10px] border px-3.5 py-2 text-[12.5px] font-medium transition-colors hover:bg-muted"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <Users2 className="h-4 w-4" />
              Grupos
            </Link>
            <Link
              to="/super-admin/tenants/new"
              className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[12.5px] font-semibold transition-all"
              style={{ background: 'var(--color-bold)', color: 'var(--color-bold-ink)' }}
            >
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Link>
          </div>
        </div>
      </div>

      <div>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 bg-muted border border-border rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todos os planos</option>
            <option value="basic">Básico</option>
            <option value="ia_sdr">IA SDR</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-muted border border-border rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="bg-muted/50 rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Empresa</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Plano</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Usuários</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Leads</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Criado em</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((tenant: any) => (
                  <motion.tr
                    key={tenant.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border/30 hover:bg-accent/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Building2 className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tenant.plan === 'enterprise' ? 'bg-amber-500/20 text-amber-400' :
                        tenant.plan === 'ia_sdr' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {tenant.plan === 'basic' ? 'Básico' : 
                         tenant.plan === 'ia_sdr' ? 'IA SDR' : 
                         tenant.plan === 'enterprise' ? 'Enterprise' : tenant.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {tenant.users_count || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        {tenant.leads_count || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        tenant.is_active 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {tenant.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDateTime(tenant.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(tenant.id, tenant.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            tenant.is_active 
                              ? 'hover:bg-red-500/20 text-red-400' 
                              : 'hover:bg-green-500/20 text-green-400'
                          }`}
                          title={tenant.is_active ? 'Desativar' : 'Ativar'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data?.last_page > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Mostrando {data?.from} - {data?.to} de {data?.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-accent hover:bg-muted-foreground/20 rounded disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data?.last_page, p + 1))}
                    disabled={page === data?.last_page}
                    className="px-3 py-1 bg-accent hover:bg-muted-foreground/20 rounded disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

