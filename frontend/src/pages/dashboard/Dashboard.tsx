import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Kanban,
  Clock,
  UserPlus,
  MessageCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { useDashboardStats, useRecentLeads, useRecentTasks } from '@/hooks/useDashboard'
import { usePipelines, type Pipeline } from '@/hooks/usePipelines'
import { formatCurrency, formatDateTime } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recentLeads, isLoading: leadsLoading } = useRecentLeads()
  const { data: recentTasks, isLoading: tasksLoading } = useRecentTasks()
  const { data: pipelines } = usePipelines()

  const statCards = [
    {
      title: 'Total de Leads',
      value: stats?.total_leads || 0,
      change: '+12.5%',
      trend: 'up' as const,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Conversões',
      value: stats?.leads_won || 0,
      change: `${stats?.conversion_rate?.toFixed(1) || 0}%`,
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Tickets Abertos',
      value: stats?.total_tickets || 0,
      change: '-3.1%',
      trend: 'down' as const,
      icon: MessageSquare,
      color: 'bg-yellow-500',
    },
    {
      title: 'Tarefas Pendentes',
      value: stats?.total_tasks || 0,
      change: '+22.4%',
      trend: 'up' as const,
      icon: CheckCircle,
      color: 'bg-purple-500',
    },
  ]

  if (statsLoading) {
    return <DashboardSkeleton />
  }

  // Build activity timeline from recent leads and tasks
  const activityItems = buildActivityTimeline(recentLeads || [], recentTasks || [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do seu CRM"
      />

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 ${stat.color}`}
                style={{ opacity: 0.5 }}
              />
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Pipeline Overview + Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Kanban className="h-4 w-4 text-muted-foreground" />
                Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pipelines && (pipelines as Pipeline[]).length > 0 ? (
                <div className="space-y-4">
                  {(pipelines as Pipeline[]).slice(0, 3).map((pipeline) => (
                    <PipelineWidget key={pipeline.id} pipeline={pipeline} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum pipeline configurado
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityItems.length > 0 ? (
                <div className="space-y-1">
                  {activityItems.slice(0, 8).map((activity, idx) => (
                    <div
                      key={`${activity.type}-${activity.id}`}
                      className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg ${activity.bgColor}`}>
                        <activity.icon className={`h-3.5 w-3.5 ${activity.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.subtitle}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {activity.time}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhuma atividade recente
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Leads + Tasks Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Leads Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : recentLeads?.length > 0 ? (
                <div className="space-y-4">
                  {recentLeads.map((lead: any) => (
                    <div
                      key={lead.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <Avatar
                        fallback={lead.contact?.name || 'L'}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {lead.contact?.name || 'Sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {lead.channel?.name || 'Direto'}
                        </p>
                      </div>
                      <div className="text-right">
                        {lead.value && (
                          <p className="font-semibold text-green-600">
                            {formatCurrency(lead.value)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(lead.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum lead encontrado
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Tarefas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : recentTasks?.length > 0 ? (
                <div className="space-y-4">
                  {recentTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {task.type}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {task.due_date ? formatDateTime(task.due_date) : 'Sem data'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma tarefa pendente
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

// ─── Pipeline Widget ──────────────────────────────────────────────

function PipelineWidget({ pipeline }: { pipeline: Pipeline }) {
  const stages = pipeline.stages || []
  const totalStages = stages.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{pipeline.name}</p>
        {pipeline.is_default && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Padrão
          </Badge>
        )}
      </div>
      {totalStages > 0 ? (
        <div className="flex gap-1">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="flex-1 group relative"
            >
              <div
                className="h-2 rounded-full transition-all group-hover:h-3"
                style={{ backgroundColor: stage.color || '#3B82F6', opacity: 0.7 }}
              />
              <p className="text-[10px] text-muted-foreground mt-1 truncate text-center">
                {stage.name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum estágio</p>
      )}
    </div>
  )
}

// ─── Activity Timeline Builder ────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'lead' | 'task'
  title: string
  subtitle: string
  time: string
  icon: typeof Users
  iconColor: string
  bgColor: string
  date: Date
}

function buildActivityTimeline(leads: any[], tasks: any[]): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const lead of leads) {
    items.push({
      id: lead.id,
      type: 'lead',
      title: lead.contact?.name || 'Novo lead',
      subtitle: lead.channel?.name ? `via ${lead.channel.name}` : 'Lead criado',
      time: formatRelativeTime(lead.created_at),
      icon: UserPlus,
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      date: new Date(lead.created_at),
    })
  }

  for (const task of tasks) {
    items.push({
      id: task.id,
      type: 'task',
      title: task.title,
      subtitle: task.type || 'Tarefa',
      time: formatRelativeTime(task.created_at || task.due_date),
      icon: CheckCircle,
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      date: new Date(task.created_at || task.due_date),
    })
  }

  // Sort by date descending
  items.sort((a, b) => b.date.getTime() - a.date.getTime())

  return items
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return formatDateTime(dateStr)
}
