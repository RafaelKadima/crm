import api from './axios'
import type {
  AuthResponse,
  User,
  Lead,
  LeadImport,
  Contact,
  Ticket,
  Task,
  Pipeline,
  Channel,
  Group,
  PaginatedResponse,
  FunnelReport,
  ProductivityReport,
  WhatsAppTemplate,
  WhatsAppTemplateCategoryOption,
  WhatsAppTemplateStatusOption,
  WhatsAppTemplateStats,
  CreateWhatsAppTemplateData,
} from '@/types'

// =====================
// AUTH ENDPOINTS
// =====================
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/login', { email, password }),

  logout: () => api.post('/logout'),

  me: () => api.get<{ user: User }>('/me'),

  register: (data: { name: string; email: string; password: string; password_confirmation: string }) =>
    api.post<AuthResponse>('/register', data),
}

// =====================
// LEADS ENDPOINTS
// =====================
export const leadsApi = {
  list: (params?: { page?: number; per_page?: number; status?: string; stage_id?: string; owner_id?: string }) =>
    api.get<PaginatedResponse<Lead>>('/leads', { params }),

  get: (id: string) =>
    api.get<Lead>(`/leads/${id}`),

  create: (data: Partial<Lead>) =>
    api.post<Lead>('/leads', data),

  update: (id: string, data: Partial<Lead>) =>
    api.put<Lead>(`/leads/${id}`, data),

  updateStage: (id: string, stage_id: string) =>
    api.put<Lead>(`/leads/${id}/stage`, { stage_id }),

  assign: (id: string, owner_id: string) =>
    api.put<Lead>(`/leads/${id}/assign`, { owner_id }),

  delete: (id: string) =>
    api.delete(`/leads/${id}`),

  activities: (id: string) =>
    api.get<{ data: any[] }>(`/leads/${id}/activities`),
}

