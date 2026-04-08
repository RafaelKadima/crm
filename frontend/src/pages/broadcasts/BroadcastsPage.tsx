import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Play,
  Pause,
  XCircle,
  Trash2,
  Megaphone,
  Send,
  CheckCheck,
  Eye,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  useBroadcasts,
  useStartBroadcast,
  usePauseBroadcast,
  useCancelBroadcast,
  useDeleteBroadcast,
} from '@/hooks/useBroadcasts'
import { CreateBroadcastModal } from '@/components/broadcasts/CreateBroadcastModal'
import type { Broadcast, BroadcastStatus } from '@/types'

const statusConfig: Record<BroadcastStatus, { label: string; color: string; icon: typeof Send }> = {
  DRAFT: { label: 'Rascunho', color: 'text-muted-foreground bg-muted/50', icon: Megaphone },
  SENDING: { label: 'Enviando', color: 'text-info bg-info/20', icon: Send },
  PAUSED: { label: 'Pausado', color: 'text-warning bg-warning/20', icon: Pause },
  COMPLETED: { label: 'Concluído', color: 'text-success bg-success/20', icon: CheckCheck },
  CANCELLED: { label: 'Cancelado', color: 'text-destructive bg-destructive/20', icon: XCircle },
}

const filterTabs = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Rascunhos' },
  { value: 'SENDING', label: 'Enviando' },
  { value: 'COMPLETED', label: 'Concluídos' },
]

export function BroadcastsPage() {
  const { t } = useTranslation()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: response, isLoading } = useBroadcasts({
    search: search || undefined,
    status: statusFilter || undefined,
    page,
    per_page: 20,
  })

  const startMutation = useStartBroadcast()
  const pauseMutation = usePauseBroadcast()
  const cancelMutation = useCancelBroadcast()
  const deleteMutation = useDeleteBroadcast()

  const broadcasts: Broadcast[] = response?.data?.data || []
  const pagination = response?.data

  const handleStart = async (id: string) => {
    try {
      await startMutation.mutateAsync(id)
      toast.success('Broadcast iniciado')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao iniciar')
    }
  }

  const handlePause = async (id: string) => {
    try {
      await pauseMutation.mutateAsync(id)
      toast.success('Broadcast pausado')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao pausar')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id)
      toast.success('Broadcast cancelado')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao cancelar')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Broadcast excluído')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao excluir')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcasts"
        subtitle={`Envio em massa via WhatsApp`}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Broadcast
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar broadcast..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-10"
          />
        </div>

        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1) }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : broadcasts.length === 0 ? (
        <EmptyState onCreateClick={() => setShowCreate(true)} />
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {broadcasts.map((broadcast, index) => (
              <BroadcastCard
                key={broadcast.id}
                broadcast={broadcast}
                index={index}
                onStart={handleStart}
                onPause={handlePause}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} de {pagination.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.last_page}
            onClick={() => setPage(page + 1)}
          >
            Próximo
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <CreateBroadcastModal
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </div>
  )
}

function BroadcastCard({
  broadcast,
  index,
  onStart,
  onPause,
  onCancel,
  onDelete,
}: {
  broadcast: Broadcast
  index: number
  onStart: (id: string) => void
  onPause: (id: string) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const config = statusConfig[broadcast.status]
  const StatusIcon = config.icon

  const sentPct = broadcast.total_recipients > 0
    ? Math.round((broadcast.sent_count / broadcast.total_recipients) * 100)
    : 0
  const deliveredPct = broadcast.sent_count > 0
    ? Math.round((broadcast.delivered_count / broadcast.sent_count) * 100)
    : 0
  const readPct = broadcast.delivered_count > 0
    ? Math.round((broadcast.read_count / broadcast.delivered_count) * 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.03 }}
      className="bg-card border rounded-lg p-5 hover:border-foreground/10 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-foreground truncate">{broadcast.name}</h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
            <span>{broadcast.template?.name || 'Template'}</span>
            <span>{broadcast.channel?.name || 'Canal'}</span>
            <span>{broadcast.total_recipients} destinatários</span>
            <span>{new Date(broadcast.created_at).toLocaleDateString('pt-BR')}</span>
          </div>

          {/* Progress bars */}
          {broadcast.status !== 'DRAFT' && (
            <div className="grid grid-cols-4 gap-4">
              <StatItem
                icon={<Send className="h-3.5 w-3.5" />}
                label="Enviados"
                value={broadcast.sent_count}
                total={broadcast.total_recipients}
                pct={sentPct}
                color="bg-info"
              />
              <StatItem
                icon={<CheckCheck className="h-3.5 w-3.5" />}
                label="Entregues"
                value={broadcast.delivered_count}
                total={broadcast.sent_count}
                pct={deliveredPct}
                color="bg-success"
              />
              <StatItem
                icon={<Eye className="h-3.5 w-3.5" />}
                label="Lidos"
                value={broadcast.read_count}
                total={broadcast.delivered_count}
                pct={readPct}
                color="bg-emerald-400"
              />
              <StatItem
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label="Falhas"
                value={broadcast.failed_count}
                total={broadcast.total_recipients}
                pct={broadcast.total_recipients > 0 ? Math.round((broadcast.failed_count / broadcast.total_recipients) * 100) : 0}
                color="bg-destructive"
              />
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {broadcast.status === 'DRAFT' && (
            <Button size="sm" onClick={() => onStart(broadcast.id)}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Iniciar
            </Button>
          )}
          {broadcast.status === 'PAUSED' && (
            <Button size="sm" onClick={() => onStart(broadcast.id)}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Retomar
            </Button>
          )}
          {broadcast.status === 'SENDING' && (
            <Button size="sm" variant="outline" onClick={() => onPause(broadcast.id)}>
              <Pause className="h-3.5 w-3.5 mr-1.5" />
              Pausar
            </Button>
          )}

          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded-lg shadow-lg py-1 min-w-[140px]">
                  {['DRAFT', 'SENDING', 'PAUSED'].includes(broadcast.status) && (
                    <button
                      onClick={() => { onCancel(broadcast.id); setShowActions(false) }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2 text-destructive"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                  )}
                  {['DRAFT', 'COMPLETED', 'CANCELLED'].includes(broadcast.status) && (
                    <button
                      onClick={() => { onDelete(broadcast.id); setShowActions(false) }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-muted/50 flex items-center gap-2 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function StatItem({
  icon,
  label,
  value,
  total,
  pct,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  total: number
  pct: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
        <span className="ml-auto font-medium text-foreground">{value}/{total}</span>
      </div>
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted/30 flex items-center justify-center">
          <Megaphone className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Nenhum broadcast</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          Crie seu primeiro broadcast para enviar mensagens em massa via WhatsApp.
        </p>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Broadcast
        </Button>
      </div>
    </div>
  )
}
