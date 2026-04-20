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
import { Loader2, Filter, Timer } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useVelocity, type ManagerialFilters } from '@/hooks/useManagerialFunnel'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().split('T')[0]

export function VelocityPage() {
  const [filters, setFilters] = useState<ManagerialFilters>({
    date_from: daysAgo(90),
    date_to: today(),
  })

  const { data, isLoading } = useVelocity(filters)

  const rows = (data?.velocity ?? []).filter((r: any) => r.category !== 'unmapped')
  const maxDays = Math.max(...rows.map((r: any) => r.avg_days), 1)
  const bottleneck = rows.reduce(
    (max: any, r: any) => (r.avg_days > (max?.avg_days ?? 0) ? r : max),
    null
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Velocity do Funil"
        subtitle="Quanto tempo leads passam em cada etapa. Onde o funil emperra."
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

      {bottleneck && (
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
              <Timer className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Gargalo identificado
              </p>
              <p className="text-2xl font-semibold tracking-tight">
                {bottleneck.label} — {bottleneck.avg_days} dias em média
              </p>
              <p className="text-xs text-muted-foreground">
                Baseado em {bottleneck.samples} amostras
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Tempo médio por etapa (dias)
          </h3>
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="label" stroke="#a1a1aa" fontSize={12} />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                }}
                formatter={(value: any) => [`${value} dias`, 'Tempo médio']}
              />
              <Bar dataKey="avg_days" radius={[4, 4, 0, 0]}>
                {rows.map((r: any, i: number) => (
                  <Cell
                    key={i}
                    fill={r.avg_days === maxDays ? '#F59E0B' : '#8B5CF6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
