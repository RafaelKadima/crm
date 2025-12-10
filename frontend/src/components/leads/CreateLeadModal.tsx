import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Phone, Mail, Briefcase, DollarSign, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateLead } from '@/hooks/useLeads'
import { useChannels, type Channel } from '@/hooks/useChannels'
import type { Pipeline, PipelineStage } from '@/types'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  pipeline: Pipeline | null
  stages: PipelineStage[]
}

export function CreateLeadModal({ isOpen, onClose, pipeline, stages }: CreateLeadModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    value: '',
    channel_id: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createLeadMutation = useCreateLead()
  const { data: channels = [] } = useChannels()

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório'
    } else if (!/^\d{10,15}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Telefone inválido'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido'
    }

    if (!formData.channel_id) {
      newErrors.channel_id = 'Selecione um canal'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return
    if (!pipeline || !stages.length) return

    const firstStage = stages[0]

    try {
      await createLeadMutation.mutateAsync({
        contact: {
          name: formData.name,
          phone: formData.phone.replace(/\D/g, ''),
          email: formData.email || undefined,
          company: formData.company || undefined,
        },
        pipeline_id: pipeline.id,
        stage_id: firstStage.id,
        channel_id: formData.channel_id,
        value: formData.value ? parseFloat(formData.value) : undefined,
      })

      // Reset form and close
      setFormData({ name: '', phone: '', email: '', company: '', value: '', channel_id: '' })
      onClose()
    } catch (error: any) {
      console.error('Error creating lead:', error)
      setErrors({ submit: error.message || 'Erro ao criar lead' })
    }
  }

  const handleClose = () => {
    setFormData({ name: '', phone: '', email: '', company: '', value: '', channel_id: '' })
    setErrors({})
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-800 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-800">
                <h2 className="text-xl font-semibold">Novo Lead</h2>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Pipeline info */}
                {pipeline && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-sm text-blue-400">
                      Pipeline: <span className="font-medium">{pipeline.name}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      O lead será criado no estágio "{stages[0]?.name}"
                    </p>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nome *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Nome do contato"
                      className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Telefone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="5511999999999"
                      className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                  <p className="text-xs text-gray-500 mt-1">Formato: código do país + DDD + número</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="email@exemplo.com"
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Empresa</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={formData.company}
                      onChange={(e) => handleChange('company', e.target.value)}
                      placeholder="Nome da empresa"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Channel */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Canal de comunicação *</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                      value={formData.channel_id}
                      onChange={(e) => handleChange('channel_id', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.channel_id ? 'border-red-500' : 'border-gray-700'
                      }`}
                    >
                      <option value="">Selecione um canal</option>
                      {channels.map((channel: Channel) => (
                        <option key={channel.id} value={channel.id}>
                          {channel.name} ({channel.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.channel_id && <p className="text-red-400 text-xs mt-1">{errors.channel_id}</p>}
                </div>

                {/* Value */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Valor estimado</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      type="number"
                      value={formData.value}
                      onChange={(e) => handleChange('value', e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Submit error */}
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
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLeadMutation.isPending}
                    className="flex-1"
                  >
                    {createLeadMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Lead'
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

