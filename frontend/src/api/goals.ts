import api from './axios'

// =====================
// TYPES
// =====================

export interface Kpr {
  id: string
  tenant_id: string
  name: string
  description?: string
  type: 'revenue' | 'deals' | 'activities' | 'custom'
  target_value: number
  period_start: string
  period_end: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  pipeline_id?: string
  product_id?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Computed
  current_value?: number
  current_progress?: number
  remaining_value?: number
  remaining_days?: number
  period_progress?: number
  projected_value?: number
  track_status?: 'pending' | 'ahead' | 'on_track' | 'behind' | 'critical'
  // Relations
  creator?: { id: string; name: string }
  pipeline?: { id: string; name: string }
  assignments?: KprAssignment[]
}

export interface KprAssignment {
  id: string
  kpr_id: string
  assignable_type: string
  assignable_id: string
  parent_assignment_id?: string
  target_value: number
  weight: number
  current_value: number
  progress_percentage: number
  remaining_value?: number
  assignee_name?: string
  assignable?: { id: string; name: string }
  kpr?: Kpr
  children?: KprAssignment[]
}

export interface Kpi {
  id: string
  tenant_id: string
  name: string
  key: string
  description?: string
  formula_type: 'ratio' | 'sum' | 'average' | 'count' | 'custom'
  source: 'leads' | 'activities' | 'stages' | 'custom'
  unit: string
  target_value?: number
  weight: number
  is_active: boolean
  is_system: boolean
  display_order: number
  icon?: string
  color?: string
  current_value?: number
  latest_value?: KpiValue
}

export interface KpiValue {
  id: string
  kpi_id: string
  user_id?: string
  team_id?: string
  period: string
  period_type: string
  calculated_value: number
  target_value?: number
  previous_value?: number
  achievement_percentage: number
  variation_percentage?: number
  trend?: 'up' | 'down' | 'stable'
  formatted_value?: string
}

export interface KpiDashboardItem {
  kpi: {
    id: string
    name: string
    key: string
    unit: string
    icon?: string
    color?: string
    target_value?: number
  }
  value: number
  formatted_value: string
  previous_value?: number
  variation?: number
  achievement?: number
  trend?: 'up' | 'down' | 'stable'
  is_on_target?: boolean
}

export interface ActivityAnalysis {
  summary: {
    total_activities: number
    total_sales: number
    total_revenue: number
    activities_per_sale: number
    completion_rate: number
  }
  by_type: Array<{
    type: string
    count: number
    avg_points: number
  }>
  by_stage: Array<{
    stage_id: string
    stage_name: string
    stage_order: number
    total_activities: number
    in_won_leads: number
    effectiveness_rate: number
  }>
  type_effectiveness: Array<{
    type: string
    type_label: string
    total: number
    in_won_leads: number
    effectiveness_rate: number
  }>
  insights: Array<{
    type: 'positive' | 'info' | 'warning' | 'negative'
    icon: string
    message: string
  }>
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    icon: string
    title: string
    description: string
  }>
}

export interface Distribution {
  type: 'team' | 'user'
  id: string
  percentage: number
  parent_id?: string
}

// =====================
// KPR API
// =====================

export const kprApi = {
  // List all KPRs
  list: (params?: { status?: string; type?: string; current_period?: boolean }) =>
    api.get<{ data: Kpr[]; meta: any }>('/kprs', { params }),

  // Create KPR
  create: (data: {
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
  }) => api.post<{ message: string; kpr: Kpr }>('/kprs', data),

  // Get KPR
  get: (id: string) =>
    api.get<{ kpr: Kpr; stats: any }>(`/kprs/${id}`),

  // Update KPR
  update: (id: string, data: Partial<Kpr>) =>
    api.put<{ message: string; kpr: Kpr }>(`/kprs/${id}`, data),

  // Delete KPR
  delete: (id: string) =>
    api.delete<{ message: string }>(`/kprs/${id}`),

  // Distribute KPR
  distribute: (id: string, distributions: Distribution[]) =>
    api.post<{ message: string; kpr: Kpr }>(`/kprs/${id}/distribute`, { distributions }),

  // Distribute to team
  distributeToTeam: (id: string, teamId: string, method: 'equal' | 'performance' = 'equal') =>
    api.post<{ message: string; kpr: Kpr }>(`/kprs/${id}/distribute-to-team`, { team_id: teamId, method }),

  // Get progress
  progress: (id: string) =>
    api.get<{ kpr: any; assignments: any[] }>(`/kprs/${id}/progress`),

  // Get ranking
  ranking: (id: string) =>
    api.get<{ kpr: any; ranking: any[] }>(`/kprs/${id}/ranking`),

  // My progress
  myProgress: () =>
    api.get<{ assignments: any[]; summary: any }>('/kprs/my-progress'),

  // Dashboard
  dashboard: () =>
    api.get<{ summary: any; kprs: any[] }>('/kprs/dashboard'),

  // Activate
  activate: (id: string) =>
    api.post<{ message: string; kpr: Kpr }>(`/kprs/${id}/activate`),

  // Complete
  complete: (id: string) =>
    api.post<{ message: string; kpr: Kpr }>(`/kprs/${id}/complete`),
}

