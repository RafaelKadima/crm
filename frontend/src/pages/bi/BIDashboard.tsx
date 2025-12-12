import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Bot,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  RefreshCcw,
  Settings,
  FileText,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { Link } from 'react-router-dom'

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ElementType
  color: string
}

function KPICard({ title, value, change, changeLabel, icon: Icon, color }: KPICardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
    >
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-3xl font-bold mt-2">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1 mt-2">
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : isNegative ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : null}
                  <span className={cn(
                    "text-sm font-medium",
                    isPositive && "text-green-500",
                    isNegative && "text-red-500"
                  )}>
                    {isPositive && '+'}{change}%
                  </span>
                  {changeLabel && (
                    <span className="text-xs text-muted-foreground">{changeLabel}</span>
                  )}
                </div>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              color
            )}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function BIDashboard() {
  const [period, setPeriod] = useState('30d')

  // Busca dados do dashboard
  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ['bi-dashboard', period],
    queryFn: async () => {
      const response = await api.get('/bi/dashboard', { params: { period } })
      return response.data
    },
  })

  // Busca resumo executivo
  const { data: summary } = useQuery({
    queryKey: ['bi-executive-summary', period],
    queryFn: async () => {
      const response = await api.get('/bi/executive-summary', { params: { period } })
      return response.data
    },
  })

  const kpis = summary?.kpis || {}

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Business Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise inteligente do seu negócio com IA
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-background"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Link to="/bi/analyst">
            <Button>
              <Bot className="h-4 w-4 mr-2" />
              Analista IA
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Receita"
          value={`R$ ${((kpis.revenue?.current || 0) / 1000).toFixed(0)}k`}
          change={kpis.revenue?.growth ? kpis.revenue.growth * 100 : undefined}
          changeLabel="vs período anterior"
          icon={DollarSign}
          color="bg-green-500"
        />
        <KPICard
          title="Leads"
          value={kpis.leads?.total || 0}
          change={15}
          changeLabel="vs período anterior"
          icon={Users}
          color="bg-blue-500"
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${((kpis.leads?.rate || 0) * 100).toFixed(1)}%`}
          change={kpis.conversion_rate?.change ? kpis.conversion_rate.change * 100 : undefined}
          icon={TrendingUp}
          color="bg-purple-500"
        />
        <KPICard
          title="Custo IA"
          value={`R$ ${kpis.ai_cost?.current || 0}`}
          change={-8}
          changeLabel="economia"
          icon={Bot}
          color="bg-orange-500"
        />
        <KPICard
          title="ROAS"
          value={`${kpis.roas?.current || 0}x`}
          change={12}
          icon={Sparkles}
          color="bg-pink-500"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights da IA */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Insights da IA
            </CardTitle>
            <Link to="/bi/analyst">
              <Button variant="ghost" size="sm">
                Ver todos <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary?.highlights?.map((highlight: string, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <p className="text-sm">{highlight}</p>
              </motion.div>
            ))}
            {summary?.alerts?.map((alert: any, index: number) => (
              <motion.div
                key={`alert-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg",
                  alert.severity === 'critical' && "bg-red-500/10 border border-red-500/20",
                  alert.severity === 'high' && "bg-yellow-500/10 border border-yellow-500/20"
                )}
              >
                <AlertTriangle className={cn(
                  "h-5 w-5 mt-0.5",
                  alert.severity === 'critical' && "text-red-500",
                  alert.severity === 'high' && "text-yellow-500"
                )} />
                <p className="text-sm">{alert.message}</p>
              </motion.div>
            ))}
            {!summary?.highlights?.length && !summary?.alerts?.length && (
              <p className="text-muted-foreground text-center py-8">
                Execute uma análise para ver insights
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ações Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Ações Pendentes
            </CardTitle>
            <Badge variant="secondary">
              {dashboard?.pending_actions || 0}
            </Badge>
          </CardHeader>
          <CardContent>
            {dashboard?.pending_actions > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Você tem {dashboard.pending_actions} ações sugeridas pelo BI Agent aguardando aprovação.
                </p>
                <Link to="/bi/actions">
                  <Button className="w-full">
                    Revisar Ações
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma ação pendente
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/bi/reports">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Relatórios</h3>
                <p className="text-sm text-muted-foreground">PDF, Excel, API</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/bi/analyst">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <MessageSquare className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="font-semibold">Chat com Analista</h3>
                <p className="text-sm text-muted-foreground">Pergunte à IA</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/bi/actions">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-500/10">
                <CheckCircle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold">Aprovar Ações</h3>
                <p className="text-sm text-muted-foreground">
                  {dashboard?.pending_actions || 0} pendentes
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/bi/config">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gray-500/10">
                <Settings className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <h3 className="font-semibold">Configurações</h3>
                <p className="text-sm text-muted-foreground">BI Agent</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Previsões */}
      {summary?.predictions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Previsões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <p className="text-sm text-muted-foreground">Receita Próximo Mês</p>
                <p className="text-2xl font-bold text-green-500">
                  R$ {((summary.predictions.next_month_revenue || 0) / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Baseado em tendência atual e sazonalidade
                </p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
                <p className="text-sm text-muted-foreground">Leads Necessários</p>
                <p className="text-2xl font-bold text-blue-500">
                  {summary.predictions.leads_needed || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Para atingir a meta de receita
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

