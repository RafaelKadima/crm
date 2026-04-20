import { useState } from 'react'
import { Loader2, Filter, TrendingUp, DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { usePipelines } from '@/hooks/usePipelines'
import { useForecast, type ManagerialFilters } from '@/hooks/useManagerialFunnel'
import { formatCurrency } from '@/lib/utils'

export function ForecastPage() {
  const { data: pipelines } = usePipelines()
  const [filters, setFilters] = useState<ManagerialFilters>({})

  const { data, isLoading } = useForecast(filters)
  const f = data?.forecast

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
        title="Forecast Ponderado"
        subtitle="Valor esperado = Σ(valor × probabilidade do estágio) — quanto vai fechar se nada mudar."
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <Label className="text-xs">Pipeline</Label>
            <Select
              value={filters.pipeline_id || 'all'}
              onValueChange={(v) =>
                setFilters({ ...filters, pipeline_id: v === 'all' ? undefined : v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {pipelines?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Valor esperado (ponderado)
                </p>
                <p className="text-3xl font-semibold tracking-tight">
                  {formatCurrency(f?.total_weighted_value ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-muted text-muted-foreground">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Valor bruto em aberto
                </p>
                <p className="text-3xl font-semibold tracking-tight">
                  {formatCurrency(f?.total_raw_value ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Leads abertos
            </p>
            <p className="text-3xl font-semibold tracking-tight mt-1">
              {(f?.total_open_leads ?? 0).toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-3">Estágio</th>
                <th className="px-6 py-3 text-right">Leads abertos</th>
                <th className="px-6 py-3 text-right">Probabilidade</th>
                <th className="px-6 py-3 text-right">Valor bruto</th>
                <th className="px-6 py-3 text-right">Valor ponderado</th>
              </tr>
            </thead>
            <tbody>
              {f?.by_stage?.map((row: any) => (
                <tr key={row.stage_id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-6 py-3 font-medium">{row.stage_name}</td>
                  <td className="px-6 py-3 text-right">{row.leads_count}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground">
                    {row.probability}%
                  </td>
                  <td className="px-6 py-3 text-right">{formatCurrency(row.total_value)}</td>
                  <td className="px-6 py-3 text-right text-emerald-400 font-semibold">
                    {formatCurrency(row.weighted_value)}
                  </td>
                </tr>
              ))}
              {(!f?.by_stage || f.by_stage.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum lead aberto para prever fechamento.
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
