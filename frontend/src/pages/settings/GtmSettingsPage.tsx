import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Code,
  Webhook,
  Zap,
  ChevronDown,
  ChevronUp,
  Settings,
  HelpCircle,
} from 'lucide-react'
import {
  useGtmSettings,
  useUpdateGtmSettings,
  usePipelineEvents,
  useUpdatePipelineEvents,
  useEventSuggestions,
} from '@/hooks/useGtm'
import { usePipelines } from '@/hooks/usePipelines'

export function GtmSettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useGtmSettings()
  const { data: pipelines } = usePipelines()
  const { data: suggestions } = useEventSuggestions()
  const updateSettings = useUpdateGtmSettings()

  const [formData, setFormData] = useState({
    gtm_container_id: '',
    gtm_enabled: false,
    gtm_webhook_url: '',
    ga4_measurement_id: '',
  })

  const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setFormData({
        gtm_container_id: settings.gtm_container_id || '',
        gtm_enabled: settings.gtm_enabled || false,
        gtm_webhook_url: settings.gtm_webhook_url || '',
        ga4_measurement_id: settings.ga4_measurement_id || '',
      })
    }
  }, [settings])

  const handleSaveSettings = async () => {
    setError(null)
    setSuccess(false)

    try {
      await updateSettings.mutateAsync(formData)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar configurações')
    }
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-500" />
          Google Tag Manager
        </h2>
        <p className="text-gray-400 mt-1">
          Configure a integração com GTM para rastrear eventos do funil de vendas
        </p>
      </div>

      {/* Mensagens */}
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

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-300">Configurações salvas com sucesso!</p>
        </motion.div>
      )}

      {/* Configurações Gerais */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Configurações do Container
        </h3>

        <div className="space-y-4">
          {/* Toggle Ativação */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div>
              <p className="font-medium">Ativar Google Tag Manager</p>
              <p className="text-sm text-gray-400">Habilitar o rastreamento de eventos no GTM</p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, gtm_enabled: !formData.gtm_enabled })}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                formData.gtm_enabled ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  formData.gtm_enabled ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GTM Container ID */}
            <div>
              <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                <Code className="w-4 h-4" />
                GTM Container ID
              </label>
              <input
                type="text"
                value={formData.gtm_container_id}
                onChange={(e) => setFormData({ ...formData, gtm_container_id: e.target.value })}
                placeholder="GTM-XXXXXXX"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Encontre no GTM: Admin → Container Settings
              </p>
            </div>

            {/* GA4 Measurement ID */}
            <div>
              <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                GA4 Measurement ID (opcional)
              </label>
              <input
                type="text"
                value={formData.ga4_measurement_id}
                onChange={(e) => setFormData({ ...formData, ga4_measurement_id: e.target.value })}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Para rastreamento direto no GA4
              </p>
            </div>
          </div>

          {/* Webhook URL */}
          <div>
            <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
              <Webhook className="w-4 h-4" />
              Webhook URL (opcional)
            </label>
            <input
              type="url"
              value={formData.gtm_webhook_url}
              onChange={(e) => setFormData({ ...formData, gtm_webhook_url: e.target.value })}
              placeholder="https://seu-servidor.com/webhook/gtm"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Receba eventos em tempo real via webhook (server-side tracking)
            </p>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>

      {/* Eventos por Pipeline */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Eventos por Estágio do Pipeline
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Configure qual evento GTM será disparado quando um lead entrar em cada estágio
        </p>

        <div className="space-y-3">
          {pipelines?.map((pipeline: any) => (
            <PipelineEventConfig
              key={pipeline.id}
              pipeline={pipeline}
              suggestions={suggestions}
              isExpanded={expandedPipeline === pipeline.id}
              onToggle={() => setExpandedPipeline(
                expandedPipeline === pipeline.id ? null : pipeline.id
              )}
            />
          ))}
        </div>
      </div>

      {/* Campos Disponíveis */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Code className="w-5 h-5 text-green-400" />
          Campos Disponíveis no Evento
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Estes campos são enviados automaticamente em cada evento e podem ser usados no GTM:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Lead */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-400 mb-2">Lead</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li><code className="text-xs bg-gray-800 px-1 rounded">lead_id</code> - ID do lead</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">lead_source</code> - Origem</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">value</code> - Valor (R$)</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">currency</code> - Moeda (BRL)</li>
            </ul>
          </div>

          {/* Contato */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="font-medium text-purple-400 mb-2">Contato</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li><code className="text-xs bg-gray-800 px-1 rounded">contact_email</code> - Email</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">contact_phone</code> - Telefone</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">contact_first_name</code> - Nome</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">contact_last_name</code> - Sobrenome</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">contact_city</code> - Cidade</li>
            </ul>
          </div>

          {/* Funil */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="font-medium text-amber-400 mb-2">Funil</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li><code className="text-xs bg-gray-800 px-1 rounded">stage_from</code> - Estágio anterior</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">stage_to</code> - Estágio atual</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">pipeline_name</code> - Pipeline</li>
            </ul>
          </div>

          {/* UTM */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="font-medium text-green-400 mb-2">UTM</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li><code className="text-xs bg-gray-800 px-1 rounded">utm_source</code></li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">utm_medium</code></li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">utm_campaign</code></li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">utm_term</code></li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">utm_content</code></li>
            </ul>
          </div>

          {/* Facebook */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-500 mb-2">Facebook Pixel</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li><code className="text-xs bg-gray-800 px-1 rounded">content_type</code></li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">content_name</code></li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">content_category</code></li>
            </ul>
          </div>

          {/* Meta */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="font-medium text-gray-400 mb-2">Metadados</h4>
            <ul className="text-sm space-y-1 text-gray-300">
              <li><code className="text-xs bg-gray-800 px-1 rounded">event_time</code> - Timestamp</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">tenant_id</code> - ID empresa</li>
              <li><code className="text-xs bg-gray-800 px-1 rounded">user_id</code> - Vendedor</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Ajuda - Configuração Facebook */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          Configurar Facebook Pixel via GTM
        </h3>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-300">
            <p className="mb-3"><strong>1. No GTM, crie um Trigger:</strong></p>
            <div className="bg-gray-800/50 rounded-lg p-3 font-mono text-xs">
              Tipo: Custom Event<br/>
              Nome do evento: <span className="text-green-400">deal_won</span> (ou o evento que configurou)
            </div>
          </div>

          <div className="text-sm text-gray-300">
            <p className="mb-3"><strong>2. Crie uma Tag do Facebook Pixel:</strong></p>
            <div className="bg-gray-800/50 rounded-lg p-3 font-mono text-xs">
              Tipo: Facebook Pixel<br/>
              Evento: Purchase<br/>
              Parâmetros:<br/>
              - value: <span className="text-amber-400">{`{{DL - value}}`}</span><br/>
              - currency: <span className="text-amber-400">{`{{DL - currency}}`}</span><br/>
              - content_name: <span className="text-amber-400">{`{{DL - content_name}}`}</span>
            </div>
          </div>

          <div className="text-sm text-gray-300">
            <p className="mb-3"><strong>3. Crie Data Layer Variables no GTM:</strong></p>
            <div className="bg-gray-800/50 rounded-lg p-3 font-mono text-xs">
              Nome: DL - value<br/>
              Tipo: Data Layer Variable<br/>
              Nome da variável: <span className="text-green-400">value</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">Exemplo completo de evento disparado:</p>
          <pre className="text-xs text-gray-300 font-mono overflow-x-auto">
{`dataLayer.push({
  event: 'deal_won',
  value: 1500,
  currency: 'BRL',
  contact_email: 'cliente@email.com',
  contact_phone: '5511999999999',
  contact_first_name: 'João',
  contact_last_name: 'Silva',
  content_type: 'product',
  content_name: 'Vendas',
  utm_source: 'facebook',
  utm_campaign: 'black_friday'
})`}
          </pre>
        </div>
      </div>
    </div>
  )
}

// Componente de autocomplete customizado para eventos
function EventAutocomplete({
  value,
  onChange,
  suggestions,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  suggestions?: Record<string, string>
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown quando clica fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredSuggestions = suggestions
    ? Object.entries(suggestions).filter(([key, label]) =>
        key.toLowerCase().includes(filter.toLowerCase()) ||
        label.toLowerCase().includes(filter.toLowerCase())
      )
    : []

  const handleSelect = (key: string) => {
    onChange(key)
    setFilter('')
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setFilter(newValue)
    if (!isOpen) setIsOpen(true)
  }

  const handleFocus = () => {
    setIsOpen(true)
    setFilter(value) // Permite filtrar baseado no valor atual
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
      />
      
      <AnimatePresence>
        {isOpen && filteredSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto"
          >
            {filteredSuggestions.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                  value === key ? 'bg-blue-600/30 text-blue-300' : ''
                }`}
              >
                <span className="font-mono text-amber-300">{key}</span>
                <span className="text-gray-400 text-xs">{label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Componente para configurar eventos de um pipeline
function PipelineEventConfig({
  pipeline,
  suggestions,
  isExpanded,
  onToggle,
}: {
  pipeline: any
  suggestions?: Record<string, string>
  isExpanded: boolean
  onToggle: () => void
}) {
  const { data: pipelineEvents, isLoading } = usePipelineEvents(isExpanded ? pipeline.id : '')
  const updateEvents = useUpdatePipelineEvents()
  const [stageEvents, setStageEvents] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (pipelineEvents?.stages) {
      const events: Record<string, string> = {}
      pipelineEvents.stages.forEach((stage) => {
        events[stage.id] = stage.gtm_event_key || ''
      })
      setStageEvents(events)
    }
  }, [pipelineEvents])

  const handleSave = async () => {
    const stages = Object.entries(stageEvents).map(([id, gtm_event_key]) => ({
      id,
      gtm_event_key: gtm_event_key || null,
    }))

    await updateEvents.mutateAsync({ pipelineId: pipeline.id, stages })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="border border-gray-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: pipeline.stages?.[0]?.color || '#6366F1' }}
          />
          <span className="font-medium">{pipeline.name}</span>
          <span className="text-sm text-gray-400">
            ({pipeline.stages?.length || 0} estágios)
          </span>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-gray-700/50 p-4 bg-gray-800/30"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {pipelineEvents?.stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-40">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm truncate">{stage.name}</span>
                  </div>
                  <div className="flex-1">
                    <EventAutocomplete
                      value={stageEvents[stage.id] || ''}
                      onChange={(value) => setStageEvents({
                        ...stageEvents,
                        [stage.id]: value,
                      })}
                      suggestions={suggestions}
                      placeholder="Nome do evento (ex: deal_won)"
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                <p className="text-xs text-gray-500">
                  Deixe em branco para não disparar evento
                </p>
                <button
                  onClick={handleSave}
                  disabled={updateEvents.isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors disabled:opacity-50"
                >
                  {updateEvents.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : saved ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

