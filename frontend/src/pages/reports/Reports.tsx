import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Card, CardContent } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Loader2, Users, Filter, Bot, ArrowRight, Sparkles } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import api from '@/api/axios'
import { Link } from 'react-router-dom'

const channelColors: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  facebook: '#1877F2',
  email: '#EA4335',
  telefone: '#8AA4FF',
  outros: '#97928B',
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
      color: channelColors[channel.channel_type?.toLowerCase()] || '#97928B',
    })) || []

  const isLoading = loadingProductivity || loadingDistribution || loadingIa

  if (isLoading && !productivityData) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-bold-ink)' }} />
      </div>
    )
  }

  const ia = iaData?.ia_performance

  const tooltipStyle = {
    backgroundColor: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    fontSize: '12px',
    color: 'var(--color-foreground)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="eyebrow">COMERCIAL · RELATÓRIOS</p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
          {t('reports.title')}
        </h1>
        <p className="mt-2 max-w-[620px] text-[13.5px] leading-[1.5] text-muted-foreground">
          Produtividade por vendedor, distribuição de canais e performance do agente IA. Para
          análise de funil completo (conversão, velocity, forecast), use o Relatório Gerencial.
        </p>
      </motion.div>

      {/* Managerial link — editorial bold block */}
      <Link
        to="/managerial/funnel"
        className="group relative block overflow-hidden rounded-[14px] border bold-glow"
        style={{ background: 'var(--color-bold)', borderColor: 'transparent' }}
      >
        <div className="relative z-10 flex items-center gap-4 p-5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: 'var(--color-bold-ink)', color: '#0A0A0C' }}
          >
            <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="flex-1">
            <p
              className="text-[10.5px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-bold-ink)' }}
            >
              RELATÓRIO GERENCIAL
            </p>
            <h3 className="mt-1 font-display text-[22px] leading-[1.1] tracking-[-0.015em]" style={{ color: '#F4F3EF' }}>
              Procurando análise de funil?
            </h3>
            <p className="mt-1 text-[12.5px]" style={{ color: 'rgba(244,243,239,0.55)' }}>
              Topo/meio/fim, conversão, velocity e forecast vivem no Relatório Gerencial agora.
            </p>
          </div>
          <ArrowRight
            className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
            style={{ color: 'var(--color-bold-ink)' }}
          />
        </div>
      </Link>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]">Período</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">
                {t('reports.startDate')}
              </Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-[160px] rounded-[8px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">
                {t('reports.endDate')}
              </Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-[160px] rounded-[8px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top grid: channels + AI */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="h-full">
            <div
              className="flex items-center justify-between border-b px-6 py-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <p className="eyebrow">DISTRIBUIÇÃO</p>
                <h3 className="mt-1 font-display text-[20px] leading-[1.15] tracking-[-0.015em]">
                  {t('reports.leadsByChannel')}
                </h3>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardContent className="p-4">
              {channelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={channelChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }: any) =>
                        `${name} ${((percent || 0) * 100).toFixed(0)}%`
                      }
                    >
                      {channelChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-card)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => [`${value} leads`, t('reports.quantity')]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-[13px] text-muted-foreground">
                  {t('reports.noDataAvailable')}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Performance — charcoal + neon */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div
            className="relative h-full overflow-hidden rounded-[14px] border bold-glow"
            style={{ background: 'var(--color-bold)', borderColor: 'transparent', color: '#F4F3EF' }}
          >
            <div
              className="relative z-10 flex items-center justify-between border-b px-6 py-4"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div>
                <p
                  className="text-[10.5px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--color-bold-ink)' }}
                >
                  AGENTE SDR · IA
                </p>
                <h3
                  className="mt-1 font-display text-[20px] leading-[1.15] tracking-[-0.015em]"
                  style={{ color: '#F4F3EF' }}
                >
                  Performance autônoma
                </h3>
              </div>
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'var(--color-bold-ink)', color: '#0A0A0C' }}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
              </div>
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-5 p-6">
              {[
                { l: 'Leads criados',  v: ia?.total_ia_leads ?? 0 },
                { l: 'Ganhos IA',      v: ia?.won_ia_leads ?? 0, accent: true },
                { l: 'Conversão IA',   v: `${ia?.conversion_rate ?? 0}%` },
                { l: 'Últ. interação', v: ia?.last_ia_interaction_leads ?? 0 },
              ].map((kpi) => (
                <div key={kpi.l}>
                  <p
                    className="text-[10.5px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: 'rgba(244,243,239,0.5)' }}
                  >
                    {kpi.l}
                  </p>
                  <p
                    className="mt-1.5 font-display text-[36px] leading-none tracking-[-0.02em]"
                    style={{ color: kpi.accent ? 'var(--color-bold-ink)' : '#F4F3EF' }}
                  >
                    {typeof kpi.v === 'number' ? kpi.v.toLocaleString('pt-BR') : kpi.v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Productivity chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <div
            className="flex items-center justify-between border-b px-6 py-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div>
              <p className="eyebrow">TIME COMERCIAL</p>
              <h3 className="mt-1 font-display text-[20px] leading-[1.15] tracking-[-0.015em]">
                {t('reports.productivityBySeller')}
              </h3>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardContent className="p-4">
            {productivityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productivityChartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border)' }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border)' }}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,255,0,0.05)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-muted-foreground)' }} />
                  <Bar dataKey="leads" fill="var(--color-foreground)" name="Leads" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="conversoes"
                    fill="var(--color-bold-ink)"
                    name={t('reports.conversions')}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="tickets"
                    fill="var(--color-muted-foreground)"
                    name="Tickets"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-[13px] text-muted-foreground">
                {t('reports.noSellerFound')}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail by seller */}
      {productivityData?.productivity && productivityData.productivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div
              className="border-b px-6 py-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="eyebrow">RANKING · INDIVIDUAL</p>
              <h3 className="mt-1 font-display text-[20px] leading-[1.15] tracking-[-0.015em]">
                {t('reports.detailBySeller')}
              </h3>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr
                      className="border-b"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-secondary)' }}
                    >
                      <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {t('reports.seller')}
                      </th>
                      <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Leads
                      </th>
                      <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {t('reports.won')}
                      </th>
                      <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {t('reports.lost')}
                      </th>
                      <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {t('reports.conversion')}
                      </th>
                      <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Tickets
                      </th>
                      <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {t('reports.totalValue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productivityData.productivity.map((user: any, index: number) => (
                      <tr
                        key={user.user_id || index}
                        className="border-b transition-colors hover:bg-muted"
                        style={{ borderColor: 'var(--color-border)' }}
                      >
                        <td className="px-6 py-3.5 font-medium">{user.user_name}</td>
                        <td className="px-4 py-3.5 text-center">{user.leads?.total || 0}</td>
                        <td className="px-4 py-3.5 text-center font-semibold" style={{ color: 'var(--color-success)' }}>
                          {user.leads?.won || 0}
                        </td>
                        <td className="px-4 py-3.5 text-center" style={{ color: 'var(--color-destructive)' }}>
                          {user.leads?.lost || 0}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className="font-semibold"
                            style={{
                              color:
                                user.leads?.conversion_rate > 20
                                  ? 'var(--color-success)'
                                  : 'var(--color-warning)',
                            }}
                          >
                            {user.leads?.conversion_rate || 0}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">{user.tickets?.total || 0}</td>
                        <td className="px-6 py-3.5 text-right font-display text-[15px] tracking-[-0.015em]">
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
