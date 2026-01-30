import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users2,
  Plus,
  Search,
  ChevronLeft,
  Edit,
  Power,
  Trash2,
  Building2,
  Users,
  Loader2,
  BarChart3,
} from 'lucide-react'
import { useSuperAdminGroups, useUpdateSuperAdminGroup, useDeleteSuperAdminGroup, useCreateSuperAdminGroup, useAllTenants } from '@/hooks/useSuperAdmin'
import { formatDateTime } from '@/lib/utils'

export function GroupsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'true' | 'false'>('')
  const [page, setPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [selectedTenants, setSelectedTenants] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  const { data, isLoading } = useSuperAdminGroups({
    search: search || undefined,
    is_active: statusFilter ? statusFilter === 'true' : undefined,
    page,
  })

  const { data: tenantsData } = useAllTenants({ per_page: 100 })
  const updateGroup = useUpdateSuperAdminGroup()
  const deleteGroup = useDeleteSuperAdminGroup()
  const createGroup = useCreateSuperAdminGroup()

  const handleToggleStatus = async (groupId: string, currentStatus: boolean) => {
    await updateGroup.mutateAsync({
      groupId,
      data: { is_active: !currentStatus },
    })
  }

  const handleDelete = async (groupId: string, groupName: string) => {
    if (confirm(`Tem certeza que deseja excluir o grupo "${groupName}"? Esta ação não pode ser desfeita.`)) {
      await deleteGroup.mutateAsync(groupId)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return

    setIsCreating(true)
    try {
      const result = await createGroup.mutateAsync({
        name: newGroupName,
        description: newGroupDescription || undefined,
        tenant_ids: selectedTenants.length > 0 ? selectedTenants : undefined,
      })
      setShowCreateModal(false)
      setNewGroupName('')
      setNewGroupDescription('')
      setSelectedTenants([])
      // Navigate to the new group
      if (result?.group?.id) {
        navigate(`/super-admin/groups/${result.group.id}`)
      }
    } catch (error) {
      console.error('Erro ao criar grupo:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenants(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/super-admin"
                className="p-2 hover:bg-accent/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <Users2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Grupos</h1>
                  <p className="text-sm text-muted-foreground">Gerenciar grupos de empresas</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Grupo
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar grupo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg focus:border-purple-500 focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-muted border border-border rounded-lg focus:border-purple-500 focus:outline-none"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="bg-muted/50 rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Grupo</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Empresas</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Usuários</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Criado em</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Nenhum grupo encontrado. Crie um novo grupo para começar.
                    </td>
                  </tr>
                ) : (
                  data?.data?.map((group: any) => (
                    <motion.tr
                      key={group.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border/30 hover:bg-accent/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Users2 className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-xs text-muted-foreground">{group.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          {group.tenants_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {group.users_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          group.is_active
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {group.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDateTime(group.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/super-admin/groups/${group.id}`)}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(group.id, group.is_active)}
                            className={`p-2 rounded-lg transition-colors ${
                              group.is_active
                                ? 'hover:bg-red-500/20 text-red-400'
                                : 'hover:bg-green-500/20 text-green-400'
                            }`}
                            title={group.is_active ? 'Desativar' : 'Ativar'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(group.id, group.name)}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
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

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-muted rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold">Novo Grupo</h2>
                <p className="text-sm text-muted-foreground mt-1">Crie um grupo para gerenciar múltiplas empresas</p>
              </div>

              <form onSubmit={handleCreateGroup} className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome do Grupo *</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Ex: Holding ABC"
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Descrição</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Descrição opcional do grupo..."
                    rows={3}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Empresas (opcional)</label>
                  <p className="text-xs text-muted-foreground mb-2">Selecione as empresas que farão parte deste grupo</p>
                  <div className="max-h-48 overflow-y-auto bg-accent/50 rounded-lg border border-border">
                    {tenantsData?.data?.map((tenant: any) => (
                      <label
                        key={tenant.id}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-muted-foreground/20 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTenants.includes(tenant.id)}
                          onChange={() => toggleTenantSelection(tenant.id)}
                          className="w-4 h-4 rounded border-border text-purple-500 focus:ring-purple-500 focus:ring-offset-0 bg-accent"
                        />
                        <div>
                          <p className="text-sm font-medium">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </label>
                    ))}
                    {(!tenantsData?.data || tenantsData.data.length === 0) && (
                      <p className="px-4 py-3 text-sm text-muted-foreground">Nenhuma empresa disponível</p>
                    )}
                  </div>
                  {selectedTenants.length > 0 && (
                    <p className="text-xs text-purple-400 mt-2">{selectedTenants.length} empresa(s) selecionada(s)</p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newGroupName.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Criar Grupo
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
