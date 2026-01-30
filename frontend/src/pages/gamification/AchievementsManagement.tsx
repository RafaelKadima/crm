import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Medal,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Power,
  Target,
} from 'lucide-react'
import {
  useAdminAchievements,
  useCreateAchievement,
  useUpdateAchievement,
  useDeleteAchievement,
} from '@/hooks/useGamification'
import type { Achievement } from '@/types'

const conditionTypes = [
  { value: 'first_sale', label: 'Primeira Venda', icon: '🎯', valueLabel: 'N/A' },
  { value: 'total_deals', label: 'Total de Deals Ganhos', icon: '💰', valueLabel: 'Quantidade' },
  { value: 'total_calls', label: 'Total de Ligações', icon: '📞', valueLabel: 'Quantidade' },
  { value: 'total_meetings', label: 'Total de Reuniões', icon: '🤝', valueLabel: 'Quantidade' },
  { value: 'streak_days', label: 'Dias Consecutivos', icon: '🔥', valueLabel: 'Dias' },
  { value: 'monthly_target', label: 'Meta Mensal', icon: '📈', valueLabel: 'N/A' },
  { value: 'deal_value', label: 'Deal Acima de Valor', icon: '💎', valueLabel: 'Valor (R$)' },
  { value: 'activities_day', label: 'Atividades no Dia', icon: '✅', valueLabel: 'Quantidade' },
  { value: 'perfect_week', label: 'Semana Perfeita', icon: '⭐', valueLabel: 'N/A' },
  { value: 'tier_reached', label: 'Tier Alcançado', icon: '🏆', valueLabel: 'Ordem do Tier' },
]

const badgeIcons = [
  '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '💎', '👑', '⭐', '🌟',
  '💫', '✨', '🔥', '⚡', '💪', '🚀', '🎯', '💯', '🏵️', '🎗️',
  '🦁', '🦅', '🐉', '🦄', '🐺', '🦈', '🐅', '🦊', '🐻', '🦉',
]

