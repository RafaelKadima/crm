import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  Gift,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Search,
  Filter,
} from 'lucide-react'
import { useAdminUserRewards, useUpdateUserReward } from '@/hooks/useGamification'
import type { UserReward } from '@/types'

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'delivered', label: 'Entregues' },
  { value: 'rejected', label: 'Rejeitados' },
]

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-yellow-400 bg-yellow-500/20' },
  approved: { label: 'Aprovado', icon: CheckCircle2, color: 'text-blue-400 bg-blue-500/20' },
  delivered: { label: 'Entregue', icon: Package, color: 'text-green-400 bg-green-500/20' },
  rejected: { label: 'Rejeitado', icon: XCircle, color: 'text-red-400 bg-red-500/20' },
}

export function UserRewardsManagement() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const { data: userRewards, isLoading, refetch } = useAdminUserRewards({ status: statusFilter !== 'all' ? statusFilter : undefined })
  const updateUserReward = useUpdateUserReward()

  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpdateStatus = async (userReward: UserReward, status: string) => {
    try {
      await updateUserReward.mutateAsync({
        id: userReward.id,
        data: { status },
      })
      setSuccess(`Resgate ${status === 'approved' ? 'aprovado' : status === 'delivered' ? 'marcado como entregue' : 'rejeitado'} com sucesso!`)
      refetch()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao atualizar status')
    }
  }

  const filteredRewards = userRewards?.filter((ur) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      ur.user?.name?.toLowerCase().includes(searchLower) ||
      ur.reward?.name?.toLowerCase().includes(searchLower)
    )
  })

  const getStatusInfo = (status: string) => {
    return statusConfig[status] || statusConfig.pending
  }

  // Contadores
  const counts = {
    pending: userRewards?.filter((ur) => ur.status === 'pending').length || 0,
    approved: userRewards?.filter((ur) => ur.status === 'approved').length || 0,
    delivered: userRewards?.filter((ur) => ur.status === 'delivered').length || 0,
    rejected: userRewards?.filter((ur) => ur.status === 'rejected').length || 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            Resgates de Prêmios
          </h2>
          <p className="text-gray-400 mt-1">
            Gerencie os prêmios solicitados pelos usuários
          </p>
        </div>
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

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Contadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span className="text-2xl font-bold text-yellow-400">{counts.pending}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Pendentes</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            <span className="text-2xl font-bold text-blue-400">{counts.approved}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Aprovados</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-bold text-green-400">{counts.delivered}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Entregues</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-2xl font-bold text-red-400">{counts.rejected}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1">Rejeitados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por usuário ou prêmio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : filteredRewards && filteredRewards.length > 0 ? (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Usuário</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Prêmio</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-gray-400">Pontos</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-gray-400">Data</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredRewards.map((userReward) => {
                const statusInfo = getStatusInfo(userReward.status)
                const StatusIcon = statusInfo.icon

                return (
                  <motion.tr
                    key={userReward.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-gray-700/30 hover:bg-gray-700/20"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {userReward.user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium">{userReward.user?.name || 'Usuário'}</p>
                          <p className="text-xs text-gray-500">{userReward.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-pink-400" />
                        <span>{userReward.reward?.name || 'Prêmio'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm">
                        {userReward.points_spent?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-400">
                      {userReward.claimed_at
                        ? new Date(userReward.claimed_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {userReward.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(userReward, 'approved')}
                              disabled={updateUserReward.isPending}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(userReward, 'rejected')}
                              disabled={updateUserReward.isPending}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}
                        {userReward.status === 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(userReward, 'delivered')}
                            disabled={updateUserReward.isPending}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <Package className="w-3 h-3" />
                            Entregue
                          </button>
                        )}
                        {(userReward.status === 'delivered' || userReward.status === 'rejected') && (
                          <span className="text-sm text-gray-500">
                            {userReward.status === 'delivered' ? 'Concluído' : 'Finalizado'}
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-8 text-center">
          <Gift className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">Nenhum resgate encontrado</h3>
          <p className="text-gray-400 text-sm">
            {statusFilter !== 'all'
              ? `Não há resgates com status "${statusOptions.find((s) => s.value === statusFilter)?.label}"`
              : 'Os resgates de prêmios aparecerão aqui'}
          </p>
        </div>
      )}
    </div>
  )
}
