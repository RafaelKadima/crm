import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Eye, ToggleLeft, ToggleRight, Loader2, MessageSquare, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import api from '@/api/axios'

interface QueueMenuConfigProps {
  channelId: string
  channelName: string
  onUpdate?: () => void
}

interface MenuSettings {
  queue_menu_enabled: boolean
  queue_menu_header: string
  queue_menu_footer: string
  queue_menu_invalid_response: string
  return_timeout_hours: number
}

export function QueueMenuConfig({ channelId, channelName, onUpdate }: QueueMenuConfigProps) {
  const [settings, setSettings] = useState<MenuSettings>({
    queue_menu_enabled: false,
    queue_menu_header: '',
    queue_menu_footer: '',
    queue_menu_invalid_response: '',
    return_timeout_hours: 24,
  })
  const [preview, setPreview] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Carrega configurações atuais
  useEffect(() => {
    loadSettings()
  }, [channelId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/channels/${channelId}`)
      const channel = response.data
      
      setSettings({
        queue_menu_enabled: channel.queue_menu_enabled || false,
        queue_menu_header: channel.queue_menu_header || '',
        queue_menu_footer: channel.queue_menu_footer || '',
        queue_menu_invalid_response: channel.queue_menu_invalid_response || '',
        return_timeout_hours: channel.return_timeout_hours || 24,
      })
      
      // Carrega preview
      loadPreview()
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPreview = async () => {
    try {
      const response = await api.get(`/channels/${channelId}/queue-menu/preview`)
      setPreview(response.data.menu_text || '')
    } catch (error) {
      console.error('Error loading preview:', error)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await api.put(`/channels/${channelId}/queue-menu`, settings)
      loadPreview()
      onUpdate?.()
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    const newEnabled = !settings.queue_menu_enabled
    setSettings(prev => ({ ...prev, queue_menu_enabled: newEnabled }))
    
    try {
      setSaving(true)
      await api.put(`/channels/${channelId}/queue-menu`, {
        ...settings,
        queue_menu_enabled: newEnabled,
      })
      loadPreview()
      onUpdate?.()
    } catch (error) {
      console.error('Error toggling menu:', error)
      setSettings(prev => ({ ...prev, queue_menu_enabled: !newEnabled }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold">Configuração do Menu</h3>
            <p className="text-xs text-gray-400">Canal: {channelName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <span className="text-sm">
              {settings.queue_menu_enabled ? 'Ativo' : 'Inativo'}
            </span>
            {settings.queue_menu_enabled ? (
              <ToggleRight className="w-8 h-8 text-green-500" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {!settings.queue_menu_enabled && (
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-400 font-medium">Menu desativado</p>
              <p className="text-xs text-gray-400 mt-1">
                Ative o menu para que os leads possam escolher a fila de atendimento antes de falar com o agente.
              </p>
            </div>
          </div>
        )}

        {/* Header do Menu */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Mensagem de Abertura
          </label>
          <textarea
            value={settings.queue_menu_header}
            onChange={(e) => setSettings(prev => ({ ...prev, queue_menu_header: e.target.value }))}
            placeholder="Olá! Para melhor atendê-lo, escolha uma opção:"
            rows={2}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Texto exibido antes das opções do menu
          </p>
        </div>

        {/* Opções são geradas automaticamente pelas filas */}
        <div className="p-3 bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-400">
            <MessageSquare className="w-4 h-4 inline mr-2" />
            As opções do menu são geradas automaticamente pelas filas cadastradas.
          </p>
        </div>

        {/* Footer do Menu */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Mensagem de Instrução
          </label>
          <textarea
            value={settings.queue_menu_footer}
            onChange={(e) => setSettings(prev => ({ ...prev, queue_menu_footer: e.target.value }))}
            placeholder="Digite o número da opção desejada."
            rows={2}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Texto exibido após as opções do menu
          </p>
        </div>

        {/* Resposta Inválida */}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Mensagem de Opção Inválida
          </label>
          <textarea
            value={settings.queue_menu_invalid_response}
            onChange={(e) => setSettings(prev => ({ ...prev, queue_menu_invalid_response: e.target.value }))}
            placeholder="Desculpe, não entendi. Por favor, digite apenas o número da opção desejada."
            rows={2}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Texto enviado quando o cliente digita uma opção inválida
          </p>
        </div>

        {/* Timeout de Retorno */}
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
          <label className="block text-sm font-medium mb-1.5">
            Timeout de Retorno (horas)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={settings.return_timeout_hours}
              onChange={(e) => setSettings(prev => ({ ...prev, return_timeout_hours: parseInt(e.target.value) || 24 }))}
              min={1}
              max={720}
              className="w-24 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <span className="text-sm text-gray-400">horas</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Se o lead enviar mensagem dentro deste período após encerramento, 
            vai direto pro último atendente (sem passar pelo menu).
          </p>
          <div className="mt-2 text-xs text-gray-400">
            Sugestões: 24h (1 dia) • 48h (2 dias) • 168h (1 semana)
          </div>
        </div>

        {/* Preview */}
        {showPreview && preview && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Preview do Menu</label>
            <div className="bg-[#075E54] rounded-lg p-4">
              <div className="bg-white text-black p-3 rounded-lg max-w-[85%] whitespace-pre-line text-sm">
                {preview || 'Configure as filas para ver o preview do menu.'}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Ocultar' : 'Ver'} Preview
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

