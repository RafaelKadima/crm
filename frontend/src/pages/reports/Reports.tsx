import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
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
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Loader2, Users, Filter, Bot, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import api from '@/api/axios'
import { Link } from 'react-router-dom'

const channelColors: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  facebook: '#1877F2',
  email: '#EA4335',
  telefone: '#6366f1',
  outros: '#6B7280',
}

export function ReportsPage() {
  const { t } = useTranslation()

  const [filters, setFilters] = useState({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
  })

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

  const { data: iaData, isLoading: loadingIa } = useQuery({
    queryKey: ['reports-ia', filters.date_from, filters.date_to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      const { data } = await api.get(`/reports/ia?${params}`)
      return data
    },
  })

  const productivityChartData =
    productivityData?.productivity?.map((user: any) => ({
      name: user.user_name?.split(' ')[0] || 'Usuário',
      leads: user.leads?.total || 0,
      conversoes: user.leads?.won || 0,
      tickets: user.tickets?.total || 0,
    })) || []

  const channelChartData =
    distributionData?.by_channel?.map((channel: any) => ({
      name: channel.channel_name || channel.channel_type || 'Outros',
      value: channel.leads_count || 0,
      color: channelColors[channel.channel_type?.toLowerCase()] || '#6B7280',
    })) || []

  const isLoading = loadingProductivity || loadingDistribution || loadingIa

  if (isLoading && !productivityData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const ia = iaData?.ia_performance

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        subtitle="Produtividade por vendedor, distribuição de canais e performance do agente IA. Para análise de funil (conversão, velocity, forecast), use o Relatório Gerencial."
      />

      {/* Link para o Relatório Gerencial */}
      <Link
        to="/managerial/funnel"
        className="group block rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent p-4 hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Procurando análise de funil?</p>
            <p className="text-xs text-muted-foreground">
              Topo/meio/fim, taxas de conversão, velocity e forecast agora vivem no{' '}
              <span className="text-primary font-medium">Relatório Gerencial</span>.
            </p>
          </div>
        </div>
      </Link>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Período:</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t('reports.startDate')}</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-[160px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t('reports.endDate')}</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-[160px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Canal */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                {t('reports.leadsByChannel')}
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
                      label={({ name, percent }: any) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
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
                      formatter={(value: any) => [`${value} leads`, t('reports.quantity')]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  {t('reports.noDataAvailable')}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance IA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-violet-500/5 to-transparent border-violet-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-400" />
                Agente SDR (IA)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Leads criados pela IA
                  </p>
                  <p className="text-2xl font-semibold tracking-tight mt-1">
                    {(ia?.total_ia_leads ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ganhos pela IA
                  </p>
                  <p className="text-2xl font-semibold tracking-tight text-emerald-400 mt-1">
                    {(ia?.won_ia_leads ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Taxa de conversão IA
                  </p>
                  <p className="text-2xl font-semibold tracking-tight mt-1">
                    {ia?.conversion_rate ?? 0}%
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Última interação IA
                  </p>
                  <p className="text-2xl font-semibold tracking-tight mt-1">
                    {(ia?.last_ia_interaction_leads ?? 0).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Productivity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-400" />
                {t('reports.productivityBySeller')}
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
                    <Bar
                      dataKey="conversoes"
                      fill="#22c55e"
                      name={t('reports.conversions')}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar dataKey="tickets" fill="#8b5cf6" name="Tickets" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  {t('reports.noSellerFound')}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detalhe por vendedor */}
      {productivityData?.productivity && productivityData.productivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.detailBySeller')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium">{t('reports.seller')}</th>
                      <th className="text-center py-3 px-4 font-medium">Leads</th>
                      <th className="text-center py-3 px-4 font-medium">{t('reports.won')}</th>
                      <th className="text-center py-3 px-4 font-medium">{t('reports.lost')}</th>
                      <th className="text-center py-3 px-4 font-medium">
                        {t('reports.conversion')}
                      </th>
                      <th className="text-center py-3 px-4 font-medium">Tickets</th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t('reports.totalValue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productivityData.productivity.map((user: any, index: number) => (
                      <tr
                        key={user.user_id || index}
                        className="border-b border-border/50 hover:bg-muted/50"
                      >
                        <td className="py-3 px-4 font-medium">{user.user_name}</td>
                        <td className="text-center py-3 px-4">{user.leads?.total || 0}</td>
                        <td className="text-center py-3 px-4 text-green-400">
                          {user.leads?.won || 0}
                        </td>
                        <td className="text-center py-3 px-4 text-red-400">
                          {user.leads?.lost || 0}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={
                              user.leads?.conversion_rate > 20
                                ? 'text-green-400'
                                : 'text-yellow-400'
                            }
                          >
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
