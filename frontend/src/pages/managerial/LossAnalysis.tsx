import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Loader2, Filter, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useLossAnalysis, type ManagerialFilters } from '@/hooks/useManagerialFunnel'
import { formatCurrency } from '@/lib/utils'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().split('T')[0]

export function LossAnalysisPage() {
  const [filters, setFilters] = useState<ManagerialFilters>({
    date_from: daysAgo(30),
    date_to: today(),
  })

  const { data, isLoading } = useLossAnalysis(filters)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const byReason = data?.by_reason ?? []
  const totalLosses = byReason.reduce((acc: number, r: any) => acc + r.count, 0)
  const totalValue = byReason.reduce((acc: number, r: any) => acc + r.total_value, 0)
  const heatmap = data?.heatmap ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análise de Perdas"
        subtitle="Por que os leads não fecham? Pareto de motivos + heatmap por categoria do funil."
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros:</span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total de leads perdidos
                </p>
                <p className="text-3xl font-semibold tracking-tight">
                  {totalLosses.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20">
          <CardContent className="p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Valor perdido no período
            </p>
            <p className="text-3xl font-semibold tracking-tight mt-1">
              {formatCurrency(totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Top motivo
            </p>
            <p className="text-xl font-semibold tracking-tight mt-1 truncate">
              {byReason[0]?.reason_name ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {byReason[0]?.count ?? 0} perdas · {formatCurrency(byReason[0]?.total_value ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Pareto de motivos
          </h3>
          {byReason.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Nenhum lead perdido no período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={byReason} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" stroke="#71717a" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="reason_name"
                  stroke="#a1a1aa"
                  fontSize={12}
                  width={200}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: 8,
                  }}
                  formatter={(value: any, key: string) => {
                    if (key === 'count') return [`${value} perdas`, 'Contagem']
                    return [formatCurrency(value), 'Valor']
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byReason.map((r: any, i: number) => (
                    <Cell key={i} fill={r.reason_color ?? '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Onde os leads morrem (motivo × etapa do funil)
          </h3>
          {heatmap.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Sem dados suficientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="py-2 text-left">Motivo</th>
                    <th className="py-2 text-left">Etapa onde morreu</th>
                    <th className="py-2 text-right">Contagem</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2">{row.reason_name}</td>
                      <td className="py-2 capitalize text-muted-foreground">
                        {row.funnel_category}
                      </td>
                      <td className="py-2 text-right font-semibold">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
