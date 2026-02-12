import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  email: boolean
  push: boolean
  sound: boolean
}

const defaultSettings: NotificationSetting[] = [
  { key: 'new_lead', email: true, push: true, sound: true },
  { key: 'lead_assigned', email: true, push: true, sound: true },
  { key: 'new_message', email: false, push: true, sound: true },
  { key: 'task_due', email: true, push: true, sound: false },
  { key: 'appointment_reminder', email: true, push: true, sound: true },
  { key: 'deal_won', email: true, push: true, sound: true },
  { key: 'deal_lost', email: true, push: false, sound: false },
]

export function NotificationsSettingsPage() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { permission, isSupported, requestPermission } = useNotifications()
  const { enabled: globalSound, volume, toggle: toggleSound, setVolume } = useSoundSettings()

  const testSound = () => {
    try {
      const ctx = new AudioContext()
      const gain = ctx.createGain()
      gain.connect(ctx.destination)

      const osc1 = ctx.createOscillator()
      osc1.connect(gain)
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, ctx.currentTime)
      osc1.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.15)

      const osc2 = ctx.createOscillator()
      osc2.connect(gain)
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.15)
      osc2.start(ctx.currentTime + 0.15)
      osc2.stop(ctx.currentTime + 0.35)

      gain.gain.setValueAtTime(volume * 0.8, ctx.currentTime)
      gain.gain.setValueAtTime(volume * 0.8, ctx.currentTime + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

      osc2.onended = () => ctx.close()
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
          {t('notificationsPage.title')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('notificationsPage.subtitle')}
        </p>
      </div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300">{t('notificationsPage.saveSuccess')}</p>
        </motion.div>
      )}

      {/* Notificações do Navegador */}
      <div className="bg-muted/50 rounded-xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium">{t('notificationsPage.browserNotifications')}</p>
              <p className="text-sm text-muted-foreground">
                {t('notificationsPage.browserNotificationsDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSupported ? (
              <span className="text-xs text-muted-foreground">{t('notificationsPage.notSupported')}</span>
            ) : permission === 'granted' ? (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <BellRing className="w-3.5 h-3.5" />
                {t('notificationsPage.enabled')}
              </span>
            ) : permission === 'denied' ? (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t('notificationsPage.blockedByBrowser')}
              </span>
            ) : (
              <button
                onClick={requestPermission}
                className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                {t('notificationsPage.allowNotifications')}
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
              <p className="font-medium">{t('notificationsPage.notificationSound')}</p>
              <p className="text-sm text-muted-foreground">
                {t('notificationsPage.notificationSoundDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {globalSound && (
              <button
                onClick={testSound}
                className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
              >
                {t('notificationsPage.test')}
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
                {t('notificationsPage.notificationType')}
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
                  <p className="font-medium">{t(`notificationsPage.types.${setting.key}`)}</p>
                  <p className="text-sm text-muted-foreground">{t(`notificationsPage.types.${setting.key}_desc`)}</p>
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
            {t('notificationsPage.saving')}
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {t('notificationsPage.savePreferences')}
          </>
        )}
      </button>
    </div>
  )
}

