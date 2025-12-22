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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/super-admin"
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Empresas</h1>
                  <p className="text-sm text-gray-400">Gerenciar tenants do sistema</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/super-admin/groups"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
              >
                <Users2 className="w-4 h-4" />
                Grupos
              </Link>
              <Link
                to="/super-admin/tenants/new"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Empresa
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todos os planos</option>
            <option value="basic">Básico</option>
            <option value="ia_sdr">IA SDR</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
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
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Empresa</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Plano</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Usuários</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Leads</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Criado em</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.map((tenant: any) => (
                  <motion.tr
                    key={tenant.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Building2 className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-xs text-gray-400">{tenant.slug}</p>
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
                      <div className="flex items-center gap-1 text-gray-300">
                        <Users className="w-4 h-4" />
                        {tenant.users_count || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1 text-gray-300">
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
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDateTime(tenant.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/super-admin/tenants/${tenant.id}`)}
                          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50">
                <p className="text-sm text-gray-400">
                  Mostrando {data?.from} - {data?.to} de {data?.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data?.last_page, p + 1))}
                    disabled={page === data?.last_page}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
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

