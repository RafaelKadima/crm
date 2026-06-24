import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  Loader2,
  Filter,
  Clock,
  Timer,
  RotateCcw,
  Inbox,
  Users,
  Headphones,
  Hourglass,
} from 'lucide-react'
import api from '@/api/axios'

const statusColors: Record<string, string> = {
  open: '#3b82f6',
  pending: '#f59e0b',
  waiting_customer: '#8b5cf6',
  closed: '#22c55e',
}

const channelColors: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  facebook: '#1877F2',
  webchat: '#8AA4FF',
  other: '#97928B',
}

/** Formata minutos em string legível (—, <1 min, 45 min, 2h 15min, 1d 3h). */
function formatMinutes(min?: number | null): string {
  if (min === null || min === undefined) return '—'
  if (min < 1) return '<1 min'
  if (min < 60) return `${Math.round(min)} min`
  const totalH = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (totalH < 24) return m ? `${totalH}h ${m}min` : `${totalH}h`
  const d = Math.floor(totalH / 24)
  const h = totalH % 24
  return h ? `${d}d ${h}h` : `${d}d`
}

export function AtendimentoReportPage() {
  const { t } = useTranslation()

  const [filters, setFilters] = useState({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    group_by: 'day' as 'day' | 'week' | 'month',
  })

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['atendimento-summary', filters.date_from, filters.date_to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      const { data } = await api.get(`/reports/atendimento/summary?${params}`)
      return data
    },
  })

  const { data: timeSeries, isLoading: loadingSeries } = useQuery({
    queryKey: ['atendimento-time-series', filters.date_from, filters.date_to, filters.group_by],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      params.append('group_by', filters.group_by)
      const { data } = await api.get(`/reports/atendimento/time-series?${params}`)
      return data
    },
  })

  const tooltipStyle = {
    backgroundColor: 'var(--color-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    fontSize: '12px',
    color: 'var(--color-foreground)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  }

  if (loadingSummary && !summary) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-bold-ink)' }} />
      </div>
    )
  }

  const totals = summary?.totals ?? {}
  const sla = summary?.sla ?? {}
  const reopen = summary?.reopen ?? {}

  const statusChartData =
    summary?.by_status?.map((s: any) => ({
      name: s.label,
      value: s.count,
      color: statusColors[s.status] || '#97928B',
    })) || []

  const channelChartData =
    summary?.by_channel?.map((c: any) => ({
      name: c.name,
      total: c.total,
      closed: c.closed,
      color: channelColors[c.type?.toLowerCase()] || '#97928B',
    })) || []

  const seriesData =
    timeSeries?.series?.map((row: any) => ({
      period: row.period,
      tickets: row.tickets,
      inbound: row.messages_inbound,
      outbound: row.messages_outbound,
    })) || []

  const kpis = [
    {
      icon: Headphones,
      label: t('reports.atendimento.totalTickets'),
      value: (totals.total ?? 0).toLocaleString('pt-BR'),
      sub: `${totals.closed ?? 0} ${t('reports.atendimento.closedLower')} · ${totals.closed_rate ?? 0}%`,
    },
    {
      icon: Timer,
      label: t('reports.atendimento.firstResponse'),
      value: formatMinutes(sla.first_response?.avg_minutes),
      sub: `${t('reports.atendimento.median')} ${formatMinutes(sla.first_response?.median_minutes)} · n=${sla.first_response?.sample ?? 0}`,
    },
    {
      icon: Clock,
      label: t('reports.atendimento.resolution'),
      value: formatMinutes(sla.resolution?.avg_minutes),
      sub: `${t('reports.atendimento.median')} ${formatMinutes(sla.resolution?.median_minutes)} · n=${sla.resolution?.sample ?? 0}`,
    },
    {
      icon: Hourglass,
      label: t('reports.atendimento.queueWait'),
      value: formatMinutes(sla.queue_wait?.avg_minutes),
      sub: `${sla.queue_wait?.in_queue_now ?? 0} ${t('reports.atendimento.inQueueNow')}`,
    },
    {
      icon: RotateCcw,
      label: t('reports.atendimento.reopenRate'),
      value: `${reopen.rate ?? 0}%`,
      sub: `${reopen.reopened ?? 0} / ${reopen.total ?? 0}`,
    },
    {
      icon: Inbox,
      label: t('reports.atendimento.waitingCustomer'),
      value: (totals.waiting_customer ?? 0).toLocaleString('pt-BR'),
      sub: `${totals.open ?? 0} ${t('reports.atendimento.openLower')} · ${totals.pending ?? 0} ${t('reports.atendimento.pendingLower')}`,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="eyebrow">ATENDIMENTO · SLA & SUPORTE</p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
          {t('reports.atendimento.title')}
        </h1>
        <p className="mt-2 max-w-[620px] text-[13.5px] leading-[1.5] text-muted-foreground">
          {t('reports.atendimento.subtitle')}
        </p>
      </motion.div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{t('reports.period')}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">{t('reports.startDate')}</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-[160px] rounded-[8px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">{t('reports.endDate')}</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-[160px] rounded-[8px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">{t('reports.groupBy')}</Label>
              <div className="flex overflow-hidden rounded-[8px] border" style={{ borderColor: 'var(--color-border)' }}>
                {(['day', 'week', 'month'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilters({ ...filters, group_by: g })}
                    className="px-3 py-2 text-[12px] font-medium transition-colors"
                    style={
                      filters.group_by === g
                        ? { background: 'var(--color-bold)', color: 'var(--color-bold-ink)' }
                        : { color: 'var(--color-muted-foreground)' }
                    }
                  >
                    {t(`reports.${g}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{kpi.label}</p>
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 font-display text-[28px] leading-none tracking-[-0.02em]">{kpi.value}</p>
                <p className="mt-2 text-[11.5px] text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Status + Channel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="h-full">
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="eyebrow">DISTRIBUIÇÃO</p>
                <h3 className="mt-1 font-display text-[20px] leading-[1.15] tracking-[-0.015em]">
                  {t('reports.atendimento.byStatus')}
                </h3>
              </div>
              <Headphones className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardContent className="p-4">
              {statusChartData.some((s: any) => s.value > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusChartData.filter((s: any) => s.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {statusChartData
                        .filter((s: any) => s.value > 0)
                        .map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-card)" strokeWidth={2} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => [`${value}`, 'Tickets']} />
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

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="h-full">
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <p className="eyebrow">CANAIS</p>
                <h3 className="mt-1 font-display text-[20px] leading-[1.15] tracking-[-0.015em]">
                  {t('reports.atendimento.byChannel')}
                </h3>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardContent className="p-4">
              {channelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={channelChartData} layout="vertical" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
                    <YAxis dataKey="name" type="category" width={110} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(220,255,0,0.05)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-muted-foreground)' }} />
                    <Bar dataKey="total" name={t('reports.atendimento.total')} fill="var(--color-foreground)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="closed" name={t('reports.atendimento.closedLabel')} fill="var(--color-bold-ink)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-[13px] text-muted-foreground">
                  {t('reports.noDataAvailable')}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Volume over time */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <Card>
          <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <p className="eyebrow">VOLUME</p>
              <h3 className="mt-1 font-display text-[20px] leading-[1.15] tracking-[-0.015em]">
                {t('reports.atendimento.volume')}
              </h3>
            </div>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardContent className="p-4">
            {loadingSeries ? (
              <div className="flex h-[300px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-bold-ink)' }} />
              </div>
            ) : seriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={seriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickFormatter={(value) => {
                      if (filters.group_by === 'month') return value
                      const d = new Date(value)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-muted-foreground)' }} />
                  <Line type="monotone" dataKey="tickets" name={t('reports.atendimento.conversations')} stroke="var(--color-bold-ink)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="inbound" name={t('reports.atendimento.inbound')} stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="outbound" name={t('reports.atendimento.outbound')} stroke="#22c55e" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-[13px] text-muted-foreground">
                {t('reports.noDataAvailable')}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* By agent */}
      {summary?.by_agent && summary.by_agent.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <Card>
            <div className="border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
              <p className="eyebrow">RANKING · INDIVIDUAL</p>
              <h3 className="mt-1 font-display text-[20px] leading-[1.15] tracking-[-0.015em]">
                {t('reports.atendimento.byAgent')}
              </h3>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-secondary)' }}>
                      <th className="px-6 py-3 text-left text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('reports.atendimento.agent')}</th>
                      <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('reports.atendimento.total')}</th>
                      <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('reports.atendimento.closedLabel')}</th>
                      <th className="px-4 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('reports.atendimento.openLabel')}</th>
                      <th className="px-6 py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('reports.atendimento.avgResolution')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.by_agent.map((agent: any, index: number) => (
                      <tr key={agent.user_id || index} className="border-b transition-colors hover:bg-muted" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-6 py-3.5 font-medium">{agent.name}</td>
                        <td className="px-4 py-3.5 text-center">{agent.total}</td>
                        <td className="px-4 py-3.5 text-center font-semibold" style={{ color: 'var(--color-success)' }}>{agent.closed}</td>
                        <td className="px-4 py-3.5 text-center">{agent.open}</td>
                        <td className="px-6 py-3.5 text-right font-display text-[15px] tracking-[-0.015em]">{formatMinutes(agent.avg_resolution_minutes)}</td>
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

export default AtendimentoReportPage
