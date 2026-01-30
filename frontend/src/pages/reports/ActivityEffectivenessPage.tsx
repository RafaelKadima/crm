import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart,
  Pie,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from 'lucide-react'
import {
  useActivityEffectiveness,
  useSequenceAnalysis,
  useEffectivenessByUser,
} from '@/hooks/useActivityAnalysis'
import type { ActivityEffectivenessItem } from '@/api/endpoints'

const COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#6b7280',
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  warning: '#f59e0b',
}

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: '#3b82f6',
  email: '#8b5cf6',
  meeting: '#22c55e',
  follow_up: '#f59e0b',
  proposal: '#ec4899',
  presentation: '#06b6d4',
  task: '#6366f1',
  other: '#6b7280',
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: 'Ligacao',
  email: 'E-mail',
  meeting: 'Reuniao',
  follow_up: 'Follow-up',
  proposal: 'Proposta',
  presentation: 'Apresentacao',
  task: 'Tarefa',
  other: 'Outro',
}

export function ActivityEffectivenessPage() {
  const [dateRange] = useState({
    start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  })

  const { data: effectiveness, isLoading: loadingEffectiveness } = useActivityEffectiveness(dateRange)
  const { data: sequence, isLoading: loadingSequence } = useSequenceAnalysis(dateRange)
  const { data: byUser, isLoading: loadingByUser } = useEffectivenessByUser(dateRange)

  const isLoading = loadingEffectiveness || loadingSequence || loadingByUser

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Prepare chart data
  const effectivenessChartData = effectiveness?.all_activities
    ?.filter((a: ActivityEffectivenessItem) => a.total_completed >= 3)
    ?.slice(0, 10)
    ?.map((a: ActivityEffectivenessItem) => ({
      name: a.template_title.length > 20 ? a.template_title.slice(0, 20) + '...' : a.template_title,
      fullName: a.template_title,
      impact: a.impact_percentage,
      conversao: a.conversion_rate,
      semAtividade: a.conversion_without,
      total: a.total_completed,
      color: a.impact_percentage > 0 ? COLORS.positive : a.impact_percentage < 0 ? COLORS.negative : COLORS.neutral,
    })) || []

  // Activity distribution for won vs lost
  const wonDistribution = Object.entries(sequence?.won?.activity_distribution || {}).map(([type, count]) => ({
    name: ACTIVITY_TYPE_LABELS[type] || type,
    value: count as number,
    color: ACTIVITY_TYPE_COLORS[type] || COLORS.neutral,
  }))

  const lostDistribution = Object.entries(sequence?.lost?.activity_distribution || {}).map(([type, count]) => ({
    name: ACTIVITY_TYPE_LABELS[type] || type,
    value: count as number,
    color: ACTIVITY_TYPE_COLORS[type] || COLORS.neutral,
  }))

  // User comparison data
  const userChartData = byUser?.users?.slice(0, 10)?.map((u) => ({
    name: u.user_name?.split(' ')[0] || 'Usuario',
    fullName: u.user_name,
    conversao: u.conversion_rate,
    atividades: u.activities_per_lead,
    leads: u.total_leads,
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Efetividade de Atividades"
        subtitle="Analise quais atividades mais contribuem para conversao de vendas"
        actions={
          <div className="text-sm text-muted-foreground">
            Periodo: {dateRange.start_date} a {dateRange.end_date}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lift Geral</p>
                  <p className="text-2xl font-bold">
                    {effectiveness?.summary?.overall_lift > 0 ? '+' : ''}
                    {effectiveness?.summary?.overall_lift?.toFixed(1) || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Impacto das atividades
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Activity className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atividades Analisadas</p>
                  <p className="text-2xl font-bold">
                    {effectiveness?.summary?.total_activities_analyzed || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Zap className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alto Impacto</p>
                  <p className="text-2xl font-bold">
                    {effectiveness?.summary?.high_impact_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Atividades com &gt;10% lift
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/20">
                  <AlertTriangle className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criticas</p>
                  <p className="text-2xl font-bold">
                    {effectiveness?.summary?.critical_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Obrigatorias + alto impacto
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Won vs Lost Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Leads Ganhos ({sequence?.won?.total_leads || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Media de Atividades</p>
                  <p className="text-xl font-bold text-green-400">
                    {sequence?.won?.avg_activities?.toFixed(1) || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Dias para Fechar</p>
                  <p className="text-xl font-bold">
                    {sequence?.won?.avg_days_to_close?.toFixed(0) || 0}
                  </p>
                </div>
              </div>
              {wonDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={wonDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {wonDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  Sem dados disponiveis
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" />
                Leads Perdidos ({sequence?.lost?.total_leads || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Media de Atividades</p>
                  <p className="text-xl font-bold text-red-400">
                    {sequence?.lost?.avg_activities?.toFixed(1) || 0}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Dias no Funil</p>
                  <p className="text-xl font-bold">
                    {sequence?.lost?.avg_days_to_close?.toFixed(0) || 0}
                  </p>
                </div>
              </div>
              {lostDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={lostDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {lostDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  Sem dados disponiveis
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Insights */}
      {sequence?.insights && sequence.insights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-400" />
                Insights Automaticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sequence.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      insight.severity === 'high'
                        ? 'bg-red-500/10 border-red-500/20'
                        : insight.severity === 'medium'
                        ? 'bg-yellow-500/10 border-yellow-500/20'
                        : 'bg-blue-500/10 border-blue-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          insight.severity === 'high'
                            ? 'bg-red-500/20'
                            : insight.severity === 'medium'
                            ? 'bg-yellow-500/20'
                            : 'bg-blue-500/20'
                        }`}
                      >
                        {insight.severity === 'high' ? (
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        ) : insight.severity === 'medium' ? (
                          <Clock className="h-4 w-4 text-yellow-400" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{insight.message}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Impact Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Impacto das Atividades na Conversao
            </CardTitle>
          </CardHeader>
          <CardContent>
            {effectivenessChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={effectivenessChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" domain={['dataMin - 5', 'dataMax + 5']} unit="%" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any, name: string) => [
                      `${Number(value).toFixed(1)}%`,
                      name === 'impact' ? 'Impacto' : name === 'conversao' ? 'Com Atividade' : 'Sem Atividade',
                    ]}
                    labelFormatter={(label) => {
                      const item = effectivenessChartData.find((d) => d.name === label)
                      return item?.fullName || label
                    }}
                  />
                  <Legend />
                  <Bar dataKey="impact" name="Impacto" radius={[0, 4, 4, 0]}>
                    {effectivenessChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                Sem dados suficientes para analise
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Performing & Needs Improvement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-green-400" />
                Atividades Mais Efetivas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {effectiveness?.top_performing && effectiveness.top_performing.length > 0 ? (
                <div className="space-y-3">
                  {effectiveness.top_performing.map((activity, index) => (
                    <div
                      key={activity.template_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <div>
                        <p className="font-medium">{activity.template_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.stage_name} - {ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">
                          +{activity.impact_percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.total_completed} execucoes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atividade com impacto positivo significativo
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Needs Improvement */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownRight className="h-5 w-5 text-red-400" />
                Precisam de Atencao
              </CardTitle>
            </CardHeader>
            <CardContent>
              {effectiveness?.needs_improvement && effectiveness.needs_improvement.length > 0 ? (
                <div className="space-y-3">
                  {effectiveness.needs_improvement.map((activity, index) => (
                    <div
                      key={activity.template_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <div>
                        <p className="font-medium">{activity.template_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.stage_name} - {ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-400">
                          {activity.impact_percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.total_completed} execucoes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma atividade com impacto negativo
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* User Comparison */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Comparativo por Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label) => {
                      const item = userChartData.find((d) => d.name === label)
                      return item?.fullName || label
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="conversao"
                    fill={COLORS.positive}
                    name="Conversao (%)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="atividades"
                    fill={COLORS.primary}
                    name="Atividades/Lead"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Sem dados de vendedores
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Full Activity Table */}
      {effectiveness?.all_activities && effectiveness.all_activities.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
          <Card>
            <CardHeader>
              <CardTitle>Todas as Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium">Atividade</th>
                      <th className="text-left py-3 px-4 font-medium">Tipo</th>
                      <th className="text-left py-3 px-4 font-medium">Etapa</th>
                      <th className="text-center py-3 px-4 font-medium">Execucoes</th>
                      <th className="text-center py-3 px-4 font-medium">Conv. Com</th>
                      <th className="text-center py-3 px-4 font-medium">Conv. Sem</th>
                      <th className="text-center py-3 px-4 font-medium">Impacto</th>
                      <th className="text-center py-3 px-4 font-medium">Tempo Medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveness.all_activities.map((activity) => (
                      <tr
                        key={activity.template_id}
                        className="border-b border-border/50 hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {activity.is_critical && (
                              <Zap className="h-4 w-4 text-orange-400" />
                            )}
                            {activity.is_high_impact && !activity.is_critical && (
                              <TrendingUp className="h-4 w-4 text-green-400" />
                            )}
                            <span className="font-medium">{activity.template_title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: `${ACTIVITY_TYPE_COLORS[activity.activity_type] || COLORS.neutral}20`,
                              color: ACTIVITY_TYPE_COLORS[activity.activity_type] || COLORS.neutral,
                            }}
                          >
                            {ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {activity.stage_name || '-'}
                        </td>
                        <td className="text-center py-3 px-4">{activity.total_completed}</td>
                        <td className="text-center py-3 px-4 text-green-400">
                          {activity.conversion_rate.toFixed(1)}%
                        </td>
                        <td className="text-center py-3 px-4 text-muted-foreground">
                          {activity.conversion_without.toFixed(1)}%
                        </td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={
                              activity.impact_percentage > 0
                                ? 'text-green-400'
                                : activity.impact_percentage < 0
                                ? 'text-red-400'
                                : 'text-muted-foreground'
                            }
                          >
                            {activity.impact_percentage > 0 ? '+' : ''}
                            {activity.impact_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 text-muted-foreground">
                          {activity.avg_completion_minutes.toFixed(0)} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default ActivityEffectivenessPage
