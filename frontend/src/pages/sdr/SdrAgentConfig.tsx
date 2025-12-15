import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Bot,
  ArrowLeft,
  Save,
  Sparkles,
  BookOpen,
  HelpCircle,
  FileText,
  Eye,
  Settings,
  Trash2,
  Plus,
  Upload,
  RefreshCw,
  X,
  ChevronDown,
  Check,
  AlertCircle,
  Clock,
  GitBranch,
  ArrowRight,
} from 'lucide-react'
import {
  useSdrAgent,
  useCreateSdrAgent,
  useUpdateSdrAgent,
  useSdrDocuments,
  useUploadSdrDocument,
  useDeleteSdrDocument,
  useReprocessSdrDocument,
  useSdrFaqs,
  useCreateSdrFaq,
  useUpdateSdrFaq,
  useDeleteSdrFaq,
  useSdrKnowledge,
  useCreateSdrKnowledge,
  useUpdateSdrKnowledge,
  useDeleteSdrKnowledge,
  usePreviewSdrPayload,
  useSdrAgentPipelines,
  useSyncSdrAgentPipelines,
  useUpdateStageRules,
  useUpdatePipelineInstructions,
} from '../../hooks/useSdrAgents'
import { useChannels } from '../../hooks/useChannels'
import { usePipelines } from '../../hooks/usePipelines'
import type { SdrAgent, SdrDocument, SdrFaq, SdrKnowledgeEntry } from '../../types'

type TabType = 'config' | 'knowledge' | 'faqs' | 'documents' | 'flow' | 'preview'