export function AchievementsManagement() {
  const { data: achievements, isLoading, refetch } = useAdminAchievements()
  const createAchievement = useCreateAchievement()
  const updateAchievement = useUpdateAchievement()
  const deleteAchievement = useDeleteAchievement()

  const [showModal, setShowModal] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🏆',
    condition_type: 'total_deals',
    condition_value: 1,
    points_bonus: 100,
    is_active: true,
  })

  const openModal = (achievement?: Achievement) => {
    if (achievement) {
      setEditingAchievement(achievement)
      // Extrair o valor da condição do objeto
      const condValue = achievement.condition_value as Record<string, unknown>
      const numericValue = (condValue?.count as number) ||
                          (condValue?.min as number) ||
                          (condValue?.min_value as number) ||
                          (condValue?.days as number) ||
                          (condValue?.tier_order as number) || 1
      setFormData({
        name: achievement.name,
        description: achievement.description || '',
        icon: achievement.icon,
        condition_type: achievement.condition_type,
        condition_value: numericValue,
        points_bonus: achievement.points_bonus,
        is_active: achievement.is_active,
      })
    } else {
      setEditingAchievement(null)
      setFormData({
        name: '',
        description: '',
        icon: '🏆',
        condition_type: 'total_deals',
        condition_value: 1,
        points_bonus: 100,
        is_active: true,
      })
    }
    setShowModal(true)
    setError(null)
  }

  // Converter o valor numérico para o formato esperado pelo backend
  const buildConditionValue = (conditionType: string, value: number): Record<string, unknown> => {
    switch (conditionType) {
      case 'first_sale':
      case 'monthly_target':
      case 'perfect_week':
        return { min: 1 }
      case 'deal_value':
        return { min_value: value }
      case 'streak_days':
        return { days: value }
      case 'tier_reached':
        return { tier_order: value }
      default:
        return { count: value }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const data = {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        condition_type: formData.condition_type,
        condition_value: buildConditionValue(formData.condition_type, formData.condition_value),
        points_bonus: formData.points_bonus,
        is_active: formData.is_active,
      }

      if (editingAchievement) {
        await updateAchievement.mutateAsync({
          id: editingAchievement.id,
          data,
        })
        setSuccess('Conquista atualizada com sucesso!')
      } else {
        await createAchievement.mutateAsync(data)
        setSuccess('Conquista criada com sucesso!')
      }
      setShowModal(false)
      refetch()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar conquista')
    }
  }

  const handleToggleActive = async (achievement: Achievement) => {
    try {
      await updateAchievement.mutateAsync({
        id: achievement.id,
        data: { is_active: !achievement.is_active },
      })
      refetch()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao alterar status')
    }
  }

  const handleDelete = async (achievement: Achievement) => {
    if (window.confirm(`Tem certeza que deseja excluir "${achievement.name}"?`)) {
      try {
        await deleteAchievement.mutateAsync(achievement.id)
        setSuccess('Conquista excluída com sucesso!')
        refetch()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao excluir conquista')
      }
    }
  }

  const getConditionInfo = (conditionType: string) => {
    return conditionTypes.find((c) => c.value === conditionType) || conditionTypes[1]
  }

  const getConditionValueDisplay = (achievement: Achievement) => {
    const condValue = achievement.condition_value as Record<string, unknown>
    return (condValue?.count as number) ||
           (condValue?.min as number) ||
           (condValue?.min_value as number) ||
           (condValue?.days as number) ||
           (condValue?.tier_order as number) || '-'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Medal className="w-6 h-6 text-amber-500" />
            Conquistas
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure badges e achievements para sua equipe
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Conquista
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

      {/* Lista de Conquistas */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      ) : achievements && achievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievements.map((achievement, index) => {
            const conditionInfo = getConditionInfo(achievement.condition_type)
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`bg-muted/50 rounded-xl border border-border overflow-hidden ${
                  !achievement.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="h-2 bg-amber-500" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-amber-500/20">
                      {achievement.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{achievement.name}</h4>
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        {conditionInfo.icon} {conditionInfo.label}
                      </span>
                      {achievement.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {achievement.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
                        +{achievement.points_bonus} pts
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {getConditionValueDisplay(achievement)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openModal(achievement)}
                        className="p-1.5 hover:bg-accent rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(achievement)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          achievement.is_active
                            ? 'hover:bg-red-500/20 text-red-400'
                            : 'hover:bg-green-500/20 text-green-400'
                        }`}
                        title={achievement.is_active ? 'Desativar' : 'Ativar'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(achievement)}
                        className="p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
          <Medal className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">Nenhuma conquista configurada</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Crie badges e achievements para engajar sua equipe
          </p>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar primeira conquista
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
                {editingAchievement ? 'Editar Conquista' : 'Nova Conquista'}
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
                  placeholder="Ex: Primeiro de Muitos"
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-2">Icone</label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {badgeIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 text-xl rounded-lg transition-all ${
                        formData.icon === icon
                          ? 'bg-amber-600 scale-110'
                          : 'bg-accent hover:bg-muted-foreground/20'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Tipo de Condicao</label>
                <select
                  value={formData.condition_type}
                  onChange={(e) => setFormData({ ...formData, condition_type: e.target.value })}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-amber-500 focus:outline-none"
                >
                  {conditionTypes.map((cond) => (
                    <option key={cond.value} value={cond.value}>
                      {cond.icon} {cond.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Descricao</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descricao da conquista..."
                  rows={2}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Pontos Bonus</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.points_bonus}
                    onChange={(e) => setFormData({ ...formData, points_bonus: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    {getConditionInfo(formData.condition_type).valueLabel}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.condition_value}
                    onChange={(e) => setFormData({ ...formData, condition_value: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-amber-500 focus:outline-none"
                    disabled={['first_sale', 'monthly_target', 'perfect_week'].includes(formData.condition_type)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-accent text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="is_active" className="text-sm text-muted-foreground">
                  Conquista ativa
                </label>
              </div>

              {/* Preview */}
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-amber-500/20">
                    {formData.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{formData.name || 'Nome da conquista'}</p>
                    <p className="text-xs text-amber-400">
                      {getConditionInfo(formData.condition_type).icon} {getConditionInfo(formData.condition_type).label}
                    </p>
                    <p className="text-xs text-muted-foreground">{formData.description || 'Descricao...'}</p>
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
                  disabled={createAchievement.isPending || updateAchievement.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {(createAchievement.isPending || updateAchievement.isPending) ? (
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
