import { useState } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts'
import { Loader2, Filter } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useCohort, type ManagerialFilters } from '@/hooks/useManagerialFunnel'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().split('T')[0]

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  facebook: '#1877F2',
  email: '#EA4335',
  telefone: '#6366F1',
  outros: '#6B7280',
}

export function ChannelCohortPage() {
  const [filters, setFilters] = useState<ManagerialFilters>({
    date_from: daysAgo(180),
    date_to: today(),
  })

  const { data, isLoading } = useCohort(filters)
  const cohorts = data?.cohorts ?? []

  // Agrupa por canal para construir scatter (volume × conversão)
  const byChannel: Record<string, { channel_name: string; channel_type: string; totalLeads: number; won: number; conversion: number }> = {}
  cohorts.forEach((c: any) => {
    if (!byChannel[c.channel_id ?? 'none']) {
      byChannel[c.channel_id ?? 'none'] = {
        channel_name: c.channel_name,
        channel_type: c.channel_type,
        totalLeads: 0,
        won: 0,
        conversion: 0,
      }
    }
    byChannel[c.channel_id ?? 'none'].totalLeads += c.total_leads
    byChannel[c.channel_id ?? 'none'].won += c.won_leads
  })
  const scatterData = Object.values(byChannel).map((v) => ({
    ...v,
    conversion: v.totalLeads > 0 ? Math.round((v.won / v.totalLeads) * 100) : 0,
    fill: CHANNEL_COLORS[v.channel_type] ?? '#6B7280',
  }))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Agrupa coortes por mês para tabela
  const byMonth: Record<string, any[]> = {}
  cohorts.forEach((c: any) => {
    if (!byMonth[c.cohort_month]) byMonth[c.cohort_month] = []
    byMonth[c.cohort_month].push(c)
  })
  const months = Object.keys(byMonth).sort().reverse()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coorte por Canal"
        subtitle="Qualidade de lead por canal ao longo do tempo. Volume × conversão."
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Período:</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Até</Label>
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-[160px]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Volume vs Qualidade — canais
          </h3>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                type="number"
                dataKey="totalLeads"
                name="Volume"
                stroke="#71717a"
                fontSize={12}
                label={{ value: 'Volume (leads)', position: 'bottom', fill: '#71717a', fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="conversion"
                name="Conversão (%)"
                stroke="#71717a"
                fontSize={12}
                unit="%"
              />
              <ZAxis type="number" range={[120, 120]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                }}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any, name: string) => [value, name]}
                labelFormatter={() => ''}
                content={({ payload }) =>
                  payload && payload.length > 0 ? (
                    <div className="bg-background border border-border rounded-lg p-3 text-xs">
                      <p className="font-semibold">{payload[0].payload.channel_name}</p>
                      <p className="text-muted-foreground">
                        {payload[0].payload.totalLeads} leads · {payload[0].payload.conversion}% conversão
                      </p>
                    </div>
                  ) : null
                }
              />
              <Scatter data={scatterData} fill="#8884d8">
                {scatterData.map((entry, index) => (
                  <circle
                    key={index}
                    fill={entry.fill}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-3">Coorte (mês)</th>
                <th className="px-6 py-3">Canal</th>
                <th className="px-6 py-3 text-right">Leads</th>
                <th className="px-6 py-3 text-right">Ganhos</th>
                <th className="px-6 py-3 text-right">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {months.map((month) =>
                byMonth[month].map((c: any, i: number) => (
                  <tr
                    key={`${month}-${i}`}
                    className="border-b border-border/50 hover:bg-muted/30"
                  >
                    <td className="px-6 py-3 font-medium">{month}</td>
                    <td className="px-6 py-3 text-muted-foreground">{c.channel_name}</td>
                    <td className="px-6 py-3 text-right">{c.total_leads}</td>
                    <td className="px-6 py-3 text-right">{c.won_leads}</td>
                    <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                      {c.conversion_rate}%
                    </td>
                  </tr>
                ))
              )}
              {months.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Sem leads no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
