import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Star,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Power,
  Zap,
} from 'lucide-react'
import {
  useAdminPointRules,
  useCreatePointRule,
  useUpdatePointRule,
  useDeletePointRule,
} from '@/hooks/useGamification'
import type { PointRule } from '@/types'

const actionTypes = [
  { value: 'lead_created', label: 'Lead Criado', icon: '📥' },
  { value: 'lead_contacted', label: 'Lead Contatado', icon: '📞' },
  { value: 'lead_qualified', label: 'Lead Qualificado', icon: '✅' },
  { value: 'meeting_scheduled', label: 'Reunião Agendada', icon: '📅' },
  { value: 'meeting_completed', label: 'Reunião Realizada', icon: '🤝' },
  { value: 'proposal_sent', label: 'Proposta Enviada', icon: '📄' },
  { value: 'deal_won', label: 'Negócio Fechado', icon: '🎉' },
  { value: 'deal_lost', label: 'Negócio Perdido', icon: '❌' },
  { value: 'stage_advanced', label: 'Avançou de Etapa', icon: '➡️' },
  { value: 'activity_completed', label: 'Atividade Concluída', icon: '✔️' },
  { value: 'task_completed', label: 'Tarefa Concluída', icon: '📋' },
  { value: 'first_contact_today', label: '1º Contato do Dia', icon: '🌅' },
  { value: 'daily_goal', label: 'Meta Diária Batida', icon: '🎯' },
  { value: 'weekly_goal', label: 'Meta Semanal Batida', icon: '🏆' },
  { value: 'fast_response', label: 'Resposta Rápida (< 5min)', icon: '⚡' },
  { value: 'referral_lead', label: 'Lead por Indicação', icon: '👥' },
  { value: 'upsell', label: 'Upsell Realizado', icon: '📈' },
  { value: 'custom', label: 'Ação Customizada', icon: '⚙️' },
]

export function PointRulesManagement() {
  const { data: rules, isLoading, refetch } = useAdminPointRules()
  const createRule = useCreatePointRule()
  const updateRule = useUpdatePointRule()
  const deleteRule = useDeletePointRule()

  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<PointRule | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    action_type: 'lead_created',
    name: '',
    description: '',
    points: 10,
    multiplier: 1,
    conditions: '',
    is_active: true,
  })

  const openModal = (rule?: PointRule) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        action_type: rule.action_type,
        name: rule.name,
        description: rule.description || '',
        points: rule.points,
        multiplier: rule.multiplier,
        conditions: rule.conditions ? JSON.stringify(rule.conditions, null, 2) : '',
        is_active: rule.is_active,
      })
    } else {
      setEditingRule(null)
      setFormData({
        action_type: 'lead_created',
        name: '',
        description: '',
        points: 10,
        multiplier: 1,
        conditions: '',
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
      let conditions = null
      if (formData.conditions.trim()) {
        try {
          conditions = JSON.parse(formData.conditions)
        } catch {
          setError('Condições devem ser um JSON válido')
          return
        }
      }

      const data = {
        ...formData,
        conditions,
      }

      if (editingRule) {
        await updateRule.mutateAsync({
          id: editingRule.id,
          data,
        })
        setSuccess('Regra atualizada com sucesso!')
      } else {
        await createRule.mutateAsync(data)
        setSuccess('Regra criada com sucesso!')
      }
      setShowModal(false)
      refetch()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar regra')
    }
  }

  const handleToggleActive = async (rule: PointRule) => {
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        data: { is_active: !rule.is_active },
      })
      refetch()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao alterar status')
    }
  }

  const handleDelete = async (rule: PointRule) => {
    if (window.confirm(`Tem certeza que deseja excluir a regra "${rule.name}"?`)) {
      try {
        await deleteRule.mutateAsync(rule.id)
        setSuccess('Regra excluída com sucesso!')
        refetch()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao excluir regra')
      }
    }
  }

  const getActionLabel = (actionType: string) => {
    return actionTypes.find((a) => a.value === actionType)?.label || actionType
  }

  const getActionIcon = (actionType: string) => {
    return actionTypes.find((a) => a.value === actionType)?.icon || '⚙️'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Regras de Pontos
          </h2>
          <p className="text-muted-foreground mt-1">
            Defina quantos pontos cada ação vale
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Regra
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

      {/* Lista de Regras */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="bg-muted/50 rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Ação</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Regra</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">Pontos</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">Multi</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <motion.tr
                  key={rule.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`border-b border-border hover:bg-accent/20 ${
                    !rule.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className="text-2xl" title={getActionLabel(rule.action_type)}>
                      {getActionIcon(rule.action_type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">{getActionLabel(rule.action_type)}</p>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg font-bold">
                      +{rule.points}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {rule.multiplier > 1 && (
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                        {rule.multiplier}x
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        rule.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {rule.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(rule)}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.is_active
                            ? 'hover:bg-red-500/20 text-red-400'
                            : 'hover:bg-green-500/20 text-green-400'
                        }`}
                        title={rule.is_active ? 'Desativar' : 'Ativar'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule)}
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
        </div>
      ) : (
        <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">Nenhuma regra configurada</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Crie regras de pontuação para as ações dos vendedores
          </p>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar primeira regra
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
                {editingRule ? 'Editar Regra' : 'Nova Regra'}
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
                <label className="block text-sm text-muted-foreground mb-1">Tipo de Ação</label>
                <select
                  value={formData.action_type}
                  onChange={(e) => {
                    const action = actionTypes.find((a) => a.value === e.target.value)
                    setFormData({
                      ...formData,
                      action_type: e.target.value,
                      name: formData.name || action?.label || '',
                    })
                  }}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-yellow-500 focus:outline-none"
                >
                  {actionTypes.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.icon} {action.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Nome da Regra</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pontos por lead criado"
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">Descrição (opcional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da regra..."
                  rows={2}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-yellow-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Pontos</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-yellow-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Multiplicador</label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    max={10}
                    value={formData.multiplier}
                    onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1 })}
                    className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-yellow-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Condições (JSON - opcional)
                  <span className="text-xs text-muted-foreground ml-2">
                    Ex: {`{"min_value": 1000}`}
                  </span>
                </label>
                <textarea
                  value={formData.conditions}
                  onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                  placeholder='{"min_value": 1000, "pipeline_id": "..."}'
                  rows={3}
                  className="w-full px-4 py-2 bg-accent border border-border rounded-lg focus:border-yellow-500 focus:outline-none font-mono text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-accent text-yellow-500 focus:ring-yellow-500"
                />
                <label htmlFor="is_active" className="text-sm text-muted-foreground">
                  Regra ativa
                </label>
              </div>

              {/* Preview */}
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getActionIcon(formData.action_type)}</span>
                  <div className="flex-1">
                    <p className="font-medium">{formData.name || 'Nome da regra'}</p>
                    <p className="text-xs text-muted-foreground">{getActionLabel(formData.action_type)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xl font-bold text-yellow-400">
                      +{formData.points * formData.multiplier}
                    </span>
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
                  disabled={createRule.isPending || updateRule.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {(createRule.isPending || updateRule.isPending) ? (
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
