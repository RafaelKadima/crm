import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Bot,
  Search,
  Filter,
  RefreshCcw,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Terminal,
  FileSearch,
  Code,
  BookOpen,
  Users,
  Bug,
  Zap,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SupportActivity {
  id: string
  tenant_id: string
  agent_id: string
  ticket_id: string | null
  lead_id: string | null
  action_type: 'diagnostic' | 'response' | 'transfer' | 'resolution'
  tool_used: string | null
  tool_arguments: Record<string, any> | null
  tool_result: string | null
  user_message: string | null
  agent_response: string | null
  error_found: boolean
  error_details: Record<string, any> | null
  resolution_provided: boolean
  resolution_summary: string | null
  execution_time_ms: number | null
  tokens_used: number | null
  created_at: string
  agent?: {
    name: string
  }
  ticket?: {
    id: string
  }
  lead?: {
    contact?: {
      name: string
    }
  }
}

interface SupportStats {
  period: {
    from: string
    to: string
  }
  totals: {
    responses: number
    diagnostics: number
    bugs_found: number
    resolutions: number
    transfers: number
  }
  metrics: {
    avg_execution_time_ms: number
    total_tokens: number
    autonomous_resolution_rate: number
  }
  top_tools: Array<{ tool_used: string; count: number }>
  daily_activity: Array<{ date: string; count: number }>
}

const toolIcons: Record<string, React.ElementType> = {
  get_error_logs: Terminal,
  search_codebase: Code,
  read_file: FileSearch,
  search_knowledge: BookOpen,
}

const actionTypeLabels: Record<string, { label: string; color: string }> = {
  diagnostic: { label: 'Diagnóstico', color: 'bg-blue-500' },
  response: { label: 'Resposta', color: 'bg-green-500' },
  transfer: { label: 'Transferência', color: 'bg-orange-500' },
  resolution: { label: 'Resolução', color: 'bg-purple-500' },
}

function StatsCards({ stats }: { stats: SupportStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Respostas</p>
                <p className="text-2xl font-bold">{stats.totals.responses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Search className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diagnósticos</p>
                <p className="text-2xl font-bold">{stats.totals.diagnostics}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <Bug className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bugs Encontrados</p>
                <p className="text-2xl font-bold">{stats.totals.bugs_found}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resoluções</p>
                <p className="text-2xl font-bold">{stats.totals.resolutions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Autônoma</p>
                <p className="text-2xl font-bold">{stats.metrics.autonomous_resolution_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function ActivityCard({ activity }: { activity: SupportActivity }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = activity.tool_used ? toolIcons[activity.tool_used] || Terminal : Bot
  const actionType = actionTypeLabels[activity.action_type] || { label: activity.action_type, color: 'bg-gray-500' }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border-l-2 border-muted pl-4 pb-6 relative"
    >
      <div className={cn(
        "absolute -left-2 top-0 w-4 h-4 rounded-full",
        actionType.color
      )} />

      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpanded(!expanded)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={cn("text-white", actionType.color)}>
                    {actionType.label}
                  </Badge>
                  {activity.tool_used && (
                    <Badge variant="outline">{activity.tool_used}</Badge>
                  )}
                  {activity.error_found && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Bug
                    </Badge>
                  )}
                  {activity.resolution_provided && (
                    <Badge className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolvido
                    </Badge>
                  )}
                </div>
                {activity.user_message && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    <span className="font-medium">Usuário:</span> {activity.user_message}
                  </p>
                )}
                {activity.agent_response && (
                  <p className="text-sm mt-1 line-clamp-2">
                    <span className="font-medium">Zion:</span> {activity.agent_response}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{format(new Date(activity.created_at), "dd/MM HH:mm", { locale: ptBR })}</p>
              {activity.execution_time_ms && (
                <p className="flex items-center gap-1 justify-end mt-1">
                  <Clock className="h-3 w-3" />
                  {activity.execution_time_ms}ms
                </p>
              )}
            </div>
          </div>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t space-y-3"
            >
              {activity.tool_arguments && (
                <div>
                  <p className="text-sm font-medium mb-1">Argumentos:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(activity.tool_arguments, null, 2)}
                  </pre>
                </div>
              )}
              {activity.tool_result && (
                <div>
                  <p className="text-sm font-medium mb-1">Resultado:</p>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
                    {activity.tool_result.substring(0, 2000)}
                    {activity.tool_result.length > 2000 && '...'}
                  </pre>
                </div>
              )}
              {activity.error_details && (
                <div>
                  <p className="text-sm font-medium mb-1 text-red-500">Detalhes do Erro:</p>
                  <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto">
                    {JSON.stringify(activity.error_details, null, 2)}
                  </pre>
                </div>
              )}
              {activity.resolution_summary && (
                <div>
                  <p className="text-sm font-medium mb-1 text-green-600">Resolução:</p>
                  <p className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">
                    {activity.resolution_summary}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {activity.tokens_used && <span>Tokens: {activity.tokens_used}</span>}
                {activity.ticket_id && <span>Ticket: {activity.ticket_id.substring(0, 8)}...</span>}
                {activity.lead?.contact?.name && <span>Lead: {activity.lead.contact.name}</span>}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function SupportHistory() {
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all')
  const [toolFilter, setToolFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['support-stats'],
    queryFn: async () => {
      const response = await api.get('/support/stats')
      return response.data as SupportStats
    },
  })

  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = useQuery({
    queryKey: ['support-activities', actionTypeFilter, toolFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (actionTypeFilter !== 'all') params.append('action_type', actionTypeFilter)
      if (toolFilter !== 'all') params.append('tool_used', toolFilter)
      params.append('page', page.toString())
      params.append('per_page', '20')

      const response = await api.get(`/support/activities?${params.toString()}`)
      return response.data
    },
  })

  const handleRefresh = () => {
    refetchStats()
    refetchActivities()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Histórico do Zion
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe todas as ações e diagnósticos do agente de suporte
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {stats && <StatsCards stats={stats} />}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Timeline de Atividades
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo de ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="diagnostic">Diagnóstico</SelectItem>
                  <SelectItem value="response">Resposta</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="resolution">Resolução</SelectItem>
                </SelectContent>
              </Select>
              <Select value={toolFilter} onValueChange={setToolFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ferramenta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ferramentas</SelectItem>
                  <SelectItem value="get_error_logs">get_error_logs</SelectItem>
                  <SelectItem value="search_codebase">search_codebase</SelectItem>
                  <SelectItem value="read_file">read_file</SelectItem>
                  <SelectItem value="search_knowledge">search_knowledge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activities?.data?.length > 0 ? (
            <div className="space-y-2">
              {activities.data.map((activity: SupportActivity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma atividade encontrada</p>
              <p className="text-sm">As atividades do Zion aparecerão aqui quando ele atender clientes</p>
            </div>
          )}

          {activities?.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {activities.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === activities.last_page}
                onClick={() => setPage(p => p + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
