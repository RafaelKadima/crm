import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Shield,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  Loader2,
  UserPlus,
  X,
  CheckCircle,
  AlertCircle,
  Key,
} from 'lucide-react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { UserPermissionsModal } from '@/components/settings/UserPermissionsModal'
import { useAuth } from '@/hooks/useAuth'

export function TeamSettingsPage() {
  const { user: currentUser } = useAuth()
  const { data: usersResponse, isLoading, refetch } = useUsers()
  const users = usersResponse?.data || []
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [permissionsUser, setPermissionsUser] = useState<any>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'vendedor',
    password: '',
    // Campos Linx
    linx_vendedor_id: '',
  })

  const filteredUsers = users?.filter((user: any) =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  )

  const openModal = (user?: any) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        password: '',
        linx_vendedor_id: user.linx_vendedor_id || '',
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'vendedor',
        password: '',
        linx_vendedor_id: '',
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (editingUser) {
        await updateUser.mutateAsync({
          id: editingUser.id,
          data: formData.password ? formData : { ...formData, password: undefined },
        })
        setSuccess('Usuário atualizado com sucesso!')
      } else {
        await createUser.mutateAsync(formData as any)
        setSuccess('Usuário criado com sucesso!')
      }
      setShowModal(false)
      refetch()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar usuário')
    }
  }

  const handleToggleActive = async (user: any) => {
    await updateUser.mutateAsync({
      id: user.id,
      data: { is_active: !user.is_active },
    })
  }

  const handleDelete = async (user: any) => {
    if (window.confirm(`Tem certeza que deseja excluir ${user.name}?`)) {
      await deleteUser.mutateAsync(user.id)
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    gestor: 'Gestor',
    vendedor: 'Vendedor',
    marketing: 'Marketing',
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-500/20 text-purple-400',
    gestor: 'bg-blue-500/20 text-blue-400',
    vendedor: 'bg-green-500/20 text-green-400',
    marketing: 'bg-amber-500/20 text-amber-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-500" />
            Equipe
          </h2>
          <p className="text-gray-400 mt-1">
            Gerencie os usuários da sua empresa
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300">{success}</p>
        </motion.div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Lista de Usuários */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Usuário</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Contato</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Função</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers?.map((user: any) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-700/30 hover:bg-gray-700/20"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-1 text-gray-300">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </p>
                      {user.phone && (
                        <p className="text-sm flex items-center gap-1 text-gray-400">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[user.role] || 'bg-gray-500/20 text-gray-400'}`}>
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(user)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {/* Botão de Permissões - apenas Admin pode ver e não mostra para outros Admins */}
                      {currentUser?.role === 'admin' && user.role !== 'admin' && (
                        <button
                          onClick={() => setPermissionsUser(user)}
                          className="p-2 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors"
                          title="Permissões"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.is_active ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-green-500/20 text-green-400'
                        }`}
                        title={user.is_active ? 'Desativar' : 'Ativar'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredUsers?.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Função</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="gestor">Gestor</option>
                  <option value="marketing">Marketing</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Código Linx (Vendedor)</label>
                <input
                  type="text"
                  value={formData.linx_vendedor_id}
                  onChange={(e) => setFormData({ ...formData, linx_vendedor_id: e.target.value })}
                  placeholder="Ex: 123"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">ID do vendedor no Linx Smart</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder={editingUser ? '••••••••' : 'Mínimo 8 caracteres'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending || updateUser.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {(createUser.isPending || updateUser.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal de Permissões */}
      {permissionsUser && (
        <UserPermissionsModal
          user={permissionsUser}
          open={!!permissionsUser}
          onClose={() => setPermissionsUser(null)}
          onUpdated={() => refetch()}
        />
      )}
    </div>
  )
}