// =====================
// KPI API
// =====================

export const kpiApi = {
  // List all KPIs
  list: (params?: { active_only?: boolean }) =>
    api.get<{ kpis: Kpi[] }>('/kpis', { params }),

  // Create KPI
  create: (data: {
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
  }) => api.post<{ message: string; kpi: Kpi }>('/kpis', data),

  // Get KPI
  get: (id: string) =>
    api.get<{ kpi: Kpi; current_value: number; latest_value: KpiValue }>(`/kpis/${id}`),

  // Update KPI
  update: (id: string, data: Partial<Kpi>) =>
    api.put<{ message: string; kpi: Kpi }>(`/kpis/${id}`, data),

  // Delete KPI
  delete: (id: string) =>
    api.delete<{ message: string }>(`/kpis/${id}`),

  // Dashboard
  dashboard: (params?: { period?: string; user_id?: string; team_id?: string }) =>
    api.get<{ period: string; kpis: KpiDashboardItem[] }>('/kpis/dashboard', { params }),

  // My KPIs
  myKpis: (period?: string) =>
    api.get<{ period: string; kpis: KpiDashboardItem[] }>('/kpis/my-kpis', { params: { period } }),

  // Calculate
  calculate: (period?: string, periodType?: string) =>
    api.post<{ period: string; period_type: string; values: KpiValue[] }>('/kpis/calculate', { period, period_type: periodType }),

  // Initialize defaults
  initializeDefaults: () =>
    api.post<{ message: string; kpis: Kpi[] }>('/kpis/initialize-defaults'),

  // User KPIs
  userKpis: (userId: string, period?: string) =>
    api.get<{ period: string; kpis: KpiDashboardItem[] }>(`/kpis/user/${userId}`, { params: { period } }),

  // Team KPIs
  teamKpis: (teamId: string, period?: string) =>
    api.get<{ period: string; kpis: KpiDashboardItem[] }>(`/kpis/team/${teamId}`, { params: { period } }),

  // Trend
  trend: (kpiId: string, params?: { periods?: number; period_type?: string; user_id?: string }) =>
    api.get<{ kpi: any; values: any[] }>(`/kpis/${kpiId}/trend`, { params }),
}

// =====================
// ACTIVITY ANALYSIS API
// =====================

export const activityAnalysisApi = {
  // My contribution
  myContribution: (startDate?: string, endDate?: string) =>
    api.get<ActivityAnalysis>('/activity-analysis/my-contribution', {
      params: { start_date: startDate, end_date: endDate }
    }),

  // User contribution
  userContribution: (userId: string, startDate?: string, endDate?: string) =>
    api.get<ActivityAnalysis>(`/activity-analysis/user/${userId}`, {
      params: { start_date: startDate, end_date: endDate }
    }),

  // Lead journey
  leadJourney: (leadId: string) =>
    api.get<{ lead: any; journey: any[]; totals: any }>(`/activity-analysis/lead/${leadId}/journey`),

  // Compare users
  compare: (userIds: string[], startDate?: string, endDate?: string) =>
    api.post<{ period: any; comparison: any[] }>('/activity-analysis/compare', {
      user_ids: userIds,
      start_date: startDate,
      end_date: endDate
    }),

  // Tenant insights
  insights: (startDate?: string, endDate?: string) =>
    api.get<{ period: any; summary: any; top_performers: any[] }>('/activity-analysis/insights', {
      params: { start_date: startDate, end_date: endDate }
    }),
}

export default { kprApi, kpiApi, activityAnalysisApi }
