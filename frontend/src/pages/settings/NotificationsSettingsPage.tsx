import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  Monitor,
  Smartphone,
  Volume2,
  VolumeX,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useSoundSettings } from '@/hooks/useSounds'

interface NotificationSetting {
  key: string
  label: string
  description: string
  email: boolean
  push: boolean
  sound: boolean
}

const defaultSettings: NotificationSetting[] = [
  {
    key: 'new_lead',
    label: 'Novo Lead',
    description: 'Quando um novo lead é criado',
    email: true,
    push: true,
    sound: true,
  },
  {
    key: 'lead_assigned',
    label: 'Lead Atribuído',
    description: 'Quando um lead é atribuído a você',
    email: true,
    push: true,
    sound: true,
  },
  {
    key: 'new_message',
    label: 'Nova Mensagem',
    description: 'Quando receber uma nova mensagem',
    email: false,
    push: true,
    sound: true,
  },
  {
    key: 'task_due',
    label: 'Tarefa Vencendo',
    description: 'Lembrete de tarefas próximas ao vencimento',
    email: true,
    push: true,
    sound: false,
  },
  {
    key: 'appointment_reminder',
    label: 'Lembrete de Agendamento',
    description: 'Notificação antes de reuniões agendadas',
    email: true,
    push: true,
    sound: true,
  },
  {
    key: 'deal_won',
    label: 'Negócio Fechado',
    description: 'Quando um negócio é ganho',
    email: true,
    push: true,
    sound: true,
  },
  {
    key: 'deal_lost',
    label: 'Negócio Perdido',
    description: 'Quando um negócio é perdido',
    email: true,
    push: false,
    sound: false,
  },
]

export function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { permission, isSupported, requestPermission } = useNotifications()
  const { enabled: globalSound, volume, toggle: toggleSound, setVolume } = useSoundSettings()

  const testSound = () => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
      osc.onended = () => ctx.close()
    } catch {}
  }

  const toggleSetting = (key: string, field: 'email' | 'push' | 'sound') => {
    setSettings(prev =>
      prev.map(s =>
        s.key === key ? { ...s, [field]: !s[field] } : s
      )
    )
  }

  const handleSave = async () => {
    setLoading(true)
    // Simulação de salvamento
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-amber-500" />
          Notificações
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure como você deseja receber alertas
        </p>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300">Preferências salvas com sucesso!</p>
        </motion.div>
      )}

      {/* Notificações do Navegador */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium">Notificações do Navegador</p>
              <p className="text-sm text-muted-foreground">
                Receba notificações na área de trabalho quando novas mensagens chegarem
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSupported ? (
              <span className="text-xs text-muted-foreground">Não suportado</span>
            ) : permission === 'granted' ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <BellRing className="w-3.5 h-3.5" />
                Ativado
              </span>
            ) : permission === 'denied' ? (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                Bloqueado pelo navegador
              </span>
            ) : (
              <button
                onClick={requestPermission}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Permitir notificações
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Som Global */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {globalSound ? (
              <Volume2 className="w-5 h-5 text-green-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Som de Notificações</p>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar todos os sons de notificação
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {globalSound && (
              <button
                onClick={testSound}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
              >
                Testar
              </button>
            )}
            <button
              onClick={toggleSound}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                globalSound ? 'bg-green-600' : 'bg-muted-foreground/20'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  globalSound ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Volume slider */}
        {globalSound && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center gap-4">
              <VolumeX className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground w-8">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Notificações */}
      <div className="bg-muted/50 rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                Tipo de Notificação
              </th>
              <th className="text-center px-4 py-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </div>
              </th>
              <th className="text-center px-4 py-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <Smartphone className="w-4 h-4" />
                  Push
                </div>
              </th>
              <th className="text-center px-4 py-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <Volume2 className="w-4 h-4" />
                  Som
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr
                key={setting.key}
                className="border-b border-border/30 hover:bg-accent/20"
              >
                <td className="px-6 py-4">
                  <p className="font-medium">{setting.label}</p>
                  <p className="text-sm text-muted-foreground">{setting.description}</p>
                </td>
                <td className="text-center px-4 py-4">
                  <button
                    onClick={() => toggleSetting(setting.key, 'email')}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      setting.email ? 'bg-blue-600' : 'bg-muted-foreground/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                        setting.email ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
                <td className="text-center px-4 py-4">
                  <button
                    onClick={() => toggleSetting(setting.key, 'push')}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      setting.push ? 'bg-blue-600' : 'bg-muted-foreground/20'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                        setting.push ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
                <td className="text-center px-4 py-4">
                  <button
                    onClick={() => toggleSetting(setting.key, 'sound')}
                    disabled={!globalSound}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      setting.sound && globalSound ? 'bg-blue-600' : 'bg-muted-foreground/20'
                    } ${!globalSound ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                        setting.sound && globalSound ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Salvar Preferências
          </>
        )}
      </button>
    </div>
  )
}