export default function SdrAgentConfig() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const isNew = !agentId || agentId === 'new'

  const [activeTab, setActiveTab] = useState<TabType>('config')
  const [formData, setFormData] = useState<Partial<SdrAgent>>({
    name: '',
    type: 'sdr', // Default type
    description: '',
    system_prompt: `Você é um SDR (Sales Development Representative) especializado em qualificar leads.

Suas principais responsabilidades:
1. Cumprimentar o lead de forma cordial
2. Identificar suas necessidades e dores
3. Apresentar soluções relevantes
4. Qualificar o lead para um atendimento humano
5. Agendar reuniões quando apropriado

Sempre mantenha um tom profissional e empático.`,
    personality: 'Amigável, prestativo e proativo. Demonstra interesse genuíno em ajudar.',
    objectives: 'Qualificar leads, identificar necessidades, agendar reuniões com vendedores.',
    restrictions: 'Não fornecer preços finais, não fazer promessas de prazo, sempre encaminhar para vendedor em casos complexos.',
    knowledge_instructions: 'Use a base de conhecimento para responder perguntas sobre produtos e serviços. Cite informações específicas quando relevante.',
    language: 'pt-BR',
    tone: 'professional',
    ai_model: 'gpt-4o-mini',
    temperature: 0.7,
    is_active: true,
  })

  const { data: agentData, isLoading } = useSdrAgent(isNew ? undefined : agentId)
  const { data: channels } = useChannels()
  const createMutation = useCreateSdrAgent()
  const updateMutation = useUpdateSdrAgent()

  useEffect(() => {
    if (agentData?.agent) {
      setFormData(agentData.agent)
    }
  }, [agentData])

  const handleSave = async () => {
    if (isNew) {
      const newAgent = await createMutation.mutateAsync(formData)
      navigate(`/sdr/${newAgent.id}/config`)
    } else {
      await updateMutation.mutateAsync({ id: agentId!, ...formData })
    }
  }

  const tabs = [
    { id: 'config', label: 'Configuração', icon: Settings },
    { id: 'flow', label: 'Fluxo', icon: GitBranch },
    { id: 'knowledge', label: 'Base de Conhecimento', icon: BookOpen },
    { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'preview', label: 'Preview', icon: Eye },
  ]

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/sdr')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {isNew ? 'Novo SDR Agent' : formData.name || 'Configurar SDR Agent'}
                  </h1>
                  <p className="text-sm text-slate-400">
                    {isNew ? 'Crie um novo agente de IA' : 'Configure seu agente de IA'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/25 font-medium disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              Salvar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isDisabled = isNew && tab.id !== 'config'
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id as TabType)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.id
                      ? 'bg-slate-800 text-white border-b-2 border-violet-500'
                      : isDisabled
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'config' && (
          <ConfigTab
            formData={formData}
            setFormData={setFormData}
            channels={channels || []}
            stats={agentData?.stats}
          />
        )}
        {activeTab === 'flow' && agentId && !isNew && (
          <FlowTab agentId={agentId} />
        )}
        {activeTab === 'knowledge' && agentId && !isNew && (
          <KnowledgeTab agentId={agentId} />
        )}
        {activeTab === 'faqs' && agentId && !isNew && (
          <FaqsTab agentId={agentId} />
        )}
        {activeTab === 'documents' && agentId && !isNew && (
          <DocumentsTab agentId={agentId} />
        )}
        {activeTab === 'preview' && agentId && !isNew && (
          <PreviewTab agentId={agentId} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CONFIG TAB
// ============================================================================

function ConfigTab({
  formData,
  setFormData,
  channels,
  stats
}: {
  formData: Partial<SdrAgent>
  setFormData: (data: Partial<SdrAgent>) => void
  channels: any[]
  stats?: any
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Config */}
      <div className="lg:col-span-2 space-y-6">
        {/* Basic Info */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            Informações Básicas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Nome do Agente</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="SDR Vendas"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Tipo de Agente</label>
              <select
                value={formData.type || 'sdr'}
                onChange={(e) => {
                  const newType = e.target.value as 'sdr' | 'support'

                  // Auto-update prompts based on type if it's a new agent or user confirms
                  const isSdr = newType === 'sdr'

                  setFormData({
                    ...formData,
                    type: newType,
                    system_prompt: isSdr
                      ? `Você é um SDR (Sales Development Representative) especializado em qualificar leads.\n\nSuas principais responsabilidades:\n1. Cumprimentar o lead de forma cordial\n2. Identificar suas necessidades e dores\n3. Apresentar soluções relevantes\n4. Qualificar o lead para um atendimento humano\n5. Agendar reuniões quando apropriado\n\nSempre mantenha um tom profissional e empático.`
                      : `Você é um Agente de Suporte Técnico especializado em resolver problemas pós-venda.\n\nSuas principais responsabilidades:\n1. Acolher o cliente com empatia\n2. Identificar o problema (atraso, defeito, dúvida)\n3. Solicitar fotos/prints se necessário (Visual Support)\n4. Consultar status de pedidos\n5. Oferecer soluções rápidas ou escalar para humano\n\nSeja paciente e focado na resolução.`,
                    objectives: isSdr
                      ? 'Qualificar leads, identificar necessidades, agendar reuniões com vendedores.'
                      : 'Resolver problemas do cliente, consultar pedidos, analisar defeitos visualmente.',
                  })
                }}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="sdr">SDR (Vendas & Qualificação)</option>
                <option value="support">Suporte (SAC & Pós-Venda)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Canal</label>
              <select
                value={formData.channel_id || ''}
                onChange={(e) => setFormData({ ...formData, channel_id: e.target.value || undefined })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Nenhum canal específico</option>
                {channels.map((channel: any) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} ({channel.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-400 mb-2">Descrição</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Agente especializado em..."
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Prompt do Sistema</h2>
          <textarea
            value={formData.system_prompt || ''}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            rows={8}
            placeholder="Defina o comportamento base do agente..."
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm resize-none"
          />
        </div>

        {/* Personality & Objectives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Personalidade</h2>
            <textarea
              value={formData.personality || ''}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              rows={4}
              placeholder="Descreva a personalidade do agente..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
            />
          </div>
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Objetivos</h2>
            <textarea
              value={formData.objectives || ''}
              onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              rows={4}
              placeholder="Liste os objetivos do agente..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>

        {/* Restrictions & Knowledge Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Restrições</h2>
            <textarea
              value={formData.restrictions || ''}
              onChange={(e) => setFormData({ ...formData, restrictions: e.target.value })}
              rows={4}
              placeholder="O que o agente NÃO deve fazer..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
            />
          </div>
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Uso da Base de Conhecimento</h2>
            <textarea
              value={formData.knowledge_instructions || ''}
              onChange={(e) => setFormData({ ...formData, knowledge_instructions: e.target.value })}
              rows={4}
              placeholder="Como o agente deve usar a base de conhecimento..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* AI Settings */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Configurações de IA</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Modelo</label>
              <select
                value={formData.ai_model || 'gpt-4o-mini'}
                onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Rápido)</option>
                <option value="gpt-4o">GPT-4o (Avançado)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Temperatura: {formData.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature || 0.7}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Preciso</span>
                <span>Criativo</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Tom</label>
              <select
                value={formData.tone || 'professional'}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value as any })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="professional">Profissional</option>
                <option value="friendly">Amigável</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Idioma</label>
              <select
                value={formData.language || 'pt-BR'}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Estatísticas</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total de Interações</span>
                <span className="text-white font-medium">{stats.total_interactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hoje</span>
                <span className="text-white font-medium">{stats.interactions_today}</span>
              </div>
              {stats.avg_response_time && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Tempo Médio</span>
                  <span className="text-white font-medium">{Math.round(stats.avg_response_time)}ms</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Feedback Positivo</span>
                <span className="text-emerald-400 font-medium">{stats.positive_feedback}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Feedback Negativo</span>
                <span className="text-red-400 font-medium">{stats.negative_feedback}</span>
              </div>
            </div>
          </div>
        )}

        {/* Webhook URL */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Webhook n8n</h2>
          <input
            type="url"
            value={formData.webhook_url || ''}
            onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
            placeholder="https://n8n.example.com/webhook/..."
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
          />
          <p className="text-xs text-slate-500 mt-2">
            URL do webhook que receberá as mensagens para processamento
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// FLOW TAB - Configuração de Fluxo de Pipeline
// ============================================================================

function FlowTab({ agentId }: { agentId: string }) {
  const { data: allPipelines } = usePipelines()
  const { data: agentPipelines, isLoading } = useSdrAgentPipelines(agentId)
  const syncPipelinesMutation = useSyncSdrAgentPipelines()
  const updateStageRulesMutation = useUpdateStageRules()
  const updateInstructionsMutation = useUpdatePipelineInstructions()

  const [selectedPipelines, setSelectedPipelines] = useState<string[]>([])
  const [primaryPipeline, setPrimaryPipeline] = useState<string>('')
  const [pipelineInstructions, setPipelineInstructions] = useState('')
  const [canMoveLeads, setCanMoveLeads] = useState(true)
  const [stageRules, setStageRules] = useState<Record<string, { trigger: string; action: string }>>({})
  const [success, setSuccess] = useState<string | null>(null)

  // Carrega dados quando pipelines do agente são carregados
  useEffect(() => {
    if (agentPipelines) {
      setSelectedPipelines(agentPipelines.map((p: any) => p.id))
      const primary = agentPipelines.find((p: any) => p.pivot?.is_primary)
      setPrimaryPipeline(primary?.id || agentPipelines[0]?.id || '')

      // Carrega regras existentes
      const rules: Record<string, { trigger: string; action: string }> = {}
      agentPipelines.forEach((pipeline: any) => {
        pipeline.stages_with_rules?.forEach((stage: any) => {
          rules[stage.id] = {
            trigger: stage.trigger || '',
            action: stage.action || '',
          }
        })
      })
      setStageRules(rules)
    }
  }, [agentPipelines])

  const handleSavePipelines = async () => {
    try {
      await syncPipelinesMutation.mutateAsync({
        agentId,
        pipelineIds: selectedPipelines,
        primaryPipelineId: primaryPipeline,
      })
      setSuccess('Pipelines atualizados!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Erro ao salvar pipelines:', err)
    }
  }

  const handleSaveRules = async () => {
    const rules = Object.entries(stageRules).map(([stageId, rule]) => ({
      stage_id: stageId,
      trigger: rule.trigger,
      action: rule.action,
    }))

    try {
      await updateStageRulesMutation.mutateAsync({ agentId, stageRules: rules })
      setSuccess('Regras de estágios salvas!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Erro ao salvar regras:', err)
    }
  }

  const handleSaveInstructions = async () => {
    try {
      await updateInstructionsMutation.mutateAsync({
        agentId,
        pipelineInstructions,
        canMoveLeads,
      })
      setSuccess('Instruções salvas!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Erro ao salvar instruções:', err)
    }
  }

  const updateStageRule = (stageId: string, field: 'trigger' | 'action', value: string) => {
    setStageRules(prev => ({
      ...prev,
      [stageId]: {
        ...prev[stageId],
        [field]: value,
      },
    }))
  }

  const selectedPipelineData = allPipelines?.filter((p: any) => selectedPipelines.includes(p.id)) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
          <Check className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* Seleção de Pipelines */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-violet-400" />
              Pipelines do Agente
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Selecione os pipelines que este agente pode gerenciar
            </p>
          </div>
          <button
            onClick={handleSavePipelines}
            disabled={syncPipelinesMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            {syncPipelinesMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allPipelines?.map((pipeline: any) => (
            <label
              key={pipeline.id}
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedPipelines.includes(pipeline.id)
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-slate-700 hover:border-slate-600'
                }`}
            >
              <input
                type="checkbox"
                checked={selectedPipelines.includes(pipeline.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedPipelines([...selectedPipelines, pipeline.id])
                  } else {
                    setSelectedPipelines(selectedPipelines.filter(id => id !== pipeline.id))
                  }
                }}
                className="rounded accent-violet-500"
              />
              <div className="flex-1">
                <p className="font-medium text-white">{pipeline.name}</p>
                <p className="text-xs text-slate-400">{pipeline.stages?.length || 0} estágios</p>
              </div>
              {selectedPipelines.includes(pipeline.id) && (
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="primaryPipeline"
                    checked={primaryPipeline === pipeline.id}
                    onChange={() => setPrimaryPipeline(pipeline.id)}
                    className="accent-violet-500"
                  />
                  <span className="text-violet-400">Principal</span>
                </label>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Instruções Gerais */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Instruções de Fluxo</h2>
            <p className="text-sm text-slate-400 mt-1">
              Defina como o agente deve gerenciar os leads no pipeline
            </p>
          </div>
          <button
            onClick={handleSaveInstructions}
            disabled={updateInstructionsMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            {updateInstructionsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </button>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={canMoveLeads}
              onChange={(e) => setCanMoveLeads(e.target.checked)}
              className="rounded accent-violet-500 h-5 w-5"
            />
            <div>
              <span className="text-white font-medium">Permitir mover leads automaticamente</span>
              <p className="text-xs text-slate-400">O agente poderá mover leads entre estágios do pipeline</p>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Instruções Gerais de Pipeline
            </label>
            <textarea
              value={pipelineInstructions}
              onChange={(e) => setPipelineInstructions(e.target.value)}
              rows={5}
              placeholder={`Exemplo:
- Quando o cliente demonstrar interesse em agendar uma visita, mova para "Visita Agendada"
- Se o cliente pedir um orçamento, mova para "Proposta Enviada"
- Quando o cliente confirmar que vai pensar, mantenha em "Negociação"
- Se o cliente recusar, mova para "Perdido"`}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>
      </div>

      {/* Regras por Estágio */}
      {selectedPipelineData.length > 0 && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Regras por Estágio</h2>
              <p className="text-sm text-slate-400 mt-1">
                Configure quando o agente deve mover o lead para cada estágio
              </p>
            </div>
            <button
              onClick={handleSaveRules}
              disabled={updateStageRulesMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50"
            >
              {updateStageRulesMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Regras
            </button>
          </div>

          <div className="space-y-6">
            {selectedPipelineData.map((pipeline: any) => (
              <div key={pipeline.id} className="space-y-3">
                <h3 className="text-md font-medium text-violet-400 flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  {pipeline.name}
                </h3>

                <div className="space-y-3">
                  {pipeline.stages?.sort((a: any, b: any) => a.order - b.order).map((stage: any, index: number) => (
                    <div
                      key={stage.id}
                      className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-xl"
                    >
                      {/* Stage indicator */}
                      <div className="flex flex-col items-center">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: stage.color }}
                        >
                          {index + 1}
                        </div>
                        {index < pipeline.stages.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-slate-600 mt-2 rotate-90" />
                        )}
                      </div>

                      {/* Stage info and rules */}
                      <div className="flex-1 space-y-3">
                        <h4 className="font-medium text-white">{stage.name}</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              🎯 Quando mover para cá?
                            </label>
                            <input
                              type="text"
                              value={stageRules[stage.id]?.trigger || ''}
                              onChange={(e) => updateStageRule(stage.id, 'trigger', e.target.value)}
                              placeholder="Ex: Cliente agendou uma visita"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              💬 O que dizer após mover?
                            </label>
                            <input
                              type="text"
                              value={stageRules[stage.id]?.action || ''}
                              onChange={(e) => updateStageRule(stage.id, 'action', e.target.value)}
                              placeholder="Ex: Confirmar data e horário"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Como funciona?
        </h3>
        <ul className="text-sm text-slate-300 space-y-1">
          <li>• O agente receberá automaticamente os estágios do pipeline no prompt</li>
          <li>• Quando identificar o momento certo, ele moverá o lead para o estágio apropriado</li>
          <li>• Use as regras de gatilho para definir claramente quando cada movimentação deve acontecer</li>
          <li>• O agente também pode ser adicionado diretamente ao pipeline pelo gerenciamento de pipelines</li>
        </ul>
      </div>
    </div>
  )
}

// ============================================================================
// KNOWLEDGE TAB
// ============================================================================

function KnowledgeTab({ agentId }: { agentId: string }) {
  const { data, isLoading } = useSdrKnowledge(agentId)
  const createMutation = useCreateSdrKnowledge()
  const updateMutation = useUpdateSdrKnowledge()
  const deleteMutation = useDeleteSdrKnowledge()

  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<SdrKnowledgeEntry | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', category: '' })

  const handleSave = async () => {
    if (editingEntry) {
      await updateMutation.mutateAsync({
        agentId,
        entryId: editingEntry.id,
        ...formData,
      })
    } else {
      await createMutation.mutateAsync({
        agentId,
        ...formData,
      })
    }
    setShowForm(false)
    setEditingEntry(null)
    setFormData({ title: '', content: '', category: '' })
  }

  const handleEdit = (entry: SdrKnowledgeEntry) => {
    setEditingEntry(entry)
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (entryId: string) => {
    await deleteMutation.mutateAsync({ agentId, entryId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Base de Conhecimento</h2>
          <p className="text-slate-400 text-sm mt-1">
            Adicione textos que o SDR usará para responder perguntas (RAG)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEntry(null)
            setFormData({ title: '', content: '', category: '' })
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Adicionar Conhecimento
        </button>
      </div>

      {/* Categories */}
      {data?.categories && data.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-400">Categorias:</span>
          {data.categories.map((cat: string) => (
            <span
              key={cat}
              className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-lg text-sm"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingEntry ? 'Editar Conhecimento' : 'Adicionar Conhecimento'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Título</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Política de Devolução"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Categoria</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Políticas, Produtos, Preços"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Conteúdo</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={12}
                  placeholder="Digite o conteúdo da base de conhecimento aqui...

Exemplo:
Nossa política de devolução permite troca ou devolução em até 30 dias após a compra, desde que o produto esteja em perfeitas condições e com a embalagem original..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.content || createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entries List */}
      {data?.data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.data.map((entry: SdrKnowledgeEntry) => (
            <div
              key={entry.id}
              className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 hover:border-violet-500/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{entry.title}</h3>
                  {entry.category && (
                    <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded mt-1 inline-block">
                      {entry.category}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-400 line-clamp-4">{entry.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
          <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">Nenhum conhecimento adicionado</h3>
          <p className="text-sm text-slate-500 mb-4">
            Adicione textos para que o SDR possa usar nas respostas
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// FAQs TAB
// ============================================================================

function FaqsTab({ agentId }: { agentId: string }) {
  const { data: faqs, isLoading } = useSdrFaqs(agentId)
  const createMutation = useCreateSdrFaq()
  const updateMutation = useUpdateSdrFaq()
  const deleteMutation = useDeleteSdrFaq()

  const [showForm, setShowForm] = useState(false)
  const [editingFaq, setEditingFaq] = useState<SdrFaq | null>(null)
  const [formData, setFormData] = useState({ question: '', answer: '', priority: 0 })

  const handleSave = async () => {
    if (editingFaq) {
      await updateMutation.mutateAsync({
        agentId,
        faqId: editingFaq.id,
        ...formData,
      })
    } else {
      await createMutation.mutateAsync({
        agentId,
        ...formData,
      })
    }
    setShowForm(false)
    setEditingFaq(null)
    setFormData({ question: '', answer: '', priority: 0 })
  }

  const handleEdit = (faq: SdrFaq) => {
    setEditingFaq(faq)
    setFormData({
      question: faq.question,
      answer: faq.answer,
      priority: faq.priority,
    })
    setShowForm(true)
  }

  const handleDelete = async (faqId: string) => {
    await deleteMutation.mutateAsync({ agentId, faqId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Perguntas Frequentes</h2>
          <p className="text-slate-400 text-sm mt-1">
            Respostas prontas para perguntas comuns
          </p>
        </div>
        <button
          onClick={() => {
            setEditingFaq(null)
            setFormData({ question: '', answer: '', priority: 0 })
            setShowForm(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Adicionar FAQ
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editingFaq ? 'Editar FAQ' : 'Adicionar FAQ'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Pergunta</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Ex: Qual o prazo de entrega?"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Resposta</label>
                <textarea
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  rows={5}
                  placeholder="Digite a resposta padrão..."
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Prioridade: {formData.priority}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full accent-violet-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  FAQs com maior prioridade são consideradas primeiro
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.question || !formData.answer || createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQs List */}
      {faqs && faqs.length > 0 ? (
        <div className="space-y-3">
          {faqs.map((faq: SdrFaq) => (
            <div
              key={faq.id}
              className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 hover:border-violet-500/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-5 w-5 text-violet-400" />
                    <h3 className="font-semibold text-white">{faq.question}</h3>
                  </div>
                  <p className="text-sm text-slate-400 ml-7">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
                    Prioridade: {faq.priority}
                  </span>
                  <button
                    onClick={() => handleEdit(faq)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
          <HelpCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">Nenhuma FAQ adicionada</h3>
          <p className="text-sm text-slate-500">
            Adicione perguntas frequentes para respostas rápidas
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// DOCUMENTS TAB
// ============================================================================

function DocumentsTab({ agentId }: { agentId: string }) {
  const { data: documents, isLoading } = useSdrDocuments(agentId)
  const uploadMutation = useUploadSdrDocument()
  const deleteMutation = useDeleteSdrDocument()
  const reprocessMutation = useReprocessSdrDocument()

  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    for (const file of files) {
      await uploadMutation.mutateAsync({ agentId, file })
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      await uploadMutation.mutateAsync({ agentId, file })
    }
    e.target.value = ''
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: RefreshCw },
      completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Check },
      failed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle },
    }
    const badge = badges[status] || badges.pending
    const Icon = badge.icon
    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${badge.bg} ${badge.text}`}>
        <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status === 'pending' && 'Pendente'}
        {status === 'processing' && 'Processando'}
        {status === 'completed' && 'Processado'}
        {status === 'failed' && 'Falhou'}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Documentos</h2>
        <p className="text-slate-400 text-sm mt-1">
          Faça upload de PDFs, TXT ou DOCX para expandir a base de conhecimento
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${dragActive
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-slate-700 hover:border-slate-600'
          }`}
      >
        <input
          type="file"
          accept=".pdf,.txt,.doc,.docx,.md"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className={`h-12 w-12 mx-auto mb-4 ${dragActive ? 'text-violet-400' : 'text-slate-600'}`} />
        <h3 className="text-lg font-medium text-slate-300 mb-2">
          {dragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
        </h3>
        <p className="text-sm text-slate-500">PDF, TXT, DOCX, MD (máx. 10MB)</p>
        {uploadMutation.isPending && (
          <div className="mt-4 flex items-center justify-center gap-2 text-violet-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Enviando...
          </div>
        )}
      </div>

      {/* Documents List */}
      {documents && documents.length > 0 ? (
        <div className="space-y-3">
          {documents.map((doc: SdrDocument) => (
            <div
              key={doc.id}
              className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-700/50 rounded-xl">
                  <FileText className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{doc.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">{doc.original_filename}</span>
                    <span className="text-xs text-slate-500">{doc.formatted_size}</span>
                    {getStatusBadge(doc.status)}
                  </div>
                  {doc.error_message && (
                    <p className="text-xs text-red-400 mt-1">{doc.error_message}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.status === 'failed' && (
                  <button
                    onClick={() => reprocessMutation.mutate({ agentId, documentId: doc.id })}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    title="Reprocessar"
                  >
                    <RefreshCw className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate({ agentId, documentId: doc.id })}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500">
          Nenhum documento enviado ainda
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PREVIEW TAB
// ============================================================================

function PreviewTab({ agentId }: { agentId: string }) {
  const { data: payload, isLoading } = usePreviewSdrPayload(agentId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Preview do Payload</h2>
        <p className="text-slate-400 text-sm mt-1">
          Visualize os dados que serão enviados ao n8n quando uma mensagem chegar
        </p>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 overflow-auto max-h-[70vh]">
        <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </div>
  )
}

