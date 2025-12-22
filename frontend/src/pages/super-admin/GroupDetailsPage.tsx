import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users2,
  ChevronLeft,
  Building2,
  Users,
  Plus,
  Trash2,
  Search,
  Loader2,
  BarChart3,
  TrendingUp,
  Ticket,
  X,
  Check,
  Edit,
  Save,
} from 'lucide-react'
import {
  useSuperAdminGroup,
  useUpdateSuperAdminGroup,
  useAddTenantToGroup,
  useRemoveTenantFromGroup,
  useAddUserToGroup,
  useRemoveUserFromGroup,
  useAllTenants,
  useAllUsers,
} from '@/hooks/useSuperAdmin'
import { useGroupDashboard, useGroupMetricsPerTenant, useGroupSalesRanking } from '@/hooks/useGroups'
import { formatDateTime, formatCurrency } from '@/lib/utils'

type TabType = 'empresas' | 'usuarios' | 'dashboard'

export function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('empresas')
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Modals
  const [showAddTenantModal, setShowAddTenantModal] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [tenantSearch, setTenantSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserRole, setSelectedUserRole] = useState<'admin' | 'viewer'>('viewer')

  // Queries
  const { data: groupData, isLoading: groupLoading } = useSuperAdminGroup(groupId || '')
  const { data: tenantsData } = useAllTenants({ search: tenantSearch, per_page: 50 })
  const { data: usersData } = useAllUsers({ search: userSearch, per_page: 50 })
  const { data: dashboardData } = useGroupDashboard(groupId || '')
  const { data: metricsPerTenant } = useGroupMetricsPerTenant(groupId || '')
  const { data: salesRanking } = useGroupSalesRanking(groupId || '')

  // Mutations
  const updateGroup = useUpdateSuperAdminGroup()
  const addTenant = useAddTenantToGroup()
  const removeTenant = useRemoveTenantFromGroup()
  const addUser = useAddUserToGroup()
  const removeUser = useRemoveUserFromGroup()

  const group = groupData?.group

  const handleStartEdit = () => {
    setEditName(group?.name || '')
    setEditDescription(group?.description || '')
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!groupId) return
    await updateGroup.mutateAsync({
      groupId,
      data: {
        name: editName,
        description: editDescription,
      },
    })
    setIsEditing(false)
  }

  const handleAddTenant = async (tenantId: string) => {
    if (!groupId) return
    await addTenant.mutateAsync({ groupId, tenantId })
    setShowAddTenantModal(false)
  }

  const handleRemoveTenant = async (tenantId: string, tenantName: string) => {
    if (!groupId) return
    if (confirm(`Remover "${tenantName}" do grupo?`)) {
      await removeTenant.mutateAsync({ groupId, tenantId })
    }
  }

  const handleAddUser = async (userId: string) => {
    if (!groupId) return
    await addUser.mutateAsync({ groupId, userId, role: selectedUserRole })
    setShowAddUserModal(false)
  }

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!groupId) return
    if (confirm(`Remover "${userName}" do grupo?`)) {
      await removeUser.mutateAsync({ groupId, userId })
    }
  }

  // Filter out tenants already in the group
  const availableTenants = tenantsData?.data?.filter(
    (t: any) => !group?.tenants?.some((gt: any) => gt.id === t.id)
  ) || []

  // Filter out users already in the group
  const availableUsers = usersData?.data?.filter(
    (u: any) => !group?.users?.some((gu: any) => gu.id === u.id)
  ) || []

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Grupo não encontrado</p>
          <Link to="/super-admin/groups" className="text-purple-400 hover:underline">
            Voltar para lista de grupos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/super-admin/groups"
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <Users2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-xl font-bold bg-gray-800 border border-gray-600 rounded px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <h1 className="text-xl font-bold">{group.name}</h1>
                  )}
                  {isEditing ? (
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Descrição do grupo..."
                      className="text-sm text-gray-400 bg-gray-800 border border-gray-600 rounded px-2 py-1 mt-1 w-64"
                    />
                  ) : (
                    <p className="text-sm text-gray-400">{group.description || group.slug}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateGroup.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
                  >
                    {updateGroup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { key: 'empresas', label: 'Empresas', icon: Building2, count: group.tenants?.length || 0 },
              { key: 'usuarios', label: 'Usuários', icon: Users, count: group.users?.length || 0 },
              { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Empresas Tab */}
        {activeTab === 'empresas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Empresas do Grupo</h2>
              <button
                onClick={() => setShowAddTenantModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Empresa
              </button>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Empresa</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {group.tenants?.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-12 text-center text-gray-400">
                        Nenhuma empresa no grupo. Adicione empresas para começar.
                      </td>
                    </tr>
                  ) : (
                    group.tenants?.map((tenant: any) => (
                      <tr key={tenant.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
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
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveTenant(tenant.id, tenant.name)}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Remover do grupo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Usuários Tab */}
        {activeTab === 'usuarios' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Usuários com Acesso ao Grupo</h2>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar Usuário
              </button>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Usuário</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Role</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {group.users?.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                        Nenhum usuário com acesso ao grupo.
                      </td>
                    </tr>
                  ) : (
                    group.users?.map((user: any) => (
                      <tr key={user.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                              <Users className="w-4 h-4 text-green-400" />
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            user.pivot?.role === 'owner'
                              ? 'bg-amber-500/20 text-amber-400'
                              : user.pivot?.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {user.pivot?.role === 'owner' ? 'Owner' : user.pivot?.role === 'admin' ? 'Admin' : 'Viewer'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.pivot?.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveUser(user.id, user.name)}
                              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                              title="Remover do grupo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Total de Leads</span>
                </div>
                <p className="text-3xl font-bold">{dashboardData?.metrics?.leads?.total || 0}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Leads Ganhos</span>
                </div>
                <p className="text-3xl font-bold text-green-400">{dashboardData?.metrics?.leads?.won || 0}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Ticket className="w-4 h-4" />
                  <span className="text-sm">Tickets Abertos</span>
                </div>
                <p className="text-3xl font-bold text-amber-400">{dashboardData?.metrics?.tickets?.open || 0}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Usuários Ativos</span>
                </div>
                <p className="text-3xl font-bold text-purple-400">{dashboardData?.metrics?.users?.total || 0}</p>
              </div>
            </div>

            {/* Metrics per Tenant */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700/50">
                <h3 className="font-semibold">Métricas por Empresa</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Empresa</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-400">Leads</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-400">Ganhos</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-400">Conversão</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-400">Valor</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-400">Tickets</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsPerTenant?.metrics_per_tenant?.map((m: any) => (
                    <tr key={m.tenant_id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="px-6 py-3 font-medium">{m.tenant_name}</td>
                      <td className="px-6 py-3 text-right">{m.leads?.total || 0}</td>
                      <td className="px-6 py-3 text-right text-green-400">{m.leads?.won || 0}</td>
                      <td className="px-6 py-3 text-right">{m.leads?.conversion_rate || 0}%</td>
                      <td className="px-6 py-3 text-right">{formatCurrency(m.leads?.total_value || 0)}</td>
                      <td className="px-6 py-3 text-right">{m.tickets?.total || 0}</td>
                    </tr>
                  ))}
                  {(!metricsPerTenant?.metrics_per_tenant || metricsPerTenant.metrics_per_tenant.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        Adicione empresas ao grupo para ver as métricas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Sales Ranking */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-700/50">
                <h3 className="font-semibold">Ranking de Vendedores</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">#</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Vendedor</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-400">Empresa</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-400">Ganhos</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-400">Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {salesRanking?.ranking?.map((r: any, index: number) => (
                    <tr key={r.user_id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                      <td className="px-6 py-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-amber-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-gray-700 text-white'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-medium">{r.user_name}</td>
                      <td className="px-6 py-3 text-gray-400">{r.tenant_name}</td>
                      <td className="px-6 py-3 text-right text-green-400">{r.won_count}</td>
                      <td className="px-6 py-3 text-right font-medium">{formatCurrency(r.total_value || 0)}</td>
                    </tr>
                  ))}
                  {(!salesRanking?.ranking || salesRanking.ranking.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        Nenhum dado de vendas disponível
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* Add Tenant Modal */}
      <AnimatePresence>
        {showAddTenantModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddTenantModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg"
            >
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Adicionar Empresa</h2>
                <button onClick={() => setShowAddTenantModal(false)} className="p-2 hover:bg-gray-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar empresa..."
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {availableTenants.map((tenant: any) => (
                    <button
                      key={tenant.id}
                      onClick={() => handleAddTenant(tenant.id)}
                      disabled={addTenant.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                    >
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-gray-400">{tenant.slug}</p>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                  {availableTenants.length === 0 && (
                    <p className="text-center text-gray-400 py-8">
                      {tenantSearch ? 'Nenhuma empresa encontrada' : 'Todas as empresas já estão no grupo'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddUserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddUserModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg"
            >
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Adicionar Usuário</h2>
                <button onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-gray-700 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Role do Usuário</label>
                  <select
                    value={selectedUserRole}
                    onChange={(e) => setSelectedUserRole(e.target.value as any)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    <option value="viewer">Viewer - Apenas visualização</option>
                    <option value="admin">Admin - Pode gerenciar o grupo</option>
                  </select>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar usuário..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {availableUsers.map((user: any) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddUser(user.id)}
                      disabled={addUser.isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                    >
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <Users className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                  {availableUsers.length === 0 && (
                    <p className="text-center text-gray-400 py-8">
                      {userSearch ? 'Nenhum usuário encontrado' : 'Todos os usuários já estão no grupo'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
