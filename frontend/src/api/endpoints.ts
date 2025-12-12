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
  list: (params?: { page?: number; status?: string; stage_id?: string; owner_id?: string }) =>
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
  list: (params?: { page?: number; search?: string }) =>
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

