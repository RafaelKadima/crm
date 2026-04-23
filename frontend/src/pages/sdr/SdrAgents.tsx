import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Plus,
  Settings,
  Trash2,
  Power,
  MessageSquare,
  HelpCircle,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/layout/PageHeader'
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
      <div className="flex h-64 items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--color-bold-ink)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="IA · SDR AUTÔNOMO"
        title="SDR Agents"
        subtitle="Gerencie seus agentes de IA para atendimento automatizado. Cada agente opera 24/7 com tom, limites e base de conhecimento próprios."
        actions={
          <Button variant="bold" size="sm" onClick={() => navigate('/sdr/create')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Criar SDR Agent
          </Button>
        }
      />

      {agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className="mx-4 w-full max-w-md rounded-[14px] border p-6 shadow-2xl"
            style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
          >
            <h3 className="font-display text-[24px] leading-[1.15] tracking-[-0.015em]">
              Excluir SDR Agent?
            </h3>
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              Esta ação é irreversível. Todos os documentos e FAQs associados serão excluídos.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(deleteConfirm)}>
                Excluir
              </Button>
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
  onToggleActive,
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
    <div
      className={`group overflow-hidden rounded-[14px] border transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] ${
        agent.is_active ? '' : 'opacity-60'
      }`}
      style={{
        background: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{
                background: agent.is_active ? 'var(--color-bold-ink)' : 'var(--color-secondary)',
                color: agent.is_active ? '#0A0A0C' : 'var(--color-muted-foreground)',
              }}
            >
              <Bot className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-[18px] leading-[1.1] tracking-[-0.015em]">
                {agent.name}
              </h3>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{agent.ai_model}</p>
            </div>
          </div>
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
            style={{
              background: agent.is_active ? 'rgba(94,224,142,0.1)' : 'var(--color-secondary)',
              borderColor: agent.is_active ? 'rgba(94,224,142,0.3)' : 'var(--color-border)',
              color: agent.is_active ? 'var(--color-success)' : 'var(--color-muted-foreground)',
            }}
          >
            {agent.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        {agent.description && (
          <p className="mt-3 line-clamp-2 text-[12.5px] text-muted-foreground">
            {agent.description}
          </p>
        )}
      </div>

      {/* Stats — serif display */}
      <div className="grid grid-cols-3">
        {[
          { icon: BookOpen,    v: agent.documents_count || 0,    l: 'Documentos' },
          { icon: HelpCircle,  v: agent.faqs_count || 0,         l: 'FAQs', border: true },
          { icon: MessageSquare, v: agent.interactions_count || 0, l: 'Interações' },
        ].map((s, i) => (
          <div
            key={i}
            className="px-4 py-4 text-center"
            style={{
              borderLeft: s.border ? '1px solid var(--color-border)' : undefined,
              borderRight: s.border ? '1px solid var(--color-border)' : undefined,
            }}
          >
            <s.icon className="mx-auto mb-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <div className="font-display text-[22px] leading-none tracking-[-0.015em]">{s.v}</div>
            <div className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div
        className="flex flex-wrap gap-1.5 border-t px-5 py-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
          style={{
            background: agent.type === 'support' ? 'rgba(138,164,255,0.1)' : 'rgba(94,224,142,0.1)',
            borderColor: agent.type === 'support' ? 'rgba(138,164,255,0.3)' : 'rgba(94,224,142,0.3)',
            color: agent.type === 'support' ? 'var(--color-info)' : 'var(--color-success)',
          }}
        >
          {agent.type === 'support' ? 'Suporte' : 'SDR'}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] text-muted-foreground"
          style={{ background: 'var(--color-secondary)' }}
        >
          {toneLabels[agent.tone] || agent.tone}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] text-muted-foreground"
          style={{ background: 'var(--color-secondary)' }}
        >
          {agent.language}
        </span>
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
          style={{ background: 'var(--color-secondary)' }}
        >
          T={agent.temperature}
        </span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-between border-t px-4 py-3"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-muted)',
        }}
      >
        <button
          onClick={onToggleActive}
          className="rounded-[8px] p-1.5 transition-colors"
          style={{
            color: agent.is_active ? 'var(--color-success)' : 'var(--color-muted-foreground)',
          }}
          title={agent.is_active ? 'Desativar' : 'Ativar'}
        >
          <Power className="h-4 w-4" />
        </button>
        <div className="flex gap-1">
          <button
            onClick={onDelete}
            className="rounded-[8px] p-1.5 text-muted-foreground transition-colors hover:text-destructive"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Settings className="mr-1 h-3.5 w-3.5" />
            Configurar
          </Button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-[20px]"
        style={{
          background: 'var(--color-bold)',
          color: 'var(--color-bold-ink)',
        }}
      >
        <Sparkles className="h-8 w-8" strokeWidth={2} />
      </div>
      <p className="eyebrow">SEM AGENTES</p>
      <h2 className="mt-2 font-display text-[28px] leading-[1.1] tracking-[-0.015em]">
        Nenhum SDR Agent criado
      </h2>
      <p className="mx-auto mt-2 max-w-[440px] text-[13.5px] text-muted-foreground">
        Crie seu primeiro agente de IA para automatizar o atendimento dos seus leads com respostas
        personalizadas.
      </p>
      <div className="mt-5">
        <Button variant="bold" onClick={onCreateClick}>
          <Plus className="mr-1.5 h-4 w-4" />
          Criar Primeiro SDR Agent
        </Button>
      </div>
    </div>
  )
}

