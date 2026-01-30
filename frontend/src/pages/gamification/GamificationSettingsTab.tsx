import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Bell,
  Calendar,
  Trophy,
  Users,
} from 'lucide-react'
import { useGamificationSettings, useUpdateGamificationSettings } from '@/hooks/useGamification'

const resetPeriodOptions = [
  { value: 'never', label: 'Nunca resetar', description: 'Pontos acumulam para sempre' },
  { value: 'monthly', label: 'Mensal', description: 'Reset no primeiro dia de cada mês' },
  { value: 'quarterly', label: 'Trimestral', description: 'Reset a cada 3 meses' },
  { value: 'yearly', label: 'Anual', description: 'Reset em Janeiro' },
]

export function GamificationSettingsTab() {
  const { data: settings, isLoading, refetch } = useGamificationSettings()
  const updateSettings = useUpdateGamificationSettings()

  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const [formData, setFormData] = useState({
    is_enabled: true,
    reset_period: 'monthly',
    show_leaderboard: true,
    show_points_to_users: true,
    notify_tier_change: true,
    notify_achievement: true,
    notify_leaderboard_change: false,
    leaderboard_size: 10,
    points_display_mode: 'all',
  })

  useEffect(() => {
    if (settings) {
      setFormData({
        is_enabled: settings.is_enabled ?? true,
        reset_period: settings.reset_period ?? 'monthly',
        show_leaderboard: settings.show_leaderboard ?? true,
        show_points_to_users: settings.show_points_to_users ?? true,
        notify_tier_change: settings.notify_tier_change ?? true,
        notify_achievement: settings.notify_achievement ?? true,
        notify_leaderboard_change: settings.notify_leaderboard_change ?? false,
        leaderboard_size: settings.leaderboard_size ?? 10,
        points_display_mode: settings.points_display_mode ?? 'all',
      })
      setHasChanges(false)
    }
  }, [settings])

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSubmit = async () => {
    setError(null)
    try {
      await updateSettings.mutateAsync(formData)
      setSuccess('Configurações salvas com sucesso!')
      setHasChanges(false)
      refetch()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar configurações')
    }
  }

  const handleReset = () => {
    if (settings) {
      setFormData({
        is_enabled: settings.is_enabled ?? true,
        reset_period: settings.reset_period ?? 'monthly',
        show_leaderboard: settings.show_leaderboard ?? true,
        show_points_to_users: settings.show_points_to_users ?? true,
        notify_tier_change: settings.notify_tier_change ?? true,
        notify_achievement: settings.notify_achievement ?? true,
        notify_leaderboard_change: settings.notify_leaderboard_change ?? false,
        leaderboard_size: settings.leaderboard_size ?? 10,
        points_display_mode: settings.points_display_mode ?? 'all',
      })
      setHasChanges(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-muted-foreground" />
            Configurações
          </h2>
          <p className="text-muted-foreground mt-1">
            Ajustes gerais do sistema de gamificação
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-muted-foreground/20 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Descartar
            </button>
            <button
              onClick={handleSubmit}
              disabled={updateSettings.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </button>
          </div>
        )}
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

      <div className="space-y-6">
        {/* Ativar/Desativar */}
        <div className="bg-muted/50 rounded-xl border border-border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Sistema de Gamificação</h3>
                <p className="text-sm text-muted-foreground">
                  Ativar ou desativar todo o sistema de gamificação
                </p>
              </div>
            </div>
            <button
              onClick={() => handleChange('is_enabled', !formData.is_enabled)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                formData.is_enabled ? 'bg-purple-600' : 'bg-muted-foreground/20'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                  formData.is_enabled ? 'left-8' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Período de Reset */}
        <div className="bg-muted/50 rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Período de Reset</h3>
              <p className="text-sm text-muted-foreground">
                Quando os pontos dos usuários serão zerados
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {resetPeriodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleChange('reset_period', option.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  formData.reset_period === option.value
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-border bg-accent hover:border-border'
                }`}
              >
                <p className="font-medium text-sm">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Visibilidade */}
        <div className="bg-muted/50 rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold">Visibilidade</h3>
              <p className="text-sm text-muted-foreground">
                O que os usuários podem ver
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Mostrar Leaderboard</p>
                  <p className="text-xs text-muted-foreground">Ranking visível para todos</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.show_leaderboard}
                onChange={(e) => handleChange('show_leaderboard', e.target.checked)}
                className="w-5 h-5 rounded border-border bg-accent text-purple-500 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                {formData.show_points_to_users ? (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Mostrar Pontos</p>
                  <p className="text-xs text-muted-foreground">Usuários veem seus pontos</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.show_points_to_users}
                onChange={(e) => handleChange('show_points_to_users', e.target.checked)}
                className="w-5 h-5 rounded border-border bg-accent text-purple-500 focus:ring-purple-500"
              />
            </label>
          </div>

          {formData.show_leaderboard && (
            <div className="mt-4 pt-4 border-t border-border">
              <label className="block text-sm text-muted-foreground mb-2">
                Tamanho do Leaderboard
              </label>
              <input
                type="number"
                min={3}
                max={50}
                value={formData.leaderboard_size}
                onChange={(e) => handleChange('leaderboard_size', parseInt(e.target.value) || 10)}
                className="w-32 px-4 py-2 bg-accent border border-border rounded-lg focus:border-purple-500 focus:outline-none"
              />
              <span className="text-sm text-muted-foreground ml-2">usuários</span>
            </div>
          )}
        </div>

        {/* Notificações */}
        <div className="bg-muted/50 rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">Notificações</h3>
              <p className="text-sm text-muted-foreground">
                Quando notificar os usuários
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Mudança de Tier</p>
                <p className="text-xs text-muted-foreground">Notificar quando subir de nível</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notify_tier_change}
                onChange={(e) => handleChange('notify_tier_change', e.target.checked)}
                className="w-5 h-5 rounded border-border bg-accent text-purple-500 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Conquistas</p>
                <p className="text-xs text-muted-foreground">Notificar ao desbloquear conquista</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notify_achievement}
                onChange={(e) => handleChange('notify_achievement', e.target.checked)}
                className="w-5 h-5 rounded border-border bg-accent text-purple-500 focus:ring-purple-500"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Posição no Ranking</p>
                <p className="text-xs text-muted-foreground">Notificar mudanças no ranking</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notify_leaderboard_change}
                onChange={(e) => handleChange('notify_leaderboard_change', e.target.checked)}
                className="w-5 h-5 rounded border-border bg-accent text-purple-500 focus:ring-purple-500"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Botão de salvar fixo se houver mudanças */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 flex items-center gap-2"
        >
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-muted-foreground/20 rounded-lg transition-colors shadow-lg"
          >
            <RotateCcw className="w-4 h-4" />
            Descartar
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors shadow-lg disabled:opacity-50"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alterações
          </button>
        </motion.div>
      )}
    </div>
  )
}