// Lead Import API
export const leadImportsApi = {
  list: () =>
    api.get<PaginatedResponse<LeadImport>>('/leads/imports'),

  get: (id: string) =>
    api.get<{ import: LeadImport; progress: number }>(`/leads/imports/${id}`),

  upload: (file: File, pipelineId?: string, options?: { distributeLeads?: boolean; skipDuplicates?: boolean; ownerId?: string }) => {
    const formData = new FormData()
    formData.append('file', file)
    if (pipelineId) {
      formData.append('pipeline_id', pipelineId)
    }
    if (options?.distributeLeads !== undefined) {
      formData.append('distribute_leads', options.distributeLeads ? '1' : '0')
    }
    if (options?.skipDuplicates !== undefined) {
      formData.append('skip_duplicates', options.skipDuplicates ? '1' : '0')
    }
    if (options?.ownerId) {
      formData.append('owner_id', options.ownerId)
    }
    return api.post<{ message: string; import: LeadImport }>('/leads/imports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  downloadTemplate: () =>
    api.get('/leads/imports/template', { responseType: 'blob' }),
}

// =====================
// CONTACTS ENDPOINTS
// =====================
export const contactsApi = {
  list: (params?: { page?: number; per_page?: number; search?: string }) =>
    api.get<PaginatedResponse<Contact>>('/contacts', { params }),

  get: (id: string) =>
    api.get<Contact>(`/contacts/${id}`),

  create: (data: Partial<Contact>) =>
    api.post<Contact>('/contacts', data),

  update: (id: string, data: Partial<Contact>) =>
    api.put<Contact>(`/contacts/${id}`, data),

  delete: (id: string) =>
    api.delete(`/contacts/${id}`),
}

// =====================
// TICKETS ENDPOINTS
// =====================
export const ticketsApi = {
  list: (params?: { page?: number; status?: string }) =>
    api.get<PaginatedResponse<Ticket>>('/tickets', { params }),

  get: (id: string) =>
    api.get<Ticket>(`/tickets/${id}`),

  create: (data: Partial<Ticket>) =>
    api.post<Ticket>('/tickets', data),

  update: (id: string, data: Partial<Ticket>) =>
    api.put<Ticket>(`/tickets/${id}`, data),

  sendMessage: (id: string, message: string) =>
    api.post(`/tickets/${id}/messages`, { message }),

  updateMessage: (ticketId: string, messageId: string, message: string) =>
    api.put(`/tickets/${ticketId}/messages/${messageId}`, { message }),

  deleteMessage: (ticketId: string, messageId: string) =>
    api.delete(`/tickets/${ticketId}/messages/${messageId}`),

  close: (id: string) =>
    api.patch(`/tickets/${id}/close`),
}

// =====================
// TASKS ENDPOINTS
// =====================
export const tasksApi = {
  list: (params?: { page?: number; status?: string; type?: string }) =>
    api.get<PaginatedResponse<Task>>('/tasks', { params }),

  get: (id: string) =>
    api.get<Task>(`/tasks/${id}`),

  create: (data: Partial<Task>) =>
    api.post<Task>('/tasks', data),

  update: (id: string, data: Partial<Task>) =>
    api.put<Task>(`/tasks/${id}`, data),

  complete: (id: string) =>
    api.put(`/tasks/${id}/complete`),

  delete: (id: string) =>
    api.delete(`/tasks/${id}`),
}

// =====================
// PIPELINES ENDPOINTS
// =====================
export const pipelinesApi = {
  list: () =>
    api.get<{ data: Pipeline[] }>('/pipelines'),

  get: (id: string) =>
    api.get<Pipeline>(`/pipelines/${id}`),

  stages: (pipelineId: string) =>
    api.get<{ data: any[] }>(`/pipelines/${pipelineId}/stages`),
}

// =====================
// CHANNELS ENDPOINTS
// =====================
export const channelsApi = {
  list: () =>
    api.get<{ data: Channel[] }>('/channels'),

  get: (id: string) =>
    api.get<Channel>(`/channels/${id}`),
}

// =====================
// DASHBOARD ENDPOINTS
// =====================
export const dashboardApi = {
  getData: () =>
    api.get<{
      stats: {
        total_leads: number
        total_contacts: number
        total_tickets: number
        total_tasks: number
        leads_won: number
        leads_lost: number
        conversion_rate: number
      }
      recent_leads: any[]
      recent_tasks: any[]
    }>('/dashboard/data'),
}

// =====================
// REPORTS ENDPOINTS
// =====================
export const reportsApi = {
  funnel: () =>
    api.get<{ data: FunnelReport[] }>('/reports/funnel'),

  productivity: () =>
    api.get<{ data: ProductivityReport[] }>('/reports/productivity'),

  ia: () =>
    api.get<{ data: any }>('/reports/ia'),

  distribution: () =>
    api.get<{ data: any }>('/reports/distribution'),
}

// =====================
// ACTIVITY ANALYSIS ENDPOINTS
// =====================
export interface ActivityEffectivenessItem {
  template_id: string
  template_title: string
  activity_type: string
  stage_name: string | null
  pipeline_name: string | null
  total_completed: number
  won_with_activity: number
  lost_with_activity: number
  conversion_rate: number
  conversion_without: number
  impact_percentage: number
  avg_completion_minutes: number
  is_high_impact: boolean
  is_critical: boolean
}

export interface ActivityEffectivenessResponse {
  period: { start: string; end: string }
  summary: {
    overall_lift: number
    total_activities_analyzed: number
    high_impact_count: number
    critical_count: number
  }
  all_activities: ActivityEffectivenessItem[]
  top_performing: ActivityEffectivenessItem[]
  needs_improvement: ActivityEffectivenessItem[]
}

export interface SequenceAnalysisResponse {
  period: { start: string; end: string }
  won: {
    total_leads: number
    avg_activities: number
    avg_days_to_close: number
    most_common_sequence: Record<string, number>
    activity_distribution: Record<string, number>
  }
  lost: {
    total_leads: number
    avg_activities: number
    avg_days_to_close: number
    most_common_sequence: Record<string, number>
    activity_distribution: Record<string, number>
  }
  insights: Array<{
    type: string
    severity: 'high' | 'medium' | 'low'
    message: string
    recommendation: string
  }>
}

export interface UserEffectivenessItem {
  user_id: string
  user_name: string
  total_leads: number
  won_leads: number
  conversion_rate: number
  total_activities: number
  activities_per_lead: number
}

export interface UserEffectivenessResponse {
  period: { start: string; end: string }
  users: UserEffectivenessItem[]
}

export const activityAnalysisApi = {
  // User contribution analysis
  getMyContribution: (params?: { start_date?: string; end_date?: string }) =>
    api.get<any>('/activity-analysis/my-contribution', { params }),

  getUserContribution: (userId: string, params?: { start_date?: string; end_date?: string }) =>
    api.get<any>(`/activity-analysis/user/${userId}`, { params }),

  // Lead journey analysis
  getLeadJourney: (leadId: string) =>
    api.get<any>(`/activity-analysis/lead/${leadId}/journey`),

  // Compare users
  compareUsers: (userIds: string[], params?: { start_date?: string; end_date?: string }) =>
    api.post<any>('/activity-analysis/compare', { user_ids: userIds, ...params }),

  // Tenant insights
  getTenantInsights: (params?: { start_date?: string; end_date?: string }) =>
    api.get<any>('/activity-analysis/insights', { params }),

  // Activity effectiveness report
  getEffectiveness: (params?: { start_date?: string; end_date?: string; pipeline_id?: string }) =>
    api.get<ActivityEffectivenessResponse>('/activity-analysis/effectiveness', { params }),

  // Sequence analysis (won vs lost)
  getSequenceAnalysis: (params?: { start_date?: string; end_date?: string }) =>
    api.get<SequenceAnalysisResponse>('/activity-analysis/sequence-analysis', { params }),

  // Effectiveness by user
  getEffectivenessByUser: (params?: { start_date?: string; end_date?: string }) =>
    api.get<UserEffectivenessResponse>('/activity-analysis/effectiveness-by-user', { params }),
}

// =====================
// GROUPS ENDPOINTS
// =====================
export const groupsApi = {
  list: () =>
    api.get<Group[]>('/groups'),

  get: (id: string) =>
    api.get<Group>(`/groups/${id}`),

  create: (data: Partial<Group>) =>
    api.post<Group>('/groups', data),

  update: (id: string, data: Partial<Group>) =>
    api.put<Group>(`/groups/${id}`, data),

  delete: (id: string) =>
    api.delete(`/groups/${id}`),

  dashboard: (id: string) =>
    api.get(`/groups/${id}/dashboard`),

  metricsPerTenant: (id: string) =>
    api.get(`/groups/${id}/metrics-per-tenant`),

  funnelReport: (id: string) =>
    api.get(`/groups/${id}/funnel`),

  salesRanking: (id: string) =>
    api.get(`/groups/${id}/sales-ranking`),

  addTenant: (id: string, tenant_id: string) =>
    api.post(`/groups/${id}/tenants`, { tenant_id }),

  removeTenant: (groupId: string, tenantId: string) =>
    api.delete(`/groups/${groupId}/tenants/${tenantId}`),

  addUser: (id: string, user_id: string, role: string) =>
    api.post(`/groups/${id}/users`, { user_id, role }),

  removeUser: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/users/${userId}`),
}

// =====================
// WHATSAPP TEMPLATES ENDPOINTS
// =====================
export const whatsAppTemplatesApi = {
  // Listagem e CRUD
  list: (params?: { 
    channel_id?: string
    category?: string
    status?: string
    search?: string
    page?: number
    per_page?: number 
  }) =>
    api.get<{ success: boolean; data: WhatsAppTemplate[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>('/whatsapp/templates', { params }),

  get: (id: string) =>
    api.get<{ success: boolean; data: WhatsAppTemplate }>(`/whatsapp/templates/${id}`),

  create: (data: CreateWhatsAppTemplateData) =>
    api.post<{ success: boolean; message: string; data: WhatsAppTemplate }>('/whatsapp/templates', data),

  delete: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/whatsapp/templates/${id}`),

  checkStatus: (id: string) =>
    api.get<{ success: boolean; data: { status: string; status_description: string; rejection_reason?: string; approved_at?: string; can_send: boolean } }>(`/whatsapp/templates/${id}/status`),

  // Operações por canal
  listFromMeta: (channelId: string, category?: string) =>
    api.get<{ success: boolean; data: any[]; count: number }>(`/whatsapp/templates/meta/${channelId}`, { params: { category } }),

  sync: (channelId: string) =>
    api.post<{ success: boolean; message: string; data: { created: number; updated: number; total: number } }>(`/whatsapp/templates/sync/${channelId}`),

  getApproved: (channelId: string) =>
    api.get<{ success: boolean; data: WhatsAppTemplate[] }>(`/whatsapp/templates/approved/${channelId}`),

  getStats: (channelId: string) =>
    api.get<{ success: boolean; data: WhatsAppTemplateStats }>(`/whatsapp/templates/stats/${channelId}`),

  // Utilitários
  getCategories: () =>
    api.get<{ success: boolean; data: WhatsAppTemplateCategoryOption[] }>('/whatsapp/templates/categories'),

  getStatuses: () =>
    api.get<{ success: boolean; data: WhatsAppTemplateStatusOption[] }>('/whatsapp/templates/statuses'),

  checkName: (name: string, channelId: string, language?: string, excludeId?: string) =>
    api.get<{ success: boolean; available: boolean }>('/whatsapp/templates/check-name', { 
      params: { name, channel_id: channelId, language, exclude_id: excludeId } 
    }),

  preview: (data: CreateWhatsAppTemplateData) =>
    api.post<{ success: boolean; data: { payload: any; variable_count: number; variable_indices: number[] } }>('/whatsapp/templates/preview', data),
}

// =====================
// AI USAGE ENDPOINTS
// =====================
export interface AiUsageSummary {
  tenant_id: string
  tenant_name: string
  plan: string
  plan_label: string
  period: string
  leads: {
    used: number
    limit: number
    percentage: number
  }
  ai_units: {
    used: number
    limit: number
    bonus: number
    total_available: number
    remaining: number
    percentage: number
    breakdown: {
      '4o_mini': number
      '4o': number
    }
    gpt4o_enabled: boolean
  }
  ai_cost: {
    cost_brl: number
    cost_usd: number
    messages_sent: number
    tokens_used: number
  }
  rag: { used: number; limit: number }
  audio: { used: number; limit: number }
  image: { used: number; limit: number }
  users: { used: number; limit: number }
  channels: { used: number; limit: number }
  tickets: { created: number; closed: number }
  messages: { inbound: number; outbound: number }
}

export interface AiPackage {
  units?: number
  documents?: number
  minutes?: number
  analyses?: number
  price: number
  label: string
  description?: string
}

export interface AiPackagePurchase {
  id: string
  package_type: string
  package_id: string
  quantity: number
  consumed: number
  remaining: number
  price_brl: number
  status: string
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export interface PlanDetails {
  value: string
  label: string
  description: string
  price: number
  max_users: number
  ai_units_quota: number
  has_ia_sdr: boolean
  has_gpt4o: boolean
  has_ads_intelligence: boolean
  rag_documents: number
  audio_minutes: number
  image_analyses: number
  is_new_plan: boolean
}

export const aiUsageApi = {
  // Resumo de uso
  getSummary: () =>
    api.get<AiUsageSummary>('/usage/summary'),

  // Uso diário
  getDailyUsage: (days = 30) =>
    api.get<{ tenant_id: string; days: number; usage: Array<{ date: string; units: number; cost: number; calls: number }> }>('/usage/daily', { params: { days } }),

  // Uso por modelo
  getUsageByModel: (startDate?: string, endDate?: string) =>
    api.get<{ tenant_id: string; usage_by_model: Array<{ model: string; tokens: number; units: number; cost: number; calls: number }> }>('/usage/by-model', { params: { start_date: startDate, end_date: endDate } }),

  // Verificar limites
  checkLimits: () =>
    api.get<{ limits: { all_ok: boolean; warnings: string[]; exceeded: string[] }; ai_access: { allowed: boolean; message?: string } }>('/usage/limits'),

  // Custo de excedente
  getOverageCost: () =>
    api.get<{ overage_units: number; overage_cost: number }>('/usage/overage'),

  // Estimativa de uso
  estimate: (data: { leads_per_month: number; messages_per_lead?: number; premium_percentage?: number }) =>
    api.post<{ leads: number; messages: number; total_tokens: number; total_units: number; recommended_plan: string }>('/usage/estimate', data),
}

export const packagesApi = {
  // Pacotes disponíveis
  getAvailable: () =>
    api.get<{ packages: { ai_units: Record<string, AiPackage>; rag: Record<string, AiPackage>; audio: Record<string, AiPackage>; image: Record<string, AiPackage> }; overage_price_per_1k: number }>('/packages/available'),

  // Compras do tenant
  getPurchases: (status?: string) =>
    api.get<{ purchases: AiPackagePurchase[] }>('/packages/purchases', { params: { status } }),

  // Comprar pacote
  purchase: (packageType: string, packageId: string) =>
    api.post<{ success: boolean; purchase: AiPackagePurchase; package_info: AiPackage; message: string }>('/packages/purchase', { package_type: packageType, package_id: packageId }),

  // Confirmar pagamento
  confirmPayment: (purchaseId: string, paymentReference?: string) =>
    api.post<{ success: boolean; purchase: AiPackagePurchase; message: string }>(`/packages/purchases/${purchaseId}/confirm`, { payment_reference: paymentReference }),
}

export const plansApi = {
  // Lista de planos
  getPlans: () =>
    api.get<{ plans: PlanDetails[]; current_plan: PlanDetails }>('/plans'),
}

// =====================
// FILE UPLOAD ENDPOINTS
// =====================
export interface PresignedUrlResponse {
  success: boolean
  upload_url: string
  method: 'PUT' | 'POST'
  attachment_id: string
  path: string
  expires_at: string
  headers?: Record<string, string>
  use_form_data?: boolean
}

export interface AttachmentResponse {
  id: string
  tenant_id: string
  ticket_id: string
  ticket_message_id?: string
  file_name: string
  file_path: string
  file_type: 'image' | 'video' | 'audio' | 'document'
  file_size: number
  mime_type: string
  storage_disk: string
  status: 'pending' | 'uploaded' | 'confirmed' | 'failed'
  download_url?: string
  created_at: string
  updated_at: string
}

export const filesApi = {
  // Get presigned URL for direct upload
  getPresignedUrl: (data: {
    filename: string
    mime_type: string
    file_size: number
    ticket_id: string
  }) =>
    api.post<PresignedUrlResponse>('/files/presigned-url', data),

  // Direct upload for local storage fallback
  uploadDirect: (attachmentId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<{ success: boolean; attachment: AttachmentResponse }>(
      `/files/upload/${attachmentId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
  },

  // Confirm upload completed
  confirmUpload: (attachmentId: string, ticketMessageId?: string) =>
    api.post<{ success: boolean; attachment: AttachmentResponse }>('/files/confirm', {
      attachment_id: attachmentId,
      ticket_message_id: ticketMessageId,
    }),

  // List attachments for a ticket
  listByTicket: (ticketId: string) =>
    api.get<{ success: boolean; data: AttachmentResponse[] }>(`/files/ticket/${ticketId}`),

  // Get download URL
  getDownloadUrl: (attachmentId: string) =>
    api.get<{ success: boolean; download_url: string; expires_at: string }>(
      `/files/${attachmentId}/download-url`
    ),

  // Delete attachment
  delete: (attachmentId: string) =>
    api.delete<{ success: boolean; message: string }>(`/files/${attachmentId}`),
}

// =====================
// WHATSAPP MEDIA ENDPOINTS
// =====================
export const whatsAppMediaApi = {
  // Send media via WhatsApp
  sendMedia: (ticketId: string, attachmentId: string, caption?: string) =>
    api.post(`/whatsapp/tickets/${ticketId}/media`, {
      attachment_id: attachmentId,
      caption,
    }),
}

// =====================
// STAGE ACTIVITIES ENDPOINTS
// =====================
import type {
  StageActivityTemplate,
  DealStageActivity,
  StageProgress,
  CanAdvanceResult,
} from '@/types'

export const stageActivityTemplatesApi = {
  // List templates for a stage
  list: (pipelineId: string, stageId: string) =>
    api.get<StageActivityTemplate[]>(`/pipelines/${pipelineId}/stages/${stageId}/activity-templates`),

  // Create a template
  create: (pipelineId: string, stageId: string, data: Partial<StageActivityTemplate>) =>
    api.post<{ message: string; template: StageActivityTemplate }>(
      `/pipelines/${pipelineId}/stages/${stageId}/activity-templates`,
      data
    ),

  // Get a template
  get: (pipelineId: string, stageId: string, templateId: string) =>
    api.get<StageActivityTemplate>(
      `/pipelines/${pipelineId}/stages/${stageId}/activity-templates/${templateId}`
    ),

  // Update a template
  update: (pipelineId: string, stageId: string, templateId: string, data: Partial<StageActivityTemplate>) =>
    api.put<{ message: string; template: StageActivityTemplate }>(
      `/pipelines/${pipelineId}/stages/${stageId}/activity-templates/${templateId}`,
      data
    ),

  // Delete a template
  delete: (pipelineId: string, stageId: string, templateId: string) =>
    api.delete<{ message: string }>(
      `/pipelines/${pipelineId}/stages/${stageId}/activity-templates/${templateId}`
    ),

  // Reorder templates
  reorder: (pipelineId: string, stageId: string, templateIds: string[]) =>
    api.post<{ message: string }>(
      `/pipelines/${pipelineId}/stages/${stageId}/activity-templates/reorder`,
      { template_ids: templateIds }
    ),
}

export const dealStageActivitiesApi = {
  // List activities for current stage
  list: (leadId: string) =>
    api.get<DealStageActivity[]>(`/leads/${leadId}/stage-activities`),

  // List all activities for a lead
  listAll: (leadId: string) =>
    api.get<DealStageActivity[]>(`/leads/${leadId}/stage-activities/all`),

  // Get stage progress
  getProgress: (leadId: string) =>
    api.get<StageProgress>(`/leads/${leadId}/stage-progress`),

  // Check if lead can advance
  canAdvance: (leadId: string) =>
    api.get<CanAdvanceResult>(`/leads/${leadId}/can-advance-stage`),

  // Complete an activity
  complete: (leadId: string, activityId: string) =>
    api.post<{ message: string; activity: DealStageActivity; points_earned: number }>(
      `/leads/${leadId}/stage-activities/${activityId}/complete`
    ),

  // Skip an activity
  skip: (leadId: string, activityId: string) =>
    api.post<{ message: string; activity: DealStageActivity }>(
      `/leads/${leadId}/stage-activities/${activityId}/skip`
    ),
}

// =====================
// ACTIVITIES DASHBOARD API
// =====================
export interface ActivityDashboardSummary {
  overdue: number
  due_today: number
  due_soon: number
  pending: number
  completed_today: number
}

export interface DashboardActivity {
  id: string
  status: string
  due_at: string | null
  days_overdue: number
  days_until_due: number | null
  is_overdue: boolean
  is_required: boolean
  template: {
    id: string
    title: string
    description: string | null
    activity_type: string
    icon: string
    points: number
  } | null
  lead: {
    id: string
    name: string
    company: string | null
    user_id: string
    user_name?: string
  } | null
  stage: {
    id: string
    name: string
    color: string
  } | null
}

export interface ActivityDashboardResponse {
  summary: ActivityDashboardSummary
  overdue_activities: DashboardActivity[]
  due_today_activities: DashboardActivity[]
}

export const activitiesDashboardApi = {
  // Get dashboard summary and activities
  getDashboard: (params?: { user_id?: string }) =>
    api.get<ActivityDashboardResponse>('/activities/dashboard', { params }),

  // Get all overdue activities (paginated)
  getOverdue: (params?: { user_id?: string; pipeline_id?: string; per_page?: number; page?: number }) =>
    api.get<PaginatedResponse<DashboardActivity>>('/activities/overdue', { params }),

  // Get activities due today
  getDueToday: () =>
    api.get<DashboardActivity[]>('/activities/due-today'),

  // Get activities due soon
  getDueSoon: (days?: number) =>
    api.get<DashboardActivity[]>('/activities/due-soon', { params: { days } }),
}

// =====================
// GAMIFICATION ENDPOINTS
// =====================
import type {
  GamificationTier,
  PointRule,
  PointTransaction,
  UserPoints,
  Reward,
  UserReward,
  Achievement,
  UserAchievement,
  GamificationSettings,
  UserGamificationStats,
  LeaderboardEntry,
  GamificationAdminStats,
  PaginatedResponse,
} from '@/types'

export const gamificationApi = {
  // User-facing endpoints
  getMyStats: () =>
    api.get<UserGamificationStats>('/gamification/my-stats'),

  getMyPoints: () =>
    api.get<UserPoints>('/gamification/my-points'),

  getMyAchievements: () =>
    api.get<UserAchievement[]>('/gamification/my-achievements'),

  getMyRewards: () =>
    api.get<UserReward[]>('/gamification/my-rewards'),

  getLeaderboard: (params?: { period?: string; limit?: number }) =>
    api.get<LeaderboardEntry[]>('/gamification/leaderboard', { params }),

  getTiers: () =>
    api.get<GamificationTier[]>('/gamification/tiers'),

  getAchievements: () =>
    api.get<Achievement[]>('/gamification/achievements'),

  getRewards: () =>
    api.get<Reward[]>('/gamification/rewards'),

  claimReward: (rewardId: string) =>
    api.post<{ message: string; user_reward: UserReward }>(`/gamification/rewards/${rewardId}/claim`),

  getTransactions: (params?: { page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<PointTransaction>>('/gamification/transactions', { params }),

  // Configurações públicas (para saber o que exibir na UI)
  getPublicSettings: () =>
    api.get<{ is_enabled: boolean; show_leaderboard: boolean; show_points_to_users: boolean; sound_enabled: boolean }>('/gamification/settings'),
}

// Admin gamification endpoints
export const gamificationAdminApi = {
  // Settings
  getSettings: () =>
    api.get<GamificationSettings>('/admin/gamification/settings'),

  updateSettings: (data: Partial<GamificationSettings>) =>
    api.put<{ message: string; settings: GamificationSettings }>('/admin/gamification/settings', data),

  // Tiers
  listTiers: () =>
    api.get<GamificationTier[]>('/admin/gamification/tiers'),

  createTier: (data: Partial<GamificationTier>) =>
    api.post<{ message: string; tier: GamificationTier }>('/admin/gamification/tiers', data),

  getTier: (tierId: string) =>
    api.get<GamificationTier>(`/admin/gamification/tiers/${tierId}`),

  updateTier: (tierId: string, data: Partial<GamificationTier>) =>
    api.put<{ message: string; tier: GamificationTier }>(`/admin/gamification/tiers/${tierId}`, data),

  deleteTier: (tierId: string) =>
    api.delete<{ message: string }>(`/admin/gamification/tiers/${tierId}`),

  // Point Rules
  listPointRules: () =>
    api.get<PointRule[]>('/admin/gamification/point-rules'),

  createPointRule: (data: Partial<PointRule>) =>
    api.post<{ message: string; rule: PointRule }>('/admin/gamification/point-rules', data),

  getPointRule: (ruleId: string) =>
    api.get<PointRule>(`/admin/gamification/point-rules/${ruleId}`),

  updatePointRule: (ruleId: string, data: Partial<PointRule>) =>
    api.put<{ message: string; rule: PointRule }>(`/admin/gamification/point-rules/${ruleId}`, data),

  deletePointRule: (ruleId: string) =>
    api.delete<{ message: string }>(`/admin/gamification/point-rules/${ruleId}`),

  togglePointRule: (ruleId: string) =>
    api.post<{ message: string; rule: PointRule }>(`/admin/gamification/point-rules/${ruleId}/toggle`),

  // Rewards
  listRewards: () =>
    api.get<Reward[]>('/admin/gamification/rewards'),

  createReward: (data: Partial<Reward>) =>
    api.post<{ message: string; reward: Reward }>('/admin/gamification/rewards', data),

  getReward: (rewardId: string) =>
    api.get<Reward>(`/admin/gamification/rewards/${rewardId}`),

  updateReward: (rewardId: string, data: Partial<Reward>) =>
    api.put<{ message: string; reward: Reward }>(`/admin/gamification/rewards/${rewardId}`, data),

  deleteReward: (rewardId: string) =>
    api.delete<{ message: string }>(`/admin/gamification/rewards/${rewardId}`),

  // Achievements
  listAchievements: () =>
    api.get<Achievement[]>('/admin/gamification/achievements'),

  createAchievement: (data: Partial<Achievement>) =>
    api.post<{ message: string; achievement: Achievement }>('/admin/gamification/achievements', data),

  getAchievement: (achievementId: string) =>
    api.get<Achievement>(`/admin/gamification/achievements/${achievementId}`),

  updateAchievement: (achievementId: string, data: Partial<Achievement>) =>
    api.put<{ message: string; achievement: Achievement }>(`/admin/gamification/achievements/${achievementId}`, data),

  deleteAchievement: (achievementId: string) =>
    api.delete<{ message: string }>(`/admin/gamification/achievements/${achievementId}`),

  // User Rewards Management
  listUserRewards: (params?: { status?: string; page?: number }) =>
    api.get<PaginatedResponse<UserReward>>('/admin/gamification/user-rewards', { params }),

  approveUserReward: (userRewardId: string) =>
    api.post<{ message: string; user_reward: UserReward }>(`/admin/gamification/user-rewards/${userRewardId}/approve`),

  deliverUserReward: (userRewardId: string) =>
    api.post<{ message: string; user_reward: UserReward }>(`/admin/gamification/user-rewards/${userRewardId}/deliver`),

  rejectUserReward: (userRewardId: string, reason?: string) =>
    api.post<{ message: string; user_reward: UserReward }>(`/admin/gamification/user-rewards/${userRewardId}/reject`, { reason }),

  updateUserReward: (userRewardId: string, data: { status: string }) =>
    api.put<{ message: string; user_reward: UserReward }>(`/admin/gamification/user-rewards/${userRewardId}`, data),

  // Stats
  getStats: () =>
    api.get<GamificationAdminStats>('/admin/gamification/stats'),
}

// =====================
// EXTERNAL INTEGRATIONS ENDPOINTS
// =====================
import type {
  ExternalIntegration,
  ExternalIntegrationMapping,
  ExternalIntegrationLog,
  IntegrationTemplate,
  IntegrationAvailableFields,
} from '@/types'

export const integrationsApi = {
  // List all integrations
  list: () =>
    api.get<ExternalIntegration[]>('/integrations'),

  // Get single integration
  get: (id: string) =>
    api.get<ExternalIntegration>(`/integrations/${id}`),

  // Create integration
  create: (data: Partial<ExternalIntegration> & { mapping?: Record<string, string> }) =>
    api.post<{ message: string; integration: ExternalIntegration }>('/integrations', data),

  // Update integration
  update: (id: string, data: Partial<ExternalIntegration>) =>
    api.put<{ message: string; integration: ExternalIntegration }>(`/integrations/${id}`, data),

  // Delete integration
  delete: (id: string) =>
    api.delete<{ message: string }>(`/integrations/${id}`),

  // Toggle active/inactive
  toggle: (id: string) =>
    api.post<{ message: string; integration: ExternalIntegration }>(`/integrations/${id}/toggle`),

  // Test connection
  test: (id: string) =>
    api.post<{ success: boolean; message: string; status_code?: number; response?: unknown }>(`/integrations/${id}/test`),

  // Get logs
  getLogs: (id: string, params?: { page?: number; status?: string }) =>
    api.get<PaginatedResponse<ExternalIntegrationLog>>(`/integrations/${id}/logs`, { params }),

  // Retry failed log
  retryLog: (integrationId: string, logId: string) =>
    api.post<{ message: string; log: ExternalIntegrationLog }>(`/integrations/${integrationId}/logs/${logId}/retry`),

  // Get mappings
  getMappings: (id: string) =>
    api.get<ExternalIntegrationMapping[]>(`/integrations/${id}/mappings`),

  // Save mapping
  saveMapping: (id: string, data: { model_type: string; mapping: Record<string, string> }) =>
    api.post<{ message: string; mapping: ExternalIntegrationMapping }>(`/integrations/${id}/mappings`, data),

  // Preview payload
  previewPayload: (id: string) =>
    api.post<{ mapping: Record<string, string>; payload: Record<string, unknown> }>(`/integrations/${id}/preview`),

  // Get templates
  getTemplates: () =>
    api.get<IntegrationTemplate[]>('/integrations/templates'),

  // Get available fields for mapping
  getAvailableFields: () =>
    api.get<IntegrationAvailableFields>('/integrations/available-fields'),
}

// =====================
// PROFILE/USER ENDPOINTS (for Linx fields)
// =====================
export const profileApi = {
  // Get current user profile
  get: () =>
    api.get<User>('/profile'),

  // Update profile
  update: (data: Partial<User>) =>
    api.put<{ message: string; user: User }>('/profile', data),

  // Change password
  changePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    api.post<{ message: string }>('/profile/change-password', data),
}

// =====================
// SUPER ADMIN ENDPOINTS
// =====================
export interface SuperAdminTenant {
  id: string
  name: string
  slug: string
  plan: string
  is_active: boolean
  created_at: string
  users_count?: number
  leads_count?: number
  channels_count?: number
}

export interface SuperAdminGroup {
  id: string
  name: string
  slug: string
  description?: string
  is_active: boolean
  created_at: string
  tenants_count?: number
  users_count?: number
  tenants?: Array<{ id: string; name: string; slug: string }>
  users?: Array<{ id: string; name: string; email: string; pivot?: { role: string } }>
}

export interface SuperAdminUser {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  tenant_id: string
  tenant?: { id: string; name: string }
  created_at: string
}

export const superAdminApi = {
  // Dashboard
  getDashboard: () =>
    api.get<{
      total_tenants: number
      active_tenants: number
      total_users: number
      total_leads: number
      tenants_by_plan: Record<string, number>
      recent_tenants: SuperAdminTenant[]
      recent_logs: any[]
    }>('/super-admin/dashboard'),

  // Tenants
  listTenants: (params?: { search?: string; plan?: string; is_active?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<SuperAdminTenant>>('/super-admin/tenants', { params }),

  createTenant: (data: {
    name: string
    slug?: string
    plan: string
    admin_name: string
    admin_email: string
    admin_password: string
    whatsapp_number?: string
    ia_enabled?: boolean
    features?: string[]
  }) =>
    api.post<{ message: string; tenant: SuperAdminTenant }>('/super-admin/tenants', data),

  getTenant: (id: string) =>
    api.get<{ tenant: SuperAdminTenant; features: Record<string, any>; stats: any }>(`/super-admin/tenants/${id}`),

  updateTenant: (id: string, data: Partial<SuperAdminTenant>) =>
    api.put<{ message: string; tenant: SuperAdminTenant }>(`/super-admin/tenants/${id}`, data),

  updateTenantFeatures: (id: string, features: Array<{ key: string; enabled: boolean; all_functions?: boolean; enabled_functions?: string[] }>) =>
    api.put<{ message: string; features: any }>(`/super-admin/tenants/${id}/features`, { features }),

  // Users
  listUsers: (params?: { search?: string; tenant_id?: string; role?: string; is_active?: boolean; page?: number }) =>
    api.get<PaginatedResponse<SuperAdminUser>>('/super-admin/users', { params }),

  createUser: (data: { tenant_id: string; name: string; email: string; password: string; role: string; phone?: string }) =>
    api.post<{ message: string; user: SuperAdminUser }>('/super-admin/users', data),

  updateUser: (id: string, data: Partial<SuperAdminUser & { password?: string }>) =>
    api.put<{ message: string; user: SuperAdminUser }>(`/super-admin/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete<{ message: string }>(`/super-admin/users/${id}`),

  // Groups
  listGroups: (params?: { search?: string; is_active?: boolean; page?: number; per_page?: number }) =>
    api.get<PaginatedResponse<SuperAdminGroup>>('/super-admin/groups', { params }),

  createGroup: (data: { name: string; description?: string; tenant_ids?: string[] }) =>
    api.post<{ message: string; group: SuperAdminGroup }>('/super-admin/groups', data),

  getGroup: (id: string) =>
    api.get<{ group: SuperAdminGroup }>(`/super-admin/groups/${id}`),

  updateGroup: (id: string, data: { name?: string; description?: string; is_active?: boolean }) =>
    api.put<{ message: string; group: SuperAdminGroup }>(`/super-admin/groups/${id}`, data),

  deleteGroup: (id: string) =>
    api.delete<{ message: string }>(`/super-admin/groups/${id}`),

  addTenantToGroup: (groupId: string, tenantId: string) =>
    api.post<{ message: string; group: SuperAdminGroup }>(`/super-admin/groups/${groupId}/tenants`, { tenant_id: tenantId }),

  removeTenantFromGroup: (groupId: string, tenantId: string) =>
    api.delete<{ message: string }>(`/super-admin/groups/${groupId}/tenants/${tenantId}`),

  addUserToGroup: (groupId: string, userId: string, role: 'owner' | 'admin' | 'viewer') =>
    api.post<{ message: string; group: SuperAdminGroup }>(`/super-admin/groups/${groupId}/users`, { user_id: userId, role }),

  removeUserFromGroup: (groupId: string, userId: string) =>
    api.delete<{ message: string }>(`/super-admin/groups/${groupId}/users/${userId}`),

  // Config
  listPermissions: () =>
    api.get<{ permissions: any; modules: string[] }>('/super-admin/permissions'),

  listFeatures: () =>
    api.get<{ features: any }>('/super-admin/features'),

  listPlans: () =>
    api.get<{ plans: Array<{ value: string; label: string; has_ia_sdr: boolean }> }>('/super-admin/plans'),

  // Logs
  listLogs: (params?: { action?: string; tenant_id?: string; date_from?: string; date_to?: string; page?: number }) =>
    api.get<PaginatedResponse<any>>('/super-admin/logs', { params }),
}

