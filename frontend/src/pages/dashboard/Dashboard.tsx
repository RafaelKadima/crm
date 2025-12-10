import { motion } from 'framer-motion'
import {
  Users,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { useDashboardStats, useRecentLeads, useRecentTasks } from '@/hooks/useDashboard'
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

  const statCards = [
    {
      title: 'Total de Leads',
      value: stats?.total_leads || 0,
      change: '+12.5%',
      trend: 'up',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Conversões',
      value: stats?.leads_won || 0,
      change: `${stats?.conversion_rate?.toFixed(1) || 0}%`,
      trend: 'up',
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      title: 'Tickets Abertos',
      value: stats?.total_tickets || 0,
      change: '-3.1%',
      trend: 'down',
      icon: MessageSquare,
      color: 'bg-yellow-500',
    },
    {
      title: 'Tarefas Pendentes',
      value: stats?.total_tasks || 0,
      change: '+22.4%',
      trend: 'up',
      icon: CheckCircle,
      color: 'bg-purple-500',
    },
  ]

  if (statsLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do seu CRM
        </p>
      </div>

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

      {/* Two Column Layout */}
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
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
