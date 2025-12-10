import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Volume2,
  VolumeX,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react'

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
  const [globalSound, setGlobalSound] = useState(true)

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
        <p className="text-gray-400 mt-1">
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

      {/* Som Global */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {globalSound ? (
              <Volume2 className="w-5 h-5 text-green-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">Som de Notificações</p>
              <p className="text-sm text-gray-400">
                Ativar ou desativar todos os sons de notificação
              </p>
            </div>
          </div>
          <button
            onClick={() => setGlobalSound(!globalSound)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              globalSound ? 'bg-green-600' : 'bg-gray-600'
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

      {/* Tabela de Notificações */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">
                Tipo de Notificação
              </th>
              <th className="text-center px-4 py-4 text-sm font-medium text-gray-400">
                <div className="flex items-center justify-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </div>
              </th>
              <th className="text-center px-4 py-4 text-sm font-medium text-gray-400">
                <div className="flex items-center justify-center gap-1">
                  <Smartphone className="w-4 h-4" />
                  Push
                </div>
              </th>
              <th className="text-center px-4 py-4 text-sm font-medium text-gray-400">
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
                className="border-b border-gray-700/30 hover:bg-gray-700/20"
              >
                <td className="px-6 py-4">
                  <p className="font-medium">{setting.label}</p>
                  <p className="text-sm text-gray-400">{setting.description}</p>
                </td>
                <td className="text-center px-4 py-4">
                  <button
                    onClick={() => toggleSetting(setting.key, 'email')}
                    className={`w-10 h-6 rounded-full transition-colors ${
                      setting.email ? 'bg-blue-600' : 'bg-gray-600'
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
                      setting.push ? 'bg-blue-600' : 'bg-gray-600'
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
                      setting.sound && globalSound ? 'bg-blue-600' : 'bg-gray-600'
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

