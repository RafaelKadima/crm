import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Gift,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Power,
  Package,
} from 'lucide-react'
import {
  useAdminRewards,
  useCreateReward,
  useUpdateReward,
  useDeleteReward,
  useAdminTiers,
} from '@/hooks/useGamification'
import type { Reward } from '@/types'

const rewardTypes = [
  { value: 'physical', label: 'Físico', icon: '📦', description: 'Produto físico a ser entregue' },
  { value: 'digital', label: 'Digital', icon: '🎮', description: 'Voucher, código, etc.' },
  { value: 'experience', label: 'Experiência', icon: '🎪', description: 'Day-off, almoço, etc.' },
  { value: 'bonus', label: 'Bônus', icon: '💰', description: 'Bônus financeiro' },
  { value: 'badge', label: 'Badge', icon: '🏅', description: 'Badge especial no perfil' },
  { value: 'custom', label: 'Customizado', icon: '⭐', description: 'Outro tipo de prêmio' },
]

export function RewardsManagement() {
  const { data: rewards, isLoading, refetch } = useAdminRewards()
  const { data: tiers } = useAdminTiers()
  const createReward = useCreateReward()
  const updateReward = useUpdateReward()
  const deleteReward = useDeleteReward()

  const [showModal, setShowModal] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'physical',
    image_url: '',
    tier_id: '',
    points_required: 0,
    stock: null as number | null,
    is_active: true,
  })

  const openModal = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward)
      setFormData({
        name: reward.name,
        description: reward.description || '',
        type: reward.type,
        image_url: reward.image_url || '',
        tier_id: reward.tier_id || '',
        points_required: reward.points_required || 0,
        stock: reward.stock,
        is_active: reward.is_active,
      })
    } else {
      setEditingReward(null)
      setFormData({
        name: '',
        description: '',
        type: 'physical',
        image_url: '',
        tier_id: '',
        points_required: 0,
        stock: null,
        is_active: true,
      })
    }
    setShowModal(true)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const data = {
        ...formData,
        tier_id: formData.tier_id || null,
        stock: formData.stock === null ? null : formData.stock,
      }

      if (editingReward) {
        await updateReward.mutateAsync({
          id: editingReward.id,
          data,
        })
        setSuccess('Recompensa atualizada com sucesso!')
      } else {
        await createReward.mutateAsync(data)
        setSuccess('Recompensa criada com sucesso!')
      }
      setShowModal(false)
      refetch()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar recompensa')
    }
  }

  const handleToggleActive = async (reward: Reward) => {
    try {
      await updateReward.mutateAsync({
        id: reward.id,
        data: { is_active: !reward.is_active },
      })
      refetch()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao alterar status')
    }
  }

  const handleDelete = async (reward: Reward) => {
    if (window.confirm(`Tem certeza que deseja excluir "${reward.name}"?`)) {
      try {
        await deleteReward.mutateAsync(reward.id)
        setSuccess('Recompensa excluída com sucesso!')
        refetch()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao excluir recompensa')
      }
    }
  }

  const getTypeInfo = (type: string) => {
    return rewardTypes.find((t) => t.value === type) || rewardTypes[5]
  }

  const getTierName = (tierId: string | null) => {
    if (!tierId) return null
    const tier = tiers?.find((t) => t.id === tierId)
    return tier ? { name: tier.name, icon: tier.icon, color: tier.color } : null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6 text-pink-500" />
            Recompensas
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure os prêmios que os vendedores podem resgatar
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Recompensa
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

      {/* Lista de Recompensas */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
        </div>
      ) : rewards && rewards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map((reward, index) => {
            const typeInfo = getTypeInfo(reward.type)
            const tierInfo = getTierName(reward.tier_id)

            return (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-muted/50 rounded-xl border border-border overflow-hidden ${
                  !reward.is_active ? 'opacity-50' : ''
                }`}
              >
                {/* Imagem ou placeholder */}
                <div className="h-32 bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                  {reward.image_url ? (
                    <img
                      src={reward.image_url}
                      alt={reward.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">{typeInfo.icon}</span>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{reward.name}</h3>
                      <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
                    </div>
                    {tierInfo && (
                      <div
                        className="px-2 py-1 rounded text-xs flex items-center gap-1"
                        style={{ backgroundColor: tierInfo.color + '30', color: tierInfo.color }}
                      >
                        {tierInfo.icon} {tierInfo.name}
                      </div>
                    )}
                  </div>

                  {reward.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {reward.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    {reward.points_required > 0 && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm font-medium">
                        {reward.points_required.toLocaleString()} pts
                      </span>
                    )}
                    {reward.stock !== null && (
                      <span className="text-xs text-muted-foreground">
                        Estoque: {reward.stock}
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => openModal(reward)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(reward)}
                      className={`p-2 rounded-lg transition-colors ${
                        reward.is_active
                          ? 'hover:bg-red-500/20 text-red-400'
                          : 'hover:bg-green-500/20 text-green-400'
                      }`}
                      title={reward.is_active ? 'Desativar' : 'Ativar'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(reward)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
          <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">Nenhuma recompensa configurada</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Crie prêmios para motivar sua equipe
          </p>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar primeira recompensa
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-muted rounded-xl border border-border p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingReward ? 'Editar Recompensa' : 'Nova Recompensa'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-accent rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Camiseta da empresa"
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {rewardTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`p-3 rounded-lg border transition-all text-center ${
                        formData.type === type.value
                          ? 'border-pink-500 bg-pink-500/20'
                          : 'border-border bg-accent hover:border-muted-foreground/30'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{type.icon}</span>
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da recompensa..."
                  rows={2}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-pink-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">URL da Imagem (opcional)</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-pink-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Tier Mínimo (opcional)
                  <span className="text-xs text-muted-foreground ml-2">
                    Só disponível para este tier ou superior
                  </span>
                </label>
                <select
                  value={formData.tier_id}
                  onChange={(e) => setFormData({ ...formData, tier_id: e.target.value })}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-pink-500 focus:outline-none"
                >
                  <option value="">Disponível para todos</option>
                  {tiers?.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.icon} {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Pontos Necessários
                    <span className="text-xs text-muted-foreground ml-2">(0 = grátis)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.points_required}
                    onChange={(e) => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Estoque
                    <span className="text-xs text-muted-foreground ml-2">(vazio = ilimitado)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.stock === null ? '' : formData.stock}
                    onChange={(e) => setFormData({
                      ...formData,
                      stock: e.target.value === '' ? null : parseInt(e.target.value),
                    })}
                    placeholder="Ilimitado"
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-accent text-pink-500 focus:ring-pink-500"
                />
                <label htmlFor="is_active" className="text-sm text-muted-foreground">
                  Recompensa ativa
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-accent hover:bg-muted-foreground/20 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createReward.isPending || updateReward.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {(createReward.isPending || updateReward.isPending) ? (
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
    </div>
  )
}
