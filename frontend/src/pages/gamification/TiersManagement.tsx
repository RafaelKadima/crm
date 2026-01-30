import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  GripVertical,
} from 'lucide-react'
import {
  useAdminTiers,
  useCreateTier,
  useUpdateTier,
  useDeleteTier,
} from '@/hooks/useGamification'
import type { GamificationTier } from '@/types'

const iconOptions = [
  '🥉', '🥈', '🥇', '💎', '👑', '🌟', '⭐', '🏆', '🎖️', '🏅',
  '💫', '✨', '🔥', '💪', '🚀', '💯', '🎯', '🏵️', '🎗️', '🌈',
]

const colorOptions = [
  { name: 'Bronze', value: '#CD7F32' },
  { name: 'Prata', value: '#C0C0C0' },
  { name: 'Ouro', value: '#FFD700' },
  { name: 'Platina', value: '#E5E4E2' },
  { name: 'Diamante', value: '#B9F2FF' },
  { name: 'Esmeralda', value: '#50C878' },
  { name: 'Rubi', value: '#E0115F' },
  { name: 'Safira', value: '#0F52BA' },
  { name: 'Ametista', value: '#9966CC' },
  { name: 'Obsidiana', value: '#3D3D3D' },
]

export function TiersManagement() {
  const { data: tiers, isLoading, refetch } = useAdminTiers()
  const createTier = useCreateTier()
  const updateTier = useUpdateTier()
  const deleteTier = useDeleteTier()

  const [showModal, setShowModal] = useState(false)
  const [editingTier, setEditingTier] = useState<GamificationTier | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    icon: '🥉',
    color: '#CD7F32',
    min_points: 0,
    max_points: 999,
    multiplier: 1,
    description: '',
  })

  const openModal = (tier?: GamificationTier) => {
    if (tier) {
      setEditingTier(tier)
      setFormData({
        name: tier.name,
        icon: tier.icon,
        color: tier.color,
        min_points: tier.min_points,
        max_points: tier.max_points || 999999,
        multiplier: tier.multiplier,
        description: tier.description || '',
      })
    } else {
      setEditingTier(null)
      // Sugerir próximo range baseado nos tiers existentes
      const maxPoint = tiers?.reduce((max, t) => Math.max(max, t.max_points || 0), 0) || 0
      setFormData({
        name: '',
        icon: '🥉',
        color: '#CD7F32',
        min_points: maxPoint + 1,
        max_points: maxPoint + 1000,
        multiplier: 1,
        description: '',
      })
    }
    setShowModal(true)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (editingTier) {
        await updateTier.mutateAsync({
          id: editingTier.id,
          data: formData,
        })
        setSuccess('Tier atualizado com sucesso!')
      } else {
        await createTier.mutateAsync(formData)
        setSuccess('Tier criado com sucesso!')
      }
      setShowModal(false)
      refetch()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar tier')
    }
  }

  const handleDelete = async (tier: GamificationTier) => {
    if (window.confirm(`Tem certeza que deseja excluir o tier "${tier.name}"?`)) {
      try {
        await deleteTier.mutateAsync(tier.id)
        setSuccess('Tier excluído com sucesso!')
        refetch()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao excluir tier')
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Níveis (Tiers)
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure os níveis de progressão dos vendedores
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Tier
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

      {/* Lista de Tiers */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : tiers && tiers.length > 0 ? (
        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-muted/50 rounded-xl border border-border p-4 flex items-center gap-4"
            >
              <div className="cursor-grab text-muted-foreground">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Icon e cor */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: tier.color + '30', borderColor: tier.color }}
              >
                {tier.icon}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{tier.name}</h3>
                  {tier.multiplier > 1 && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                      {tier.multiplier}x pontos
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {tier.min_points.toLocaleString()} - {tier.max_points ? tier.max_points.toLocaleString() : '∞'} pontos
                </p>
                {tier.description && (
                  <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                )}
              </div>

              {/* Barra visual */}
              <div className="hidden md:block w-32">
                <div className="h-2 bg-accent rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (tier.min_points / 10000) * 100)}%`,
                      backgroundColor: tier.color,
                    }}
                  />
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal(tier)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(tier)}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">Nenhum tier configurado</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Crie níveis de progressão para motivar sua equipe
          </p>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar primeiro tier
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
                {editingTier ? 'Editar Tier' : 'Novo Tier'}
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
                <label className="block text-sm text-muted-foreground mb-1">Nome do Tier</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Bronze, Prata, Ouro..."
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 text-xl rounded-lg transition-all ${
                        formData.icon === icon
                          ? 'bg-purple-600 scale-110'
                          : 'bg-accent hover:bg-muted-foreground/20'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      title={color.name}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        formData.color === color.value
                          ? 'ring-2 ring-white scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Pontos Mínimos</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.min_points}
                    onChange={(e) => setFormData({ ...formData, min_points: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Pontos Máximos</label>
                  <input
                    type="number"
                    min={formData.min_points + 1}
                    value={formData.max_points}
                    onChange={(e) => setFormData({ ...formData, max_points: parseInt(e.target.value) || 0 })}
                    placeholder="Deixe vazio para ∞"
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Multiplicador de Pontos
                  <span className="text-xs text-muted-foreground ml-2">
                    (Bônus ao ganhar pontos neste tier)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={1}
                  max={5}
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Descrição (opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do tier e benefícios..."
                  rows={2}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              {/* Preview */}
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: formData.color + '30' }}
                  >
                    {formData.icon}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: formData.color }}>
                      {formData.name || 'Nome do Tier'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.min_points.toLocaleString()} - {formData.max_points ? formData.max_points.toLocaleString() : '∞'} pts
                    </p>
                  </div>
                </div>
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
                  disabled={createTier.isPending || updateTier.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {(createTier.isPending || updateTier.isPending) ? (
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
