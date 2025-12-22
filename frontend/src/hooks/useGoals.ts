import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kprApi, kpiApi, activityAnalysisApi } from '@/api/goals'
import type { Kpr, Kpi, Distribution } from '@/api/goals'

// =====================
// KPR HOOKS
// =====================

export function useKprs(params?: { status?: string; type?: string; current_period?: boolean }) {
  return useQuery({
    queryKey: ['kprs', params],
    queryFn: async () => {
      const response = await kprApi.list(params)
      return response.data
    },
  })
}

export function useKpr(id: string) {
  return useQuery({
    queryKey: ['kpr', id],
    queryFn: async () => {
      const response = await kprApi.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useKprProgress(id: string) {
  return useQuery({
    queryKey: ['kpr-progress', id],
    queryFn: async () => {
      const response = await kprApi.progress(id)
      return response.data
    },
    enabled: !!id,
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useKprRanking(id: string) {
  return useQuery({
    queryKey: ['kpr-ranking', id],
    queryFn: async () => {
      const response = await kprApi.ranking(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useMyKprProgress() {
  return useQuery({
    queryKey: ['my-kpr-progress'],
    queryFn: async () => {
      const response = await kprApi.myProgress()
      return response.data
    },
    refetchInterval: 60000,
  })
}

export function useKprDashboard() {
  return useQuery({
    queryKey: ['kpr-dashboard'],
    queryFn: async () => {
      const response = await kprApi.dashboard()
      return response.data
    },
    refetchInterval: 60000,
  })
}

export function useCreateKpr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      type: 'revenue' | 'deals' | 'activities' | 'custom'
      target_value: number
      period_start: string
      period_end: string
      pipeline_id?: string
      product_id?: string
      status?: 'draft' | 'active'
      distributions?: Distribution[]
    }) => kprApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kprs'] })
      queryClient.invalidateQueries({ queryKey: ['kpr-dashboard'] })
    },
  })
}

export function useUpdateKpr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Kpr> }) => kprApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kprs'] })
      queryClient.invalidateQueries({ queryKey: ['kpr', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['kpr-dashboard'] })
    },
  })
}

export function useDeleteKpr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => kprApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kprs'] })
      queryClient.invalidateQueries({ queryKey: ['kpr-dashboard'] })
    },
  })
}

export function useDistributeKpr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, distributions }: { id: string; distributions: Distribution[] }) =>
      kprApi.distribute(id, distributions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpr', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['kpr-progress', variables.id] })
    },
  })
}

export function useDistributeToTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, teamId, method }: { id: string; teamId: string; method?: 'equal' | 'performance' }) =>
      kprApi.distributeToTeam(id, teamId, method),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpr', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['kpr-progress', variables.id] })
    },
  })
}

export function useActivateKpr() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => kprApi.activate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['kprs'] })
      queryClient.invalidateQueries({ queryKey: ['kpr', id] })
      queryClient.invalidateQueries({ queryKey: ['kpr-dashboard'] })
    },
  })
}

// =====================
// KPI HOOKS
// =====================

export function useKpis(activeOnly = true) {
  return useQuery({
    queryKey: ['kpis', { activeOnly }],
    queryFn: async () => {
      const response = await kpiApi.list({ active_only: activeOnly })
      return response.data
    },
  })
}

export function useKpi(id: string) {
  return useQuery({
    queryKey: ['kpi', id],
    queryFn: async () => {
      const response = await kpiApi.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useKpiDashboard(params?: { period?: string; user_id?: string; team_id?: string }) {
  return useQuery({
    queryKey: ['kpi-dashboard', params],
    queryFn: async () => {
      const response = await kpiApi.dashboard(params)
      return response.data
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  })
}

export function useMyKpis(period?: string) {
  return useQuery({
    queryKey: ['my-kpis', period],
    queryFn: async () => {
      const response = await kpiApi.myKpis(period)
      return response.data
    },
    refetchInterval: 300000,
  })
}

export function useUserKpis(userId: string, period?: string) {
  return useQuery({
    queryKey: ['user-kpis', userId, period],
    queryFn: async () => {
      const response = await kpiApi.userKpis(userId, period)
      return response.data
    },
    enabled: !!userId,
  })
}

export function useTeamKpis(teamId: string, period?: string) {
  return useQuery({
    queryKey: ['team-kpis', teamId, period],
    queryFn: async () => {
      const response = await kpiApi.teamKpis(teamId, period)
      return response.data
    },
    enabled: !!teamId,
  })
}

export function useKpiTrend(kpiId: string, params?: { periods?: number; period_type?: string; user_id?: string }) {
  return useQuery({
    queryKey: ['kpi-trend', kpiId, params],
    queryFn: async () => {
      const response = await kpiApi.trend(kpiId, params)
      return response.data
    },
    enabled: !!kpiId,
  })
}

export function useCreateKpi() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      name: string
      key: string
      description?: string
      formula_type: string
      source: string
      unit?: string
      target_value?: number
      weight?: number
      icon?: string
      color?: string
    }) => kpiApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
    },
  })
}

export function useUpdateKpi() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Kpi> }) => kpiApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
      queryClient.invalidateQueries({ queryKey: ['kpi', variables.id] })
    },
  })
}

export function useDeleteKpi() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => kpiApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
    },
  })
}

export function useInitializeDefaultKpis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => kpiApi.initializeDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] })
    },
  })
}

export function useCalculateKpis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ period, periodType }: { period?: string; periodType?: string }) =>
      kpiApi.calculate(period, periodType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['my-kpis'] })
    },
  })
}

// =====================
// ACTIVITY ANALYSIS HOOKS
// =====================

export function useMyActivityContribution(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['my-activity-contribution', startDate, endDate],
    queryFn: () => activityAnalysisApi.myContribution(startDate, endDate),
  })
}

export function useUserActivityContribution(userId: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['user-activity-contribution', userId, startDate, endDate],
    queryFn: () => activityAnalysisApi.userContribution(userId, startDate, endDate),
    enabled: !!userId,
  })
}

export function useLeadJourney(leadId: string) {
  return useQuery({
    queryKey: ['lead-journey', leadId],
    queryFn: () => activityAnalysisApi.leadJourney(leadId),
    enabled: !!leadId,
  })
}

export function useCompareUsers(userIds: string[], startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['compare-users', userIds, startDate, endDate],
    queryFn: () => activityAnalysisApi.compare(userIds, startDate, endDate),
    enabled: userIds.length >= 2,
  })
}

export function useTenantInsights(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['tenant-insights', startDate, endDate],
    queryFn: () => activityAnalysisApi.insights(startDate, endDate),
  })
}
