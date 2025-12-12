import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  Target,
  DollarSign,
  MessageSquare,
  Brain,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { toast } from 'sonner'

interface SuggestedAction {
  id: string
  target_agent: string
  action_type: string
  priority: string
  title: string
  description: string
  rationale: string
  action_payload: any
  expected_impact: any
  status: string
  created_at: string
}

const priorityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

const priorityLabels = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const agentIcons = {
  sdr: MessageSquare,
  ads: Target,
  knowledge: Brain,
  ml: Bot,
}

const agentLabels = {
  sdr: 'SDR Agent',
  ads: 'Ads Agent',
  knowledge: 'Knowledge Base',
  ml: 'ML Training',
}

export function ActionApprovalQueue() {
  const queryClient = useQueryClient()
  const [expandedAction, setExpandedAction] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<SuggestedAction | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  // Busca ações
  const { data, isLoading } = useQuery({
    queryKey: ['bi-actions', filter],
    queryFn: async () => {
      const params = filter === 'all' ? {} : { status: filter }
      const response = await api.get('/bi/actions', { params })
      return response.data
    },
  })

  // Aprovar ação
  const approveMutation = useMutation({
    mutationFn: async (actionId: string) => {
      const response = await api.post(`/bi/actions/${actionId}/approve`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-actions'] })
      toast.success('Ação aprovada e executada!')
    },
    onError: () => {
      toast.error('Erro ao aprovar ação')
    },
  })

  // Rejeitar ação
  const rejectMutation = useMutation({
    mutationFn: async ({ actionId, reason }: { actionId: string; reason: string }) => {
      const response = await api.post(`/bi/actions/${actionId}/reject`, { reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-actions'] })
      setRejectDialogOpen(false)
      setRejectReason('')
      toast.success('Ação rejeitada')
    },
    onError: () => {
      toast.error('Erro ao rejeitar ação')
    },
  })

  const actions = data?.actions?.data || []
  const stats = data?.count_by_priority || {}

  const handleReject = (action: SuggestedAction) => {
    setSelectedAction(action)
    setRejectDialogOpen(true)
  }

  const confirmReject = () => {
    if (selectedAction && rejectReason) {
      rejectMutation.mutate({ actionId: selectedAction.id, reason: rejectReason })
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-purple-500" />
            Ações Sugeridas
          </h1>
          <p className="text-muted-foreground mt-1">
            Revise e aprove ações sugeridas pelo BI Agent
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-red-500 border-red-500">
            {stats.critical || 0} Críticas
          </Badge>
          <Badge variant="outline" className="text-orange-500 border-orange-500">
            {stats.high || 0} Altas
          </Badge>
          <Badge variant="outline" className="text-yellow-500 border-yellow-500">
            {stats.medium || 0} Médias
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'pending' && 'Pendentes'}
            {f === 'approved' && 'Aprovadas'}
            {f === 'rejected' && 'Rejeitadas'}
            {f === 'all' && 'Todas'}
          </Button>
        ))}
      </div>

      {/* Lista de Ações */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : actions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma ação pendente</h3>
            <p className="text-muted-foreground">
              O BI Agent sugerirá ações baseadas nas análises
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {actions.map((action: SuggestedAction, index: number) => {
              const AgentIcon = agentIcons[action.target_agent as keyof typeof agentIcons] || Bot
              const isExpanded = expandedAction === action.id
              
              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "overflow-hidden transition-shadow hover:shadow-lg",
                    action.priority === 'critical' && "border-red-500/50",
                    action.priority === 'high' && "border-orange-500/50"
                  )}>
                    <CardContent className="p-0">
                      {/* Header da Ação */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            {/* Prioridade */}
                            <div className={cn(
                              "w-2 h-16 rounded-full",
                              priorityColors[action.priority as keyof typeof priorityColors]
                            )} />
                            
                            {/* Ícone do Agente */}
                            <div className="p-2 rounded-lg bg-muted">
                              <AgentIcon className="h-6 w-6" />
                            </div>
                            
                            {/* Info */}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{action.title}</h3>
                                <Badge variant="secondary" className="text-xs">
                                  {agentLabels[action.target_agent as keyof typeof agentLabels]}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    action.priority === 'critical' && "text-red-500 border-red-500",
                                    action.priority === 'high' && "text-orange-500 border-orange-500"
                                  )}
                                >
                                  {priorityLabels[action.priority as keyof typeof priorityLabels]}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                {action.description}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(action.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          
                          {/* Botões de Ação */}
                          {action.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-500 hover:bg-red-500/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReject(action)
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  approveMutation.mutate(action.id)
                                }}
                                disabled={approveMutation.isPending}
                              >
                                {approveMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                Aprovar
                              </Button>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          
                          {action.status !== 'pending' && (
                            <Badge
                              variant={action.status === 'approved' ? 'default' : 'destructive'}
                            >
                              {action.status === 'approved' && 'Aprovada'}
                              {action.status === 'rejected' && 'Rejeitada'}
                              {action.status === 'executed' && 'Executada'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Detalhes Expandidos */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t"
                          >
                            <div className="p-4 bg-muted/30 space-y-4">
                              {/* Motivo */}
                              <div>
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                  Motivo da Sugestão
                                </h4>
                                <p className="text-sm text-muted-foreground bg-background p-3 rounded-lg">
                                  {action.rationale}
                                </p>
                              </div>
                              
                              {/* Impacto Esperado */}
                              {action.expected_impact && (
                                <div>
                                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                    <Target className="h-4 w-4 text-green-500" />
                                    Impacto Esperado
                                  </h4>
                                  <div className="flex items-center gap-4 bg-background p-3 rounded-lg">
                                    <span className="text-sm text-muted-foreground">
                                      Métrica: {action.expected_impact.metric}
                                    </span>
                                    <Badge variant="secondary" className="text-green-500">
                                      {action.expected_impact.expected_change}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                              
                              {/* Payload */}
                              <div>
                                <h4 className="text-sm font-semibold mb-2">
                                  Dados da Ação
                                </h4>
                                <pre className="text-xs bg-background p-3 rounded-lg overflow-auto max-h-40">
                                  {JSON.stringify(action.action_payload, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog de Rejeição */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Ação</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Por favor, informe o motivo da rejeição para ajudar o BI Agent a aprender.
            </p>
            <Input
              placeholder="Motivo da rejeição..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectReason || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

