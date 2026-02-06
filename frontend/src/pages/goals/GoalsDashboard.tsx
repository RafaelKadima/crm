import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Award,
  ChevronRight,
  Plus,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  FileEdit,
  Play,
} from 'lucide-react'
import { useKprDashboard, useMyKprProgress, useKpiDashboard, useKprs } from '@/hooks/useGoals'
import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'
import { formatCurrency } from '@/lib/utils'

export function GoalsDashboard() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'gestor'

  const { data: dashboard, isLoading: loadingDashboard } = useKprDashboard()
  const { data: myProgress, isLoading: loadingMyProgress } = useMyKprProgress()
  const { data: kpis } = useKpiDashboard()
  const { data: allKprs } = useKprs()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead':
        return 'text-green-600 bg-green-100'
      case 'on_track':
        return 'text-blue-600 bg-blue-100'
      case 'behind':
        return 'text-yellow-600 bg-yellow-100'
      case 'critical':
        return 'text-red-600 bg-red-100'
      case 'draft':
        return 'text-muted-foreground bg-gray-100'
      case 'active':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-muted-foreground bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ahead':
        return t('goals.status.ahead')
      case 'on_track':
        return t('goals.status.onTrack')
      case 'behind':
        return t('goals.status.behind')
      case 'critical':
        return t('goals.status.critical')
      case 'pending':
        return t('goals.status.pending')
      case 'draft':
        return t('goals.status.draft')
      case 'active':
        return t('goals.status.active')
      case 'completed':
        return t('goals.status.completed')
      case 'cancelled':
        return t('goals.status.cancelled')
      default:
        return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return <DollarSign className="h-5 w-5" />
      case 'deals':
        return <Target className="h-5 w-5" />
      case 'activities':
        return <Activity className="h-5 w-5" />
      default:
        return <BarChart3 className="h-5 w-5" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'revenue':
        return t('goals.types.revenue')
      case 'deals':
        return t('goals.types.deals')
      case 'activities':
        return t('goals.types.activities')
      default:
        return t('goals.types.custom')
    }
  }

  if (loadingDashboard || loadingMyProgress) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Lista de todas as KPRs do tenant (incluindo rascunhos)
  const kprsList = allKprs?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('goals.title')}
        subtitle={t('goals.subtitle')}
        actions={
          isAdmin ? (
            <Link to="/goals/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('goals.newGoal')}
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Summary Cards */}
      {isAdmin && dashboard && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('goals.activeGoals')}</p>
                  <p className="text-2xl font-bold">{dashboard.summary?.total_kprs || 0}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('goals.totalTarget')}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(dashboard.summary?.total_target || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('goals.achieved')}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(dashboard.summary?.total_current || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('goals.overallProgress')}</p>
                  <p className="text-2xl font-bold">
                    {Number(dashboard.summary?.overall_progress || 0).toFixed(1)}%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <Progress
                value={dashboard.summary?.overall_progress || 0}
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue={isAdmin ? 'all-goals' : 'my-goals'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-goals">{t('goals.myGoals')}</TabsTrigger>
          <TabsTrigger value="kpis">{t('goals.indicators')}</TabsTrigger>
          {isAdmin && <TabsTrigger value="all-goals">{t('goals.allGoals')}</TabsTrigger>}
        </TabsList>

        {/* My Goals Tab */}
        <TabsContent value="my-goals" className="space-y-4">
          {!myProgress?.assignments?.length ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">{t('goals.noGoalAssigned')}</h3>
                <p className="text-muted-foreground">
                  {t('goals.noGoalAssignedMessage')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {/* Summary */}
              {myProgress?.summary && (
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('goals.yourOverallProgress')}</p>
                        <p className="text-3xl font-bold">
                          {Number(myProgress.summary.overall_progress || 0).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatCurrency(myProgress.summary.total_current)} {t('goals.of')}{' '}
                          {formatCurrency(myProgress.summary.total_targets)}
                        </p>
                      </div>
                      <Award className="h-16 w-16 text-primary opacity-50" />
                    </div>
                    <Progress
                      value={myProgress.summary.overall_progress || 0}
                      className="mt-4 h-3"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Individual Goals */}
              {myProgress?.assignments?.map((assignment: any) => (
                <Card key={assignment.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {getTypeIcon(assignment.kpr?.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{assignment.kpr?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {assignment.kpr?.period_start} a {assignment.kpr?.period_end}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={getStatusColor(assignment.track_status)}>
                              {getStatusLabel(assignment.track_status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {assignment.kpr?.remaining_days} {t('goals.daysRemaining')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {Number(assignment.progress_percentage || 0).toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(assignment.current_value)} /{' '}
                          {formatCurrency(assignment.target_value)}
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={assignment.progress_percentage || 0}
                      className="mt-4"
                    />
                    <div className="flex items-center justify-between mt-3 text-sm">
                      <span className="text-muted-foreground">
                        {t('goals.remaining')}: {formatCurrency(assignment.remaining_value)}
                      </span>
                      <div className="flex items-center gap-1">
                        {assignment.trend?.direction === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : assignment.trend?.direction === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span
                          className={
                            assignment.trend?.direction === 'up'
                              ? 'text-green-600'
                              : assignment.trend?.direction === 'down'
                              ? 'text-red-600'
                              : 'text-muted-foreground'
                          }
                        >
                          {Number(assignment.trend?.change || 0) > 0 ? '+' : ''}
                          {Number(assignment.trend?.change || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4">
          {!kpis?.kpis?.length ? (
            <Card>
              <CardContent className="py-10 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">{t('goals.noKpiConfigured')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('goals.noKpiConfiguredMessage')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kpis?.kpis?.map((kpiItem: any) => (
                <Card key={kpiItem.kpi.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${kpiItem.kpi.color}20` }}
                        >
                          <BarChart3
                            className="h-5 w-5"
                            style={{ color: kpiItem.kpi.color }}
                          />
                        </div>
                        <div>
                          <p className="font-semibold">{kpiItem.kpi.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {kpiItem.kpi.key}
                          </p>
                        </div>
                      </div>
                      {kpiItem.trend === 'up' ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : kpiItem.trend === 'down' ? (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <p className="text-2xl font-bold">{kpiItem.formatted_value}</p>
                      {kpiItem.kpi.target_value && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {t('goals.target')}: {kpiItem.kpi.target_value}
                            {kpiItem.kpi.unit}
                          </span>
                          {kpiItem.is_on_target ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                      )}
                      {kpiItem.variation !== undefined && Number(kpiItem.variation) !== 0 && (
                        <p
                          className={`text-sm ${
                            Number(kpiItem.variation) > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {Number(kpiItem.variation) > 0 ? '+' : ''}
                          {Number(kpiItem.variation).toFixed(1)}% {t('goals.vsPreviousPeriod')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Goals Tab (Admin) */}
        {isAdmin && (
          <TabsContent value="all-goals" className="space-y-4">
            {kprsList.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">{t('goals.noGoalCreated')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('goals.noGoalCreatedMessage')}
                  </p>
                  <Link to="/goals/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('goals.createGoal')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {kprsList.map((kpr: any) => (
                  <Card key={kpr.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${kpr.status === 'draft' ? 'bg-gray-100' : 'bg-primary/10'}`}>
                            {kpr.status === 'draft' ? (
                              <FileEdit className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              getTypeIcon(kpr.type)
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{kpr.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {getTypeLabel(kpr.type)} | {kpr.period_start} a {kpr.period_end}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={getStatusColor(kpr.status)}>
                                {kpr.status === 'draft' ? (
                                  <><FileEdit className="h-3 w-3 mr-1" /> {t('goals.status.draft')}</>
                                ) : kpr.status === 'active' ? (
                                  <><Play className="h-3 w-3 mr-1" /> {t('goals.status.active')}</>
                                ) : (
                                  getStatusLabel(kpr.status)
                                )}
                              </Badge>
                              {kpr.status === 'active' && kpr.track_status && (
                                <Badge variant="outline" className={getStatusColor(kpr.track_status)}>
                                  {getStatusLabel(kpr.track_status)}
                                </Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                {kpr.assignments_count || 0} {t('goals.sellers')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <p className="text-lg font-bold">
                              {formatCurrency(kpr.target_value)}
                            </p>
                            {kpr.status === 'active' && (
                              <p className="text-sm text-muted-foreground">
                                {Number(kpr.current_progress || 0).toFixed(1)}% {t('goals.achieved')}
                              </p>
                            )}
                          </div>
                          <Link to={kpr.status === 'draft' ? `/goals/${kpr.id}/edit` : `/goals/${kpr.id}`}>
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      {kpr.status === 'active' && (
                        <Progress value={kpr.current_progress || 0} className="mt-4" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default GoalsDashboard
