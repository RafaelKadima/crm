import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ListTodo,
  Phone,
  Mail,
  Video,
  MessageCircle,
  MoreHorizontal,
  Calendar,
  User,
  FileText,
  Save,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks'
import { useContacts } from '@/hooks/useContacts'
import { useAuthStore } from '@/store/authStore'
import type { Task } from '@/types'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task?: Task | null
  leadId?: string
  contactId?: string
}

const taskTypes = [
  { value: 'call', label: 'Ligação', icon: Phone, color: 'text-green-400' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-400' },
  { value: 'meeting', label: 'Reunião', icon: Video, color: 'text-purple-400' },
  { value: 'follow_up', label: 'Follow-up', icon: Mail, color: 'text-blue-400' },
  { value: 'other', label: 'Outro', icon: MoreHorizontal, color: 'text-muted-foreground' },
]

export function TaskModal({ isOpen, onClose, task, leadId, contactId }: TaskModalProps) {
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { data: contactsData } = useContacts()
  const { user } = useAuthStore()

  const contacts = contactsData?.data || []

  const [formData, setFormData] = useState({
    title: '',
    type: 'call' as string,
    description: '',
    due_at: '',
    contact_id: '',
    lead_id: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEditing = !!task

  useEffect(() => {
    if (task) {
      // Compatibilidade com due_at ou due_date
      const dueDate = (task as any).due_at || task.due_date
      setFormData({
        title: task.title || '',
        type: task.type || 'call',
        description: task.description || '',
        due_at: dueDate ? dueDate.split('T')[0] : '',
        contact_id: task.contact_id || '',
        lead_id: task.lead_id || '',
      })
    } else {
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        title: '',
        type: 'call',
        description: '',
        due_at: today,
        contact_id: contactId || '',
        lead_id: leadId || '',
      })
    }
    setErrors({})
    setShowDeleteConfirm(false)
  }, [task, isOpen, leadId, contactId])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório'
    }

    if (!formData.type) {
      newErrors.type = 'Tipo é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      const payload = {
        title: formData.title,
        type: formData.type,
        description: formData.description || null,
        due_at: formData.due_at,
        contact_id: formData.contact_id || null,
        lead_id: formData.lead_id || null,
        assigned_user_id: user?.id, // Atribui ao usuário logado
      }

      if (isEditing && task) {
        await updateTask.mutateAsync({
          id: task.id,
          data: payload,
        })
      } else {
        await createTask.mutateAsync(payload)
      }
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar tarefa:', error)
      if (error?.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  }

  const handleDelete = async () => {
    if (!task) return

    try {
      await deleteTask.mutateAsync(task.id)
      onClose()
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error)
    }
  }

  const isSubmitting = createTask.isPending || updateTask.isPending
  const isDeleting = deleteTask.isPending

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <ListTodo className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isEditing ? 'Atualize os dados da tarefa' : 'Preencha os dados da tarefa'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Título */}
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4" />
                  Título *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Ligar para cliente sobre proposta"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-xs text-red-400 mt-1">{errors.title}</p>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">
                  Tipo de tarefa *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {taskTypes.map((type) => {
                    const Icon = type.icon
                    const isSelected = formData.type === type.value
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                            : 'bg-muted border-border hover:border-border'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-400' : type.color}`} />
                        <span className="text-xs">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.type && (
                  <p className="text-xs text-red-400 mt-1">{errors.type}</p>
                )}
              </div>

              {/* Data de vencimento */}
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Data de vencimento *
                </label>
                <Input
                  type="date"
                  value={formData.due_at}
                  onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
                />
              </div>

              {/* Contato */}
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  Contato relacionado
                </label>
                <select
                  value={formData.contact_id}
                  onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Selecione um contato (opcional)</option>
                  {contacts.map((contact: any) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} {contact.company ? `- ${contact.company}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes adicionais sobre a tarefa..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
              {isEditing ? (
                <div>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-400">Confirmar exclusão?</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Sim, excluir'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? 'Salvar' : 'Criar Tarefa'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

