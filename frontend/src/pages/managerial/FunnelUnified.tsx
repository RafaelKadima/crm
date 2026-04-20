import { useMemo, useState } from 'react'
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
} from 'recharts'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Filter,
  Loader2,
  MessageSquare,
  Target,
  TrendingDown,
  Users,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { usePipelines } from '@/hooks/usePipelines'
import {
  useManagerialFunnel,
  type ByCategoryRow,
  type FunnelCategory,
  type ManagerialFilters,
} from '@/hooks/useManagerialFunnel'
import { formatCurrency } from '@/lib/utils'
import { DrillDownDrawer } from './components/DrillDownDrawer'

const today = () => new Date().toISOString().split('T')[0]
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString().split('T')[0]

const CATEGORY_COLORS: Record<FunnelCategory, string> = {
  arrived: '#60A5FA',
  qualified: '#A78BFA',
  scheduled: '#F59E0B',
  meeting_done: '#F97316',
  proposal: '#EC4899',
  negotiation: '#F43F5E',
  won: '#10B981',
  lost: '#EF4444',
  unmapped: '#6B7280',
}

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null
  return ((current - previous) / previous) * 100
}

function DeltaBadge({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null
  const pct = deltaPct(current, previous)
  if (pct === null) return null
  const positive = pct >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        positive ? 'text-emerald-400' : 'text-rose-400'
      }`}
    >
      <Icon className="h-3 w-3" />
      {positive ? '+' : ''}
      {pct.toFixed(1)}%
    </span>
  )
}

export function FunnelUnifiedPage() {
  const { data: pipelines } = usePipelines()

  const [filters, setFilters] = useState<ManagerialFilters>({
    date_from: daysAgo(30),
    date_to: today(),
    pipeline_id: '',
    compare_to_previous: true,
  })

  const [drillCategory, setDrillCategory] = useState<FunnelCategory | null>(null)

  const apiFilters: ManagerialFilters = {
    ...filters,
    pipeline_id: filters.pipeline_id || undefined,
  }

  const { data, isLoading, isFetching } = useManagerialFunnel(apiFilters)

  const byCategoryChart = useMemo(
    () =>
      data?.by_category
        ?.filter((r) => r.category !== 'unmapped')
        .map((r) => ({
          ...r,
          color: CATEGORY_COLORS[r.category],
        })) ?? [],
    [data]
  )

  const prevByCategory = useMemo(() => {
    const map = new Map<FunnelCategory, ByCategoryRow>()
    data?.previous_period?.by_category?.forEach((r) => map.set(r.category, r))
    return map
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const top = data?.top_of_funnel
  const prevTop = data?.previous_period?.top_of_funnel
  const appts = data?.appointments
  const prevAppts = data?.previous_period?.appointments
  const bottom = data?.bottom_of_funnel
  const prevBottom = data?.previous_period?.bottom_of_funnel

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatório Gerencial"
        subtitle="Do primeiro contato ao fechamento — com taxas de conversão e comparação com o período anterior."
      />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Pipeline</Label>
              <Select
                value={filters.pipeline_id || 'all'}
                onValueChange={(v) =>
                  setFilters({ ...filters, pipeline_id: v === 'all' ? '' : v })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os pipelines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os pipelines</SelectItem>
                  {pipelines?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Data inicial</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-[160px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Data final</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-[160px]"
              />
            </div>
            {isFetching && (
              <div className="flex items-center text-muted-foreground text-xs">
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Atualizando…
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topo — 3 camadas */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Topo do funil — quem chegou
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TopCard
            icon={Users}
            label="Contatos únicos novos"
            hint="Cada pessoa física única (1 registro por pessoa)"
            value={top?.contacts_new ?? 0}
            previous={prevTop?.contacts_new}
            color="blue"
          />
          <TopCard
            icon={MessageSquare}
            label="Conversas iniciadas"
            hint="Tickets/conversas abertos no período"
            value={top?.tickets_new ?? 0}
            previous={prevTop?.tickets_new}
            color="violet"
          />
          <TopCard
            icon={Target}
            label="Leads criados"
            hint="Viraram oportunidade no pipeline"
            value={top?.leads_new ?? 0}
            previous={prevTop?.leads_new}
            color="amber"
          />
        </div>
      </section>

      {/* Meio — funil por categoria */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Meio do funil — caminho até a reunião
          </h2>
          <span className="text-xs text-muted-foreground">
            Clique em qualquer etapa para ver os leads
          </span>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
              {/* Gráfico funil */}
              <div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={byCategoryChart} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" stroke="#71717a" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      stroke="#a1a1aa"
                      fontSize={12}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: 8,
                      }}
                      formatter={(value: any) => [`${value} leads`, 'Passaram por aqui']}
                    />
                    <Bar
                      dataKey="leads_passed"
                      radius={[0, 4, 4, 0]}
                      onClick={(row: any) => setDrillCategory(row.category)}
                      style={{ cursor: 'pointer' }}
                    >
                      {byCategoryChart.map((row, i) => (
                        <Cell key={i} fill={row.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Taxas de conversão */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Taxas de conversão
                </h3>
                <div className="space-y-2">
                  {data?.conversion_rates?.map((rate, i) => {
                    const cat = CATEGORY_COLORS[rate.to] || '#6B7280'
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground capitalize">
                            {translate(rate.from)}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium capitalize">{translate(rate.to)}</span>
                        </div>
                        <span
                          className="text-sm font-semibold"
                          style={{ color: cat }}
                        >
                          {rate.rate.toFixed(1)}%
                        </span>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Agendamentos — detalhe importante do meio */}
      {appts && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Agendamentos no período
            </h2>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MiniStat icon={Calendar} label="Total" value={appts.total} previous={prevAppts?.total} tone="neutral" />
                <MiniStat icon={Calendar} label="Agendados" value={appts.scheduled} previous={prevAppts?.scheduled} tone="blue" />
                <MiniStat icon={CheckCircle2} label="Realizados" value={appts.completed} previous={prevAppts?.completed} tone="emerald" />
                <MiniStat icon={XCircle} label="No-show" value={appts.no_show} previous={prevAppts?.no_show} tone="rose" />
                <MiniStat
                  icon={TrendingDown}
                  label="Show-up rate"
                  value={`${appts.show_up_rate}%`}
                  previous={prevAppts?.show_up_rate !== undefined ? `${prevAppts.show_up_rate}%` : undefined}
                  tone="amber"
                />
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Fim — ganhos vs perdas */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Fim do funil — fecharam ou não
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BottomCard
            label="Fecharam (Won)"
            count={bottom?.won_count ?? 0}
            value={bottom?.won_value ?? 0}
            previousCount={prevBottom?.won_count}
            icon={CheckCircle2}
            accent="emerald"
            onDrill={() => setDrillCategory('won')}
          />
          <BottomCard
            label="Perderam"
            count={bottom?.lost_count ?? 0}
            value={bottom?.lost_value ?? 0}
            previousCount={prevBottom?.lost_count}
            icon={XCircle}
            accent="rose"
            onDrill={() => setDrillCategory('lost')}
          />
          <BottomCard
            label="Desqualificados"
            count={bottom?.disqualified_count ?? 0}
            value={bottom?.disqualified_value ?? 0}
            previousCount={prevBottom?.disqualified_count}
            icon={XCircle}
            accent="zinc"
          />
        </div>
      </section>

      <DrillDownDrawer
        category={drillCategory}
        filters={apiFilters}
        onClose={() => setDrillCategory(null)}
      />
    </div>
  )
}

function translate(c: FunnelCategory): string {
  return {
    arrived: 'Chegou',
    qualified: 'Qualificado',
    scheduled: 'Agendou',
    meeting_done: 'Reunião feita',
    proposal: 'Proposta',
    negotiation: 'Negociação',
    won: 'Ganhou',
    lost: 'Perdeu',
    unmapped: 'Não mapeado',
  }[c]
}

const TONE_CLASSES: Record<string, { bg: string; icon: string; border: string }> = {
  blue:    { bg: 'from-blue-500/10 to-blue-600/5',       icon: 'bg-blue-500/20 text-blue-400',       border: 'border-blue-500/20' },
  violet:  { bg: 'from-violet-500/10 to-violet-600/5',   icon: 'bg-violet-500/20 text-violet-400',   border: 'border-violet-500/20' },
  amber:   { bg: 'from-amber-500/10 to-amber-600/5',     icon: 'bg-amber-500/20 text-amber-400',     border: 'border-amber-500/20' },
  emerald: { bg: 'from-emerald-500/10 to-emerald-600/5', icon: 'bg-emerald-500/20 text-emerald-400', border: 'border-emerald-500/20' },
  rose:    { bg: 'from-rose-500/10 to-rose-600/5',       icon: 'bg-rose-500/20 text-rose-400',       border: 'border-rose-500/20' },
  zinc:    { bg: 'from-zinc-500/10 to-zinc-600/5',       icon: 'bg-zinc-500/20 text-zinc-400',       border: 'border-zinc-500/20' },
  neutral: { bg: '',                                     icon: 'bg-muted text-muted-foreground',     border: '' },
}

function TopCard({
  icon: Icon,
  label,
  hint,
  value,
  previous,
  color,
}: {
  icon: any
  label: string
  hint: string
  value: number
  previous: number | undefined
  color: keyof typeof TONE_CLASSES
}) {
  const tone = TONE_CLASSES[color]
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`bg-gradient-to-br ${tone.bg} ${tone.border}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${tone.icon}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <DeltaBadge current={value} previous={previous} />
              </div>
              <p className="text-3xl font-semibold tracking-tight mt-1">{value.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground mt-1">{hint}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  previous,
  tone,
}: {
  icon: any
  label: string
  value: number | string
  previous: number | string | undefined
  tone: keyof typeof TONE_CLASSES
}) {
  const t = TONE_CLASSES[tone]
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${t.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl font-semibold tracking-tight">{value}</p>
        {typeof value === 'number' && typeof previous === 'number' && (
          <DeltaBadge current={value} previous={previous} />
        )}
      </div>
    </div>
  )
}

function BottomCard({
  label,
  count,
  value,
  previousCount,
  icon: Icon,
  accent,
  onDrill,
}: {
  label: string
  count: number
  value: number
  previousCount: number | undefined
  icon: any
  accent: keyof typeof TONE_CLASSES
  onDrill?: () => void
}) {
  const tone = TONE_CLASSES[accent]
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        className={`bg-gradient-to-br ${tone.bg} ${tone.border} ${
          onDrill ? 'cursor-pointer hover:scale-[1.01] transition-transform' : ''
        }`}
        onClick={onDrill}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {label}
                </p>
                <DeltaBadge current={count} previous={previousCount} />
              </div>
              <p className="text-4xl font-semibold tracking-tight mt-2">
                {count.toLocaleString('pt-BR')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{formatCurrency(value)}</p>
            </div>
            <div className={`p-3 rounded-xl ${tone.icon}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
