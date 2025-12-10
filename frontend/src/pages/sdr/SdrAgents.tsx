import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Bot, 
  Plus, 
  Settings, 
  Trash2, 
  Power, 
  MessageSquare,
  FileText,
  HelpCircle,
  BookOpen,
  Sparkles
} from 'lucide-react'
import { useSdrAgents, useDeleteSdrAgent, useToggleSdrAgentActive } from '../../hooks/useSdrAgents'
import type { SdrAgent } from '../../types'

export default function SdrAgents() {
  const navigate = useNavigate()
  const { data: agents, isLoading } = useSdrAgents()
  const deleteMutation = useDeleteSdrAgent()
  const toggleActiveMutation = useToggleSdrAgentActive()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id)
    setDeleteConfirm(null)
  }

  const handleToggleActive = async (id: string) => {
    await toggleActiveMutation.mutateAsync(id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/25">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">SDR Agents</h1>
              <p className="text-slate-400 mt-1">Gerencie seus agentes de IA para atendimento automatizado</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/sdr/create')}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/25 font-medium"
          >
            <Plus className="h-5 w-5" />
            Criar SDR Agent
          </button>
        </div>
      </div>

      {/* Agents Grid */}
      {agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={() => navigate(`/sdr/${agent.id}`)}
              onDelete={() => setDeleteConfirm(agent.id)}
              onToggleActive={() => handleToggleActive(agent.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState onCreateClick={() => navigate('/sdr/create')} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-2">Excluir SDR Agent?</h3>
            <p className="text-slate-400 mb-6">
              Esta ação é irreversível. Todos os documentos e FAQs associados serão excluídos.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AgentCard({ 
  agent, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: { 
  agent: SdrAgent
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  const toneLabels: Record<string, string> = {
    professional: 'Profissional',
    friendly: 'Amigável',
    formal: 'Formal',
    casual: 'Casual',
  }

  return (
    <div className={`bg-slate-800/50 backdrop-blur rounded-2xl border ${agent.is_active ? 'border-slate-700' : 'border-slate-700/50 opacity-60'} overflow-hidden hover:border-violet-500/50 transition-all group`}>
      {/* Header */}
      <div className="p-5 border-b border-slate-700/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${agent.is_active ? 'bg-gradient-to-br from-violet-500/20 to-purple-500/20' : 'bg-slate-700/50'}`}>
              <Bot className={`h-6 w-6 ${agent.is_active ? 'text-violet-400' : 'text-slate-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{agent.name}</h3>
              <p className="text-sm text-slate-400">{agent.ai_model}</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${agent.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
            {agent.is_active ? 'Ativo' : 'Inativo'}
          </div>
        </div>
        {agent.description && (
          <p className="text-sm text-slate-400 mt-3 line-clamp-2">{agent.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="p-5 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="text-lg font-semibold text-white">{agent.documents_count || 0}</div>
          <div className="text-xs text-slate-500">Documentos</div>
        </div>
        <div className="text-center border-x border-slate-700/50">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div className="text-lg font-semibold text-white">{agent.faqs_count || 0}</div>
          <div className="text-xs text-slate-500">FAQs</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="text-lg font-semibold text-white">{agent.interactions_count || 0}</div>
          <div className="text-xs text-slate-500">Interações</div>
        </div>
      </div>

      {/* Tags */}
      <div className="px-5 pb-4 flex flex-wrap gap-2">
        <span className="px-2 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">
          {toneLabels[agent.tone] || agent.tone}
        </span>
        <span className="px-2 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">
          {agent.language}
        </span>
        <span className="px-2 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-400">
          Temp: {agent.temperature}
        </span>
      </div>

      {/* Actions */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 flex items-center justify-between">
        <button
          onClick={onToggleActive}
          className={`p-2 rounded-lg transition-colors ${agent.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-700'}`}
          title={agent.is_active ? 'Desativar' : 'Ativar'}
        >
          <Power className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600/20 text-violet-400 rounded-lg hover:bg-violet-600/30 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="p-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-3xl mb-6">
        <Sparkles className="h-16 w-16 text-violet-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Nenhum SDR Agent criado</h2>
      <p className="text-slate-400 text-center max-w-md mb-8">
        Crie seu primeiro agente de IA para automatizar o atendimento dos seus leads com respostas personalizadas.
      </p>
      <button
        onClick={onCreateClick}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/25 font-medium"
      >
        <Plus className="h-5 w-5" />
        Criar Primeiro SDR Agent
      </button>
    </div>
  )
}

