import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Users,
  CheckCircle,
  Kanban,
  Clock,
  UserPlus,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { useDashboardStats, useRecentLeads, useRecentTasks } from '@/hooks/useDashboard'
import { usePipelines, type Pipeline } from '@/hooks/usePipelines'
import { useAuthStore } from '@/store/authStore'
import { formatDateTime } from '@/lib/utils'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.21, 0.87, 0.35, 1] as const } },
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recentLeads, isLoading: leadsLoading } = useRecentLeads()
  const { data: recentTasks, isLoading: tasksLoading } = useRecentTasks()
  const { data: pipelines } = usePipelines()

  if (statsLoading) return <DashboardSkeleton />

  const firstName = (user?.name || '').split(' ')[0] || ''
  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12
      ? t('dashboard.greetingMorning', { defaultValue: 'Bom dia' })
      : currentHour < 18
        ? t('dashboard.greetingAfternoon', { defaultValue: 'Boa tarde' })
        : t('dashboard.greetingEvening', { defaultValue: 'Boa noite' })

  const statCards = [
    {
      title: t('dashboard.totalLeads', { defaultValue: 'Leads ativos' }),
      value: stats?.total_leads ?? 0,
      delta: '+12,5%',
      trendUp: true,
    },
    {
      title: t('dashboard.conversionRate', { defaultValue: 'Taxa de conversão' }),
      value: `${(stats?.conversion_rate ?? 0).toFixed(1)}%`,
      delta: '+2,1 p.p.',
      trendUp: true,
    },
    {
      title: t('dashboard.openTickets', { defaultValue: 'Tickets em aberto' }),
      value: stats?.total_tickets ?? 0,
      delta: '−3,1%',
      trendUp: false,
    },
    {
      title: t('dashboard.pendingTasks', { defaultValue: 'Tarefas pendentes' }),
      value: stats?.total_tasks ?? 0,
      delta: '+22,4%',
      trendUp: true,
    },
  ]

  const activityItems = buildActivityTimeline(recentLeads || [], recentTasks || [])

  return (
    <div className="space-y-8">
      {/* ═══════════ HERO BAND ═══════════ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[16px] border px-6 py-8 md:px-10 md:py-10"
        style={{
          background: 'var(--color-warm)',
          borderColor: 'var(--color-warm-border)',
          color: 'var(--color-warm-ink)',
        }}
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <p className="eyebrow" style={{ color: 'var(--color-warm-muted)' }}>
              {t('dashboard.title', { defaultValue: 'DASHBOARD' }).toUpperCase()} · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <h1
              className="mt-3 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[52px]"
              style={{ color: 'var(--color-warm-ink)' }}
            >
              {greeting}
              {firstName ? (
                <>
                  , <span className="display-italic">{firstName}</span>.
                </>
              ) : (
                '.'
              )}
            </h1>
            <p className="mt-3 max-w-[460px] text-[14.5px] leading-[1.55]" style={{ color: 'var(--color-warm-muted)' }}>
              {t('dashboard.overview', {
                defaultValue: 'Aqui está o panorama do seu comercial agora. Ações priorizadas pelo SDR autônomo logo abaixo.',
              })}
            </p>
          </div>

          <div className="md:justify-self-end md:text-right">
            <p className="eyebrow" style={{ color: 'var(--color-warm-muted)' }}>
              GANHOS NO PERÍODO
            </p>
            <div
              className="mt-2 font-display leading-none tracking-[-0.025em]"
              style={{
                fontSize: 'clamp(3.25rem, 7vw, 5rem)',
                color: 'var(--color-warm-ink)',
              }}
            >
              {stats?.leads_won ?? 0}
            </div>
            <div className="mt-2 flex items-center gap-2 md:justify-end">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: '#DCFCE7', color: '#166534' }}
              >
                +{(stats?.conversion_rate ?? 0).toFixed(1)}%
              </span>
              <span className="text-[12px]" style={{ color: 'var(--color-warm-muted)' }}>
                {t('dashboard.vsLastPeriod', { defaultValue: 'vs. período anterior' })}
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══════════ KPI CARDS ═══════════ */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {statCards.map((s) => (
          <motion.div key={s.title} variants={item}>
            <Card className="group relative overflow-hidden transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">{s.title}</p>
                  <span
                    className={
                      'inline-flex items-center gap-1 text-[11.5px] font-semibold ' +
                      (s.trendUp ? 'text-success' : 'text-destructive')
                    }
                  >
                    {s.trendUp ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowUpRight className="h-3 w-3 rotate-90" />
                    )}
                    {s.delta}
                  </span>
                </div>
                <div className="mt-4 font-display text-[44px] leading-none tracking-[-0.02em]">
                  {s.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══════════ AI RECOMMEND (bold) + PIPELINE ═══════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* AI recommend — charcoal + neon */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-[16px] bold-glow"
          style={{ background: 'var(--color-bold)', color: '#F4F3EF' }}
        >
          <div className="relative z-10 p-6 md:p-7">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: 'var(--color-bold-ink)', color: '#0A0A0C' }}
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
              </div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: 'var(--color-bold-ink)' }}
              >
                SDR IA · recomenda
              </p>
            </div>
            <h3 className="mt-3 font-display text-[26px] leading-[1.1] tracking-[-0.015em]" style={{ color: '#F4F3EF' }}>
              3 ações prioritárias para o seu dia
            </h3>
            <p className="mt-1.5 text-[13px]" style={{ color: 'rgba(244,243,239,0.6)' }}>
              Ordenadas pelo impacto no pipeline.
            </p>

            <ul className="mt-5 space-y-3">
              {[
                {
                  n: '01',
                  title: 'Retomar 7 demos que não voltaram em 3d',
                  sub: 'R$ 184K em jogo · envio sugerido pelo agente',
                },
                {
                  n: '02',
                  title: 'Aprovar proposta Acme Corp (R$ 48K)',
                  sub: 'Contato respondeu há 2h · aguarda só sua revisão',
                },
                {
                  n: '03',
                  title: 'Reengajar 12 leads frios do canal Meta',
                  sub: 'Score IA > 70 · nutrição automática pronta',
                },
              ].map((a) => (
                <li
                  key={a.n}
                  className="group flex items-start gap-4 rounded-[10px] p-3 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                >
                  <span
                    className="mono text-[11px] font-medium leading-none pt-1"
                    style={{ color: 'var(--color-bold-ink)' }}
                  >
                    {a.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium" style={{ color: '#F4F3EF' }}>
                      {a.title}
                    </p>
                    <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(244,243,239,0.55)' }}>
                      {a.sub}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
                    style={{ color: 'var(--color-bold-ink)' }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Pipeline overview */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-semibold">
                <Kanban className="h-4 w-4 text-muted-foreground" />
                {t('dashboard.pipeline', { defaultValue: 'Pipeline' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pipelines && (pipelines as Pipeline[]).length > 0 ? (
                <div className="space-y-5">
                  {(pipelines as Pipeline[]).slice(0, 3).map((p) => (
                    <PipelineWidget key={p.id} pipeline={p} t={t} />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-[13px] text-muted-foreground">
                  {t('empty.pipelines')}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════ RECENT LEADS + ACTIVITY ═══════════ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[13px] font-semibold">
                {t('dashboard.recentLeads', { defaultValue: 'Leads recentes' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leadsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : recentLeads?.length > 0 ? (
                <div className="-mx-2">
                  {recentLeads.map((lead: any) => (
                    <div
                      key={lead.id}
                      className="flex cursor-pointer items-center gap-3 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <Avatar fallback={lead.contact?.name || 'L'} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">
                          {lead.contact?.name || t('leads.noName')}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {lead.channel?.name || t('leads.direct')}
                        </p>
                      </div>
                      <div className="text-right">
                        {lead.value && (
                          <p className="font-display text-[16px] leading-none">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              maximumFractionDigits: 0,
                            }).format(lead.value)}
                          </p>
                        )}
                        <p className="mt-1 text-[10.5px] text-muted-foreground">
                          {formatDateTime(lead.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-[13px] text-muted-foreground">
                  {t('empty.leads')}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px] font-semibold">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t('dashboard.recentActivity', { defaultValue: 'Atividade recente' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityItems.length > 0 ? (
                <ul className="-my-1">
                  {activityItems.slice(0, 8).map((a) => (
                    <li
                      key={`${a.type}-${a.id}`}
                      className="flex items-start gap-3 border-b py-2.5 last:border-0"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <div
                        className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-[8px]"
                        style={{ background: a.type === 'lead' ? 'rgba(138,164,255,0.12)' : 'rgba(237,237,236,0.08)' }}
                      >
                        <a.icon className="h-3.5 w-3.5" style={{ color: a.type === 'lead' ? 'var(--color-info)' : 'var(--color-foreground)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{a.title}</p>
                        <p className="text-[11.5px] text-muted-foreground">{a.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{a.time}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-[13px] text-muted-foreground">
                  {t('empty.recentActivity')}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ═══════════ PENDING TASKS ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold">
              {t('dashboard.pendingTasks', { defaultValue: 'Tarefas pendentes' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : recentTasks?.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {recentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2.5 transition-colors hover:bg-muted/60"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{task.title}</p>
                      <p className="text-[11.5px] text-muted-foreground">{task.type}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10.5px]">
                      {task.due_date ? formatDateTime(task.due_date) : t('tasks.noDate')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-[13px] text-muted-foreground">{t('empty.tasks')}</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Pipeline widget ──────────────────────────────────────────────

function PipelineWidget({ pipeline, t }: { pipeline: Pipeline; t: (key: string) => string }) {
  const stages = pipeline.stages || []

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold">{pipeline.name}</p>
        {pipeline.is_default && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            {t('common.default')}
          </Badge>
        )}
      </div>
      {stages.length > 0 ? (
        <div className="flex gap-1">
          {stages.map((stage) => (
            <div key={stage.id} className="group relative flex-1">
              <div
                className="h-2 rounded-full transition-all group-hover:h-3"
                style={{ backgroundColor: stage.color || 'var(--color-bold-ink)', opacity: 0.75 }}
              />
              <p className="mt-1.5 truncate text-center text-[10px] text-muted-foreground">
                {stage.name}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">{t('empty.stages')}</p>
      )}
    </div>
  )
}

// ─── Activity timeline builder ─────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'lead' | 'task'
  title: string
  subtitle: string
  time: string
  icon: typeof Users
  date: Date
}

function buildActivityTimeline(leads: any[], tasks: any[]): ActivityItem[] {
  const items: ActivityItem[] = []

  for (const lead of leads) {
    items.push({
      id: lead.id,
      type: 'lead',
      title: lead.contact?.name || 'Novo lead',
      subtitle: lead.channel?.name ? `via ${lead.channel.name}` : 'Lead criado',
      time: formatRelativeTime(lead.created_at),
      icon: UserPlus,
      date: new Date(lead.created_at),
    })
  }

  for (const task of tasks) {
    items.push({
      id: task.id,
      type: 'task',
      title: task.title,
      subtitle: task.type || 'Tarefa',
      time: formatRelativeTime(task.created_at || task.due_date),
      icon: CheckCircle,
      date: new Date(task.created_at || task.due_date),
    })
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime())
  return items
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return formatDateTime(dateStr)
}
