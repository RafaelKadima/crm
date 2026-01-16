import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Loader2, TrendingUp, Users, DollarSign, Target, Calendar, Filter } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import api from '@/api/axios'
import { usePipelines } from '@/hooks/usePipelines'
import { useFunnelTimeSeries } from '@/hooks/useReports'

// Cores para os gráficos
const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#22c55e', '#06b6d4', '#f97316', '#ef4444', '#84cc16', '#14b8a6']

const channelColors: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  facebook: '#1877F2',
  email: '#EA4335',
  telefone: '#6366f1',
  outros: '#6B7280',
}

export function ReportsPage() {
  // State para filtros
  const [filters, setFilters] = useState({
    pipeline_id: '',
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    group_by: 'day' as 'day' | 'week' | 'month',
  })

  // Busca pipelines para o filtro
  const { data: pipelines } = usePipelines()

  // Prepara os filtros para a API (remove valores vazios)
  const apiFilters = {
    ...(filters.pipeline_id && { pipeline_id: filters.pipeline_id }),
    ...(filters.date_from && { date_from: filters.date_from }),
    ...(filters.date_to && { date_to: filters.date_to }),
  }

  // Busca dados do funil
  const { data: funnelData, isLoading: loadingFunnel } = useQuery({
    queryKey: ['reports-funnel', filters.pipeline_id, filters.date_from, filters.date_to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.pipeline_id) params.append('pipeline_id', filters.pipeline_id)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      const { data } = await api.get(`/reports/funnel?${params}`)
      return data
    },
  })

  // Busca dados de série temporal do funil
  const { data: timeSeriesData, isLoading: loadingTimeSeries } = useFunnelTimeSeries({
    ...apiFilters,
    group_by: filters.group_by,
  })

  // Busca dados de produtividade
  const { data: productivityData, isLoading: loadingProductivity } = useQuery({
    queryKey: ['reports-productivity', filters.date_from, filters.date_to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      const { data } = await api.get(`/reports/productivity?${params}`)
      return data
    },
  })

  // Busca dados de distribuição (canais)
  const { data: distributionData, isLoading: loadingDistribution } = useQuery({
    queryKey: ['reports-distribution', filters.date_from, filters.date_to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      const { data } = await api.get(`/reports/distribution?${params}`)
      return data
    },
  })

  // Formata dados do funil para o gráfico
  const funnelChartData = funnelData?.funnel?.map((stage: any) => ({
    name: stage.stage_name,
    value: stage.leads_count,
    total_value: stage.total_value,
    color: stage.color || COLORS[stage.stage_order % COLORS.length],
  })) || []

  // Formata dados de produtividade para o gráfico
  const productivityChartData = productivityData?.productivity?.map((user: any) => ({
    name: user.user_name?.split(' ')[0] || 'Usuário', // Primeiro nome
    leads: user.leads?.total || 0,
    conversoes: user.leads?.won || 0,
    tickets: user.tickets?.total || 0,
    valor: user.leads?.total_value || 0,
  })) || []

  // Formata dados de distribuição por canal
  const channelChartData = distributionData?.by_channel?.map((channel: any) => ({
    name: channel.channel_name || channel.channel_type || 'Outros',
    value: channel.leads_count || 0,
    color: channelColors[channel.channel_type?.toLowerCase()] || '#6B7280',
  })) || []

  // Formata dados da série temporal para o gráfico de linha
  const timeSeriesChartData = timeSeriesData?.series?.map((item: any) => {
    const row: Record<string, any> = { period: item.period }
    if (item.stages) {
      Object.entries(item.stages).forEach(([stageName, data]: [string, any]) => {
        row[stageName] = data.count
      })
    }
    row.total = item.total
    return row
  }) || []

  const stages = timeSeriesData?.stages || []

  const isLoading = loadingFunnel || loadingProductivity || loadingDistribution

  if (isLoading && !funnelData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const totals = funnelData?.totals || {}

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Análise de performance e métricas em tempo real
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>

              {/* Pipeline */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Pipeline</Label>
                <Select
                  value={filters.pipeline_id || 'all'}
                  onValueChange={(v) => setFilters({ ...filters, pipeline_id: v === 'all' ? '' : v })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Pipelines</SelectItem>
                    {pipelines?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Inicial */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Data Inicial</Label>
                <Input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="w-[160px]"
                />
              </div>

              {/* Data Final */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Data Final</Label>
                <Input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="w-[160px]"
                />
              </div>

              {/* Agrupamento */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Agrupar por</Label>
                <Select
                  value={filters.group_by}
                  onValueChange={(v) => setFilters({ ...filters, group_by: v as 'day' | 'week' | 'month' })}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Dia</SelectItem>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Leads</p>
                  <p className="text-2xl font-bold">{totals.total_leads || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                  <p className="text-2xl font-bold">{totals.conversion_rate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <DollarSign className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totals.total_value || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Leads Ganhos</p>
                  <p className="text-2xl font-bold text-green-400">{totals.won_leads || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Gráfico de Evolução Temporal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Evolução do Funil
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (por {filters.group_by === 'day' ? 'dia' : filters.group_by === 'week' ? 'semana' : 'mês'})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTimeSeries ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : timeSeriesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      if (filters.group_by === 'month') return value
                      const date = new Date(value)
                      return `${date.getDate()}/${date.getMonth() + 1}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label) => {
                      if (filters.group_by === 'month') return `Mês: ${label}`
                      const date = new Date(label)
                      return date.toLocaleDateString('pt-BR')
                    }}
                  />
                  <Legend />
                  {stages.map((stageName: string, index: number) => (
                    <Line
                      key={stageName}
                      type="monotone"
                      dataKey={stageName}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                Funil de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {funnelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any, name: string) => [
                        name === 'value' ? `${value} leads` : formatCurrency(value),
                        name === 'value' ? 'Leads' : 'Valor'
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {funnelChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Channel Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-400" />
                Leads por Canal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {channelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={channelChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {channelChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any) => [`${value} leads`, 'Quantidade']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Productivity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-400" />
                Produtividade por Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productivityChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productivityChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="leads" fill="#3b82f6" name="Leads" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="conversoes" fill="#22c55e" name="Conversões" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tickets" fill="#8b5cf6" name="Tickets" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum vendedor encontrado
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Stats Table */}
      {productivityData?.productivity && productivityData.productivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium">Vendedor</th>
                      <th className="text-center py-3 px-4 font-medium">Leads</th>
                      <th className="text-center py-3 px-4 font-medium">Ganhos</th>
                      <th className="text-center py-3 px-4 font-medium">Perdidos</th>
                      <th className="text-center py-3 px-4 font-medium">Conversão</th>
                      <th className="text-center py-3 px-4 font-medium">Tickets</th>
                      <th className="text-right py-3 px-4 font-medium">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productivityData.productivity.map((user: any, index: number) => (
                      <tr key={user.user_id || index} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{user.user_name}</td>
                        <td className="text-center py-3 px-4">{user.leads?.total || 0}</td>
                        <td className="text-center py-3 px-4 text-green-400">{user.leads?.won || 0}</td>
                        <td className="text-center py-3 px-4 text-red-400">{user.leads?.lost || 0}</td>
                        <td className="text-center py-3 px-4">
                          <span className={user.leads?.conversion_rate > 20 ? 'text-green-400' : 'text-yellow-400'}>
                            {user.leads?.conversion_rate || 0}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">{user.tickets?.total || 0}</td>
                        <td className="text-right py-3 px-4 font-medium text-emerald-400">
                          {formatCurrency(user.leads?.total_value || 0)}
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

export default ReportsPage
