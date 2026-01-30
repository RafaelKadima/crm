import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateQueue, useUpdateQueue, type Queue } from '@/hooks/useQueues'
import { useChannels } from '@/hooks/useChannels'
import { usePipelines } from '@/hooks/usePipelines'
import { useSdrAgents } from '@/hooks/useSdrAgents'

interface QueueFormModalProps {
  isOpen: boolean
  onClose: () => void
  queue: Queue | null
  defaultChannelId?: string | null
}

export function QueueFormModal({
  isOpen,
  onClose,
  queue,
  defaultChannelId,
}: QueueFormModalProps) {
  const [formData, setFormData] = useState({
    channel_id: '',
    pipeline_id: '',
    sdr_agent_id: '',
    sdr_disabled: false,
    name: '',
    menu_option: 1,
    menu_label: '',
    welcome_message: '',
    close_message: '',
    auto_distribute: true,
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: channels } = useChannels()
  const { data: pipelines } = usePipelines()
  const { data: sdrAgents } = useSdrAgents()
  
  const createQueue = useCreateQueue()
  const updateQueue = useUpdateQueue()
  
  const isEditing = !!queue

  useEffect(() => {
    if (queue) {
      setFormData({
        channel_id: queue.channel_id,
        pipeline_id: queue.pipeline_id,
        sdr_agent_id: queue.sdr_agent_id || '',
        sdr_disabled: queue.sdr_disabled || false,
        name: queue.name,
        menu_option: queue.menu_option,
        menu_label: queue.menu_label,
        welcome_message: queue.welcome_message || '',
        close_message: (queue as any).close_message || '',
        auto_distribute: queue.auto_distribute,
        is_active: queue.is_active,
      })
    } else {
      setFormData({
        channel_id: defaultChannelId || '',
        pipeline_id: '',
        sdr_agent_id: '',
        sdr_disabled: false,
        name: '',
        menu_option: 1,
        menu_label: '',
        welcome_message: '',
        close_message: '',
        auto_distribute: true,
        is_active: true,
      })
    }
    setErrors({})
  }, [queue, defaultChannelId, isOpen])

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.channel_id) newErrors.channel_id = 'Selecione um canal'
    if (!formData.pipeline_id) newErrors.pipeline_id = 'Selecione um pipeline'
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório'
    if (!formData.menu_label.trim()) newErrors.menu_label = 'Label do menu é obrigatório'
    if (formData.menu_option < 1 || formData.menu_option > 9) {
      newErrors.menu_option = 'Opção deve ser entre 1 e 9'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      if (isEditing && queue) {
        const updateData = {
          id: queue.id,
          pipeline_id: formData.pipeline_id,
          sdr_agent_id: formData.sdr_disabled ? undefined : (formData.sdr_agent_id || undefined),
          sdr_disabled: formData.sdr_disabled,
          name: formData.name,
          menu_option: formData.menu_option,
          menu_label: formData.menu_label,
          welcome_message: formData.welcome_message || undefined,
          close_message: formData.close_message || undefined,
          auto_distribute: formData.auto_distribute,
          is_active: formData.is_active,
        }
        console.log('Updating queue with data:', updateData)
        await updateQueue.mutateAsync(updateData)
      } else {
        await createQueue.mutateAsync({
          ...formData,
          sdr_agent_id: formData.sdr_agent_id || undefined,
        })
      }
      onClose()
    } catch (error: any) {
      setErrors({ submit: error.response?.data?.message || 'Erro ao salvar fila' })
    }
  }

  const isPending = createQueue.isPending || updateQueue.isPending

  // Get pipelines array
  const pipelinesArray = Array.isArray(pipelines) ? pipelines : (pipelines as any)?.data || []
  
  // Get SDR agents array (hook returns array directly)
  const sdrAgentsArray = Array.isArray(sdrAgents) ? sdrAgents : []

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="text-xl font-semibold">
                  {isEditing ? 'Editar Fila' : 'Nova Fila'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Canal */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Canal *</label>
                  <select
                    value={formData.channel_id}
                    onChange={(e) => handleChange('channel_id', e.target.value)}
                    disabled={isEditing}
                    className={`w-full px-4 py-2 bg-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.channel_id ? 'border-red-500' : 'border-border'
                    } ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Selecione um canal</option>
                    {channels?.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name} ({channel.type})
                      </option>
                    ))}
                  </select>
                  {errors.channel_id && (
                    <p className="text-red-400 text-xs mt-1">{errors.channel_id}</p>
                  )}
                </div>

                {/* Pipeline */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Pipeline *</label>
                  <select
                    value={formData.pipeline_id}
                    onChange={(e) => handleChange('pipeline_id', e.target.value)}
                    className={`w-full px-4 py-2 bg-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.pipeline_id ? 'border-red-500' : 'border-border'
                    }`}
                  >
                    <option value="">Selecione um pipeline</option>
                    {pipelinesArray.map((pipeline: any) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                  </select>
                  {errors.pipeline_id && (
                    <p className="text-red-400 text-xs mt-1">{errors.pipeline_id}</p>
                  )}
                </div>

                {/* SDR Agent */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    <Bot className="w-4 h-4 inline mr-1" />
                    SDR Agent (IA)
                  </label>
                  <select
                    value={formData.sdr_agent_id}
                    onChange={(e) => handleChange('sdr_agent_id', e.target.value)}
                    disabled={formData.sdr_disabled}
                    className={`w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formData.sdr_disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">Sem agente (manual)</option>
                    {sdrAgentsArray.map((agent: any) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agente de IA que atenderá os leads desta fila
                  </p>

                  {/* Desativar SDR completamente */}
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sdr_disabled}
                      onChange={(e) => handleChange('sdr_disabled', e.target.checked)}
                      className="w-4 h-4 rounded text-red-500"
                    />
                    <span className="text-sm text-red-400">
                      Desativar IA nesta fila (ignora agentes do canal/pipeline)
                    </span>
                  </label>
                </div>

                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nome *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ex: SAC, Comercial, Pós-venda"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-red-400 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Opção do Menu */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Opção do Menu *
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={9}
                      value={formData.menu_option}
                      onChange={(e) =>
                        handleChange('menu_option', parseInt(e.target.value) || 1)
                      }
                      className={errors.menu_option ? 'border-red-500' : ''}
                    />
                    {errors.menu_option && (
                      <p className="text-red-400 text-xs mt-1">{errors.menu_option}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Label do Menu *
                    </label>
                    <Input
                      value={formData.menu_label}
                      onChange={(e) => handleChange('menu_label', e.target.value)}
                      placeholder="Ex: Atendimento ao Cliente"
                      className={errors.menu_label ? 'border-red-500' : ''}
                    />
                    {errors.menu_label && (
                      <p className="text-red-400 text-xs mt-1">{errors.menu_label}</p>
                    )}
                  </div>
                </div>

                {/* Mensagem de boas-vindas */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Mensagem de Boas-vindas
                  </label>
                  <textarea
                    value={formData.welcome_message}
                    onChange={(e) => handleChange('welcome_message', e.target.value)}
                    placeholder="Mensagem enviada ao cliente quando ele escolhe esta fila"
                    rows={3}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Mensagem de encerramento */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Mensagem de Encerramento
                  </label>
                  <textarea
                    value={formData.close_message}
                    onChange={(e) => handleChange('close_message', e.target.value)}
                    placeholder="Mensagem enviada automaticamente ao encerrar a conversa (opcional)"
                    rows={3}
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deixe em branco para não enviar mensagem ao encerrar
                  </p>
                </div>

                {/* Toggles */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.auto_distribute}
                      onChange={(e) =>
                        handleChange('auto_distribute', e.target.checked)
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Autodistribuir leads</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => handleChange('is_active', e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Fila ativa</span>
                  </label>
                </div>

                {/* Error */}
                {errors.submit && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400">{errors.submit}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending} className="flex-1">
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : isEditing ? (
                      'Salvar'
                    ) : (
                      'Criar Fila'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

