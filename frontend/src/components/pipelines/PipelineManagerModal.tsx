import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  Users,
  Settings,
  Eye,
  Edit,
  CheckCircle,
  AlertCircle,
  Globe,
  Lock,
  Bot,
} from 'lucide-react'
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  usePipelineUsers,
  useAddUserToPipeline,
  useUpdateUserPipelinePermissions,
  useRemoveUserFromPipeline,
  type Pipeline,
  type PipelineStage,
} from '@/hooks/usePipelines'
import { useUsers } from '@/hooks/useUsers'
import { useSdrAgents } from '@/hooks/useSdrAgents'

interface PipelineManagerModalProps {
  isOpen: boolean
  onClose: () => void
  initialPipelineId?: string
}

const COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316',
  '#F59E0B', '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6B7280', '#78716C',
]

export function PipelineManagerModal({
  isOpen,
  onClose,
  initialPipelineId,
}: PipelineManagerModalProps) {
  const { data: pipelines, isLoading } = usePipelines()
  const { data: usersData } = useUsers()
  const users = usersData?.data || []
  const { data: sdrAgents = [] } = useSdrAgents()

  const createPipeline = useCreatePipeline()
  const updatePipeline = useUpdatePipeline()
  const deletePipeline = useDeletePipeline()
  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const deleteStage = useDeleteStage()
  const addUserToPipeline = useAddUserToPipeline()
  const updateUserPermissions = useUpdateUserPipelinePermissions()
  const removeUserFromPipeline = useRemoveUserFromPipeline()

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stages' | 'permissions'>('stages')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [sdrAgentId, setSdrAgentId] = useState<string | null>(null)
  const [stages, setStages] = useState<Array<{ id?: string; name: string; color: string; order: number }>>([])

  const selectedPipeline = pipelines?.find((p: Pipeline) => p.id === selectedPipelineId)
  const { data: pipelineUsers } = usePipelineUsers(selectedPipelineId || '')

  useEffect(() => {
    if (initialPipelineId && pipelines?.length) {
      setSelectedPipelineId(initialPipelineId)
    } else if (pipelines?.length && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id)
    }
  }, [initialPipelineId, pipelines, selectedPipelineId])

  useEffect(() => {
    if (selectedPipeline) {
      setName(selectedPipeline.name)
      setDescription(selectedPipeline.description || '')
      setIsPublic(selectedPipeline.is_public)
      setIsDefault(selectedPipeline.is_default)
      setSdrAgentId(selectedPipeline.sdr_agent_id || null)
      setStages(
        selectedPipeline.stages.map((s: PipelineStage) => ({
          id: s.id,
          name: s.name,
          color: s.color,
          order: s.order,
        }))
      )
      setIsCreatingNew(false)
    }
  }, [selectedPipeline])

  const handleCreateNew = () => {
    setIsCreatingNew(true)
    setSelectedPipelineId(null)
    setName('')
    setDescription('')
    setIsPublic(false)
    setIsDefault(false)
    setSdrAgentId(null)
    setStages([
      { name: 'Novo Lead', color: '#6366F1', order: 0 },
      { name: 'Contato', color: '#8B5CF6', order: 1 },
      { name: 'Proposta', color: '#F59E0B', order: 2 },
      { name: 'Negociação', color: '#3B82F6', order: 3 },
      { name: 'Fechado', color: '#22C55E', order: 4 },
    ])
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setError(null)
    
    try {
      if (isCreatingNew) {
        console.log('Criando pipeline:', { name, description, is_public: isPublic, is_default: isDefault, sdr_agent_id: sdrAgentId, stages })
        await createPipeline.mutateAsync({
          name,
          description,
          is_public: isPublic,
          is_default: isDefault,
          sdr_agent_id: sdrAgentId,
          stages: stages.map((s, i) => ({ name: s.name, color: s.color, order: i })),
        })
        setSuccess('Pipeline criado com sucesso!')
        setIsCreatingNew(false)
      } else if (selectedPipelineId) {
        console.log('Atualizando pipeline:', { id: selectedPipelineId, name, description, is_public: isPublic, is_default: isDefault, sdr_agent_id: sdrAgentId })
        await updatePipeline.mutateAsync({
          id: selectedPipelineId,
          name,
          description,
          is_public: isPublic,
          is_default: isDefault,
          sdr_agent_id: sdrAgentId,
        })
        setSuccess('Pipeline atualizado!')
      }
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Erro ao salvar pipeline:', err)
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao salvar pipeline'
      setError(message)
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleDelete = async () => {
    if (!selectedPipelineId) return
    if (!window.confirm('Tem certeza que deseja excluir este pipeline? Leads associados ficarão sem pipeline.')) return

    try {
      await deletePipeline.mutateAsync(selectedPipelineId)
      setSelectedPipelineId(null)
      setSuccess('Pipeline excluído!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao excluir pipeline')
    }
  }

  const handleAddStage = () => {
    setStages([
      ...stages,
      { name: 'Novo Estágio', color: COLORS[stages.length % COLORS.length], order: stages.length },
    ])
  }

  const handleStageChange = (index: number, field: 'name' | 'color', value: string) => {
    const newStages = [...stages]
    newStages[index] = { ...newStages[index], [field]: value }
    setStages(newStages)
  }

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      setError('Pipeline precisa de pelo menos um estágio')
      return
    }
    setStages(stages.filter((_, i) => i !== index))
  }

  const handleSaveStage = async (stage: typeof stages[0], index: number) => {
    if (!selectedPipelineId || isCreatingNew) return

    setError(null)
    
    try {
      console.log('Salvando estágio:', { pipelineId: selectedPipelineId, stage, index })
      if (stage.id) {
        await updateStage.mutateAsync({
          pipelineId: selectedPipelineId,
          stageId: stage.id,
          name: stage.name,
          color: stage.color,
          order: index,
        })
      } else {
        await createStage.mutateAsync({
          pipelineId: selectedPipelineId,
          name: stage.name,
          color: stage.color,
          order: index,
        })
      }
      setSuccess('Estágio salvo!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      console.error('Erro ao salvar estágio:', err)
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao salvar estágio'
      setError(message)
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleDeleteStage = async (stage: typeof stages[0], index: number) => {
    if (!selectedPipelineId || !stage.id) {
      handleRemoveStage(index)
      return
    }

    if (!window.confirm('Excluir este estágio? Leads nele serão movidos para o primeiro estágio.')) return

    try {
      await deleteStage.mutateAsync({ pipelineId: selectedPipelineId, stageId: stage.id })
      setSuccess('Estágio excluído!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao excluir estágio')
    }
  }

  const handleAddUser = async (userId: string) => {
    if (!selectedPipelineId) return

    setError(null)
    
    try {
      console.log('Adicionando usuário ao pipeline:', { pipelineId: selectedPipelineId, userId })
      await addUserToPipeline.mutateAsync({
        pipelineId: selectedPipelineId,
        userId,
        permissions: { can_view: true, can_manage_leads: true },
      })
      setSuccess('Usuário adicionado!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      console.error('Erro ao adicionar usuário:', err)
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Erro ao adicionar usuário'
      setError(message)
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleTogglePermission = async (
    userId: string,
    permission: 'can_view' | 'can_edit' | 'can_manage_leads',
    currentValue: boolean
  ) => {
    if (!selectedPipelineId) return

    try {
      await updateUserPermissions.mutateAsync({
        pipelineId: selectedPipelineId,
        userId,
        permissions: { [permission]: !currentValue },
      })
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atualizar permissão')
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!selectedPipelineId) return

    try {
      await removeUserFromPipeline.mutateAsync({ pipelineId: selectedPipelineId, userId })
      setSuccess('Usuário removido!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao remover usuário')
    }
  }

  const usersNotInPipeline = users.filter(
    (u: any) => !pipelineUsers?.find((pu) => pu.id === u.id)
  )

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-lg">Pipelines</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-1">
                  {pipelines?.map((pipeline: Pipeline) => (
                    <button
                      key={pipeline.id}
                      onClick={() => {
                        setSelectedPipelineId(pipeline.id)
                        setIsCreatingNew(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedPipelineId === pipeline.id && !isCreatingNew
                          ? 'bg-blue-600'
                          : 'hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{pipeline.name}</span>
                        <div className="flex items-center gap-1">
                          {pipeline.is_public ? (
                            <Globe className="w-3 h-3 text-gray-400" />
                          ) : (
                            <Lock className="w-3 h-3 text-gray-400" />
                          )}
                          {pipeline.is_default && (
                            <span className="text-xs bg-blue-500/30 text-blue-300 px-1 rounded">
                              Padrão
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {pipeline.stages?.length || 0} estágios
                        {pipeline.sdr_agent && (
                          <span className="ml-2 text-blue-400">
                            <Bot className="w-3 h-3 inline" /> {pipeline.sdr_agent.name}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}

                  {isCreatingNew && (
                    <button
                      className="w-full text-left px-3 py-2 rounded-lg text-sm bg-green-600"
                    >
                      <span>Novo Pipeline</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-2 border-t border-gray-700">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Pipeline
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do Pipeline"
                  className="text-xl font-bold bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none px-1"
                />
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            {(success || error) && (
              <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
                success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span className="text-sm">{success || error}</span>
              </div>
            )}

            {/* Options */}
            <div className="px-4 pt-4 space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded"
                  />
                  <Globe className="w-4 h-4" />
                  Público (todos podem ver)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded"
                  />
                  Pipeline Padrão
                </label>
              </div>

              {/* SDR Agent Selection */}
              <div className="flex items-center gap-3">
                <Bot className="w-4 h-4 text-blue-400" />
                <label className="text-sm text-gray-400">Agente SDR:</label>
                <select
                  value={sdrAgentId || ''}
                  onChange={(e) => setSdrAgentId(e.target.value || null)}
                  className="flex-1 max-w-xs px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:border-blue-500 outline-none"
                >
                  <option value="">Nenhum (sem agente automático)</option>
                  {sdrAgents.map((agent: any) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} {!agent.is_active && '(inativo)'}
                    </option>
                  ))}
                </select>
                {sdrAgentId && (
                  <span className="text-xs text-green-400">
                    ✓ Agente vinculado
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            {!isCreatingNew && (
              <div className="flex gap-2 px-4 pt-4">
                <button
                  onClick={() => setActiveTab('stages')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === 'stages' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Estágios
                </button>
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === 'permissions' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Permissões
                </button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {(activeTab === 'stages' || isCreatingNew) && (
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div
                      key={stage.id || index}
                      className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                    >
                      <GripVertical className="w-4 h-4 text-gray-500 cursor-grab" />
                      
                      <input
                        type="color"
                        value={stage.color}
                        onChange={(e) => handleStageChange(index, 'color', e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) => handleStageChange(index, 'name', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-gray-600 rounded border border-gray-500 focus:border-blue-500 outline-none"
                      />

                      {!isCreatingNew && (
                        <button
                          onClick={() => handleSaveStage(stage, index)}
                          className="p-1.5 hover:bg-gray-600 rounded transition-colors text-green-400"
                          title="Salvar estágio"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => isCreatingNew ? handleRemoveStage(index) : handleDeleteStage(stage, index)}
                        className="p-1.5 hover:bg-gray-600 rounded transition-colors text-red-400"
                        title="Excluir estágio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={handleAddStage}
                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 transition-colors text-gray-400"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Estágio
                  </button>
                </div>
              )}

              {activeTab === 'permissions' && !isCreatingNew && (
                <div className="space-y-4">
                  {isPublic && (
                    <div className="p-3 bg-blue-500/20 rounded-lg text-blue-300 text-sm">
                      <Globe className="w-4 h-4 inline mr-2" />
                      Este pipeline é público - todos os usuários podem ver e gerenciar leads.
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-400">Usuários com acesso</h4>
                    
                    {pipelineUsers?.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={user.permissions.can_view}
                              onChange={() => handleTogglePermission(user.id, 'can_view', user.permissions.can_view)}
                              className="rounded"
                            />
                            <Eye className="w-3 h-3" />
                            Ver
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={user.permissions.can_edit}
                              onChange={() => handleTogglePermission(user.id, 'can_edit', user.permissions.can_edit)}
                              className="rounded"
                            />
                            <Edit className="w-3 h-3" />
                            Editar
                          </label>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={user.permissions.can_manage_leads}
                              onChange={() => handleTogglePermission(user.id, 'can_manage_leads', user.permissions.can_manage_leads)}
                              className="rounded"
                            />
                            Leads
                          </label>
                          
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            className="p-1 hover:bg-gray-600 rounded transition-colors text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(!pipelineUsers || pipelineUsers.length === 0) && !isPublic && (
                      <p className="text-gray-500 text-sm py-4 text-center">
                        Nenhum usuário específico. Apenas admins têm acesso.
                      </p>
                    )}
                  </div>

                  {usersNotInPipeline.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-400">Adicionar usuário</h4>
                      <div className="flex flex-wrap gap-2">
                        {usersNotInPipeline.map((user: any) => (
                          <button
                            key={user.id}
                            onClick={() => handleAddUser(user.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            {user.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-700">
              {!isCreatingNew && selectedPipelineId && !selectedPipeline?.is_default && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Pipeline
                </button>
              )}
              {!isCreatingNew && selectedPipeline?.is_default && (
                <span className="text-sm text-gray-500">Pipeline padrão não pode ser excluído</span>
              )}
              {isCreatingNew && <div />}
              
              <button
                onClick={handleSave}
                disabled={createPipeline.isPending || updatePipeline.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {(createPipeline.isPending || updatePipeline.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isCreatingNew ? 'Criar Pipeline' : 'Salvar'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

