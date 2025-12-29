import type { Block, GlobalSettings } from './landing-page-builder'

// Auth Types
export interface User {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  role: 'admin' | 'gestor' | 'vendedor'
  tenant_id: string
  is_active: boolean
  is_super_admin?: boolean
  // Campos de integracao Linx
  linx_empresa_id?: string
  linx_vendedor_id?: string
  linx_loja_id?: string
  linx_showroom_id?: string
  external_integrations?: Record<string, unknown>
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

// Tenant Types
export interface Tenant {
  id: string
  name: string
  slug: string
  plan: 'basic' | 'ia_sdr' | 'enterprise'
  settings?: Record<string, unknown>
  created_at: string
  // Campos Linx
  linx_enabled?: boolean
  linx_empresa_id?: string
  linx_revenda_id?: string
  linx_api_url?: string
}

// Pipeline Types
export interface Pipeline {
  id: string
  name: string
  is_default: boolean
  stages: PipelineStage[]
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  color: string
  order: number
  is_final: boolean
  is_won: boolean
  stage_type?: 'open' | 'won' | 'lost'
  slug?: string
}

// Lead Types
export interface Lead {
  id: string
  tenant_id: string
  contact_id: string
  pipeline_id: string
  stage_id: string
  channel_id?: string
  owner_id?: string
  status: 'novo' | 'em_atendimento' | 'qualificado' | 'perdido' | 'ganho'
  value?: number
  name?: string
  phone?: string
  expected_close_date?: string
  title?: string
  notes?: string
  interaction_source?: string
  last_interaction_at?: string
  created_at: string
  updated_at: string
  contact?: Contact
  stage?: PipelineStage
  owner?: User
  channel?: Channel
  // Notification fields
  unread_messages?: number
  has_new_message?: boolean
  last_message_at?: string
}

// Contact Types
export interface Contact {
  id: string
  tenant_id: string
  name: string
  email?: string
  phone?: string
  profile_picture_url?: string
  cpf?: string
  cpf_cnpj?: string
  company?: string
  address?: string
  city?: string
  state?: string
  notes?: string
  custom_fields?: Record<string, unknown>
  extra_data?: Record<string, unknown>
  created_at: string
}

// Channel Types
export interface Channel {
  id: string
  tenant_id: string
  name: string
  type: 'whatsapp' | 'instagram' | 'facebook' | 'email' | 'telefone' | 'chat_site' | 'outros'
  identifier?: string
  ia_mode: 'desativado' | 'sugestao' | 'automatico'
  is_active: boolean
}

// WhatsApp Template Types
export type WhatsAppTemplateCategory = 'MARKETING' | 'AUTHENTICATION' | 'UTILITY'

export type WhatsAppTemplateStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAUSED'
  | 'DISABLED'
  | 'IN_APPEAL'
  | 'PENDING_DELETION'
  | 'DELETED'
  | 'LIMIT_EXCEEDED'

export interface WhatsAppTemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE'
  text?: string
  url?: string
  phone_number?: string
  example?: string
}

export interface WhatsAppTemplate {
  id: string
  tenant_id: string
  channel_id: string
  name: string
  category: WhatsAppTemplateCategory
  language: string
  header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'NONE'
  header_text?: string
  header_handle?: string
  body_text: string
  footer_text?: string
  buttons?: WhatsAppTemplateButton[]
  meta_template_id?: string
  status: WhatsAppTemplateStatus
  rejection_reason?: string
  request_payload?: Record<string, unknown>
  response_payload?: Record<string, unknown>
  is_active: boolean
  submitted_at?: string
  approved_at?: string
  created_at: string
  updated_at: string
  channel?: Channel
}

export interface WhatsAppTemplateCategoryOption {
  value: WhatsAppTemplateCategory
  label: string
  description: string
}

export interface WhatsAppTemplateStatusOption {
  value: WhatsAppTemplateStatus
  label: string
  description: string
  color: string
  can_send: boolean
}

export interface WhatsAppTemplateStats {
  total: number
  approved: number
  pending: number
  rejected: number
  by_category: {
    MARKETING: number
    UTILITY: number
    AUTHENTICATION: number
  }
}

export interface CreateWhatsAppTemplateData {
  channel_id: string
  name: string
  category: WhatsAppTemplateCategory
  language?: string
  header_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'NONE'
  header_text?: string
  header_handle?: string
  body_text: string
  footer_text?: string
  buttons?: WhatsAppTemplateButton[]
}

// Ticket Types
export interface Ticket {
  id: string
  tenant_id: string
  contact_id: string
  lead_id?: string
  channel_id: string
  assigned_to?: string
  status: 'aberto' | 'em_atendimento' | 'aguardando_cliente' | 'finalizado'
  subject?: string
  created_at: string
  updated_at: string
  contact?: Contact
  lead?: Lead
  channel?: Channel
  assignee?: User
  messages?: TicketMessage[]
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_type: 'contact' | 'user' | 'ia'
  sender_id?: string
  direction: 'inbound' | 'outbound'
  message: string
  metadata?: Record<string, unknown>
  sent_at: string
  created_at: string
}

// Task Types
export interface Task {
  id: string
  tenant_id: string
  lead_id?: string
  contact_id?: string
  assigned_to?: string
  type: 'ligacao' | 'reuniao' | 'email' | 'whatsapp' | 'visita' | 'outros'
  title: string
  description?: string
  due_date?: string
  status: 'pendente' | 'concluida' | 'cancelada'
  created_at: string
}

// Lead Import Types
export interface LeadImport {
  id: string
  tenant_id: string
  user_id: string
  pipeline_id: string
  stage_id?: string
  filename: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_rows: number
  processed_rows: number
  success_count: number
  error_count: number
  errors?: { row: number; message: string }[]
  settings?: {
    distribute_leads?: boolean
    skip_duplicates?: boolean
    original_filename?: string
  }
  started_at?: string
  completed_at?: string
  created_at: string
  updated_at: string
  // Relations
  user?: User
  pipeline?: Pipeline
  stage?: PipelineStage
}

// Activity Types
export interface LeadActivity {
  id: string
  lead_id: string
  user_id?: string
  type: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
  user?: User
}

// Group Types (Multi-tenant)
export interface Group {
  id: string
  name: string
  description?: string
  tenants?: Tenant[]
  users?: GroupUser[]
}

export interface GroupUser {
  id: string
  name: string
  email: string
  pivot: {
    role: 'owner' | 'admin' | 'viewer'
  }
}

// Report Types
export interface FunnelReport {
  stage_name: string
  total_leads: number
  total_value: number
}

export interface ProductivityReport {
  user_id: string
  user_name: string
  total_leads: number
  won_leads: number
  lost_leads: number
  total_value: number
  conversion_rate: number
}

// Product Types
export interface ProductCategory {
  id: string
  tenant_id: string
  name: string
  slug: string
  description?: string
  image?: string
  order: number
  is_active: boolean
  products_count?: number
  created_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  path: string
  url: string
  alt?: string
  order: number
  is_primary: boolean
}

export interface Product {
  id: string
  tenant_id: string
  category_id?: string
  name: string
  slug: string
  sku?: string
  description?: string
  short_description?: string
  specifications?: Record<string, string>
  price: number
  promotional_price?: number
  cost_price?: number
  stock: number
  track_stock: boolean
  is_active: boolean
  show_on_landing_page: boolean
  order: number
  created_at: string
  updated_at: string
  category?: ProductCategory
  images?: ProductImage[]
  primary_image_url?: string
  current_price?: number
  is_on_sale?: boolean
  discount_percent?: number
}

export interface LeadProduct {
  id: string
  lead_id: string
  product_id: string
  quantity: number
  unit_price: number
  notes?: string
  product?: Product
}

export interface CustomerData {
  id: string
  lead_id: string
  cpf?: string
  cnpj?: string
  rg?: string
  birth_date?: string
  address?: string
  address_number?: string
  address_complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zip_code?: string
  payment_method?: string
  installments?: number
  notes?: string
}

// Landing Page Types
export interface LandingPage {
  id: string
  tenant_id: string
  name: string
  slug: string
  title: string
  description?: string
  logo?: string
  background_image?: string
  primary_color: string
  secondary_color: string
  text_color: string
  theme: 'modern' | 'minimal' | 'bold' | 'elegant'
  hero_title?: string
  hero_subtitle?: string
  cta_text: string
  cta_button_color: string
  show_products: boolean
  show_testimonials: boolean
  show_faq: boolean
  show_contact_info: boolean
  testimonials?: Testimonial[]
  faq?: FAQ[]
  contact_info?: ContactInfo
  form_fields?: FormField[]
  blocks?: Block[]
  global_settings?: GlobalSettings
  success_message: string
  redirect_url?: string
  meta_title?: string
  meta_description?: string
  og_image?: string
  facebook_pixel?: string
  google_analytics?: string
  gtm_id?: string
  default_pipeline_id?: string
  default_stage_id?: string
  default_channel_id?: string
  is_active: boolean
  published_at?: string
  views_count: number
  leads_count: number
  created_at: string
  updated_at: string
  products?: Product[]
  url?: string
  conversion_rate?: number
}


export interface Testimonial {
  name: string
  role?: string
  content: string
  image?: string
  rating?: number
}

export interface FAQ {
  question: string
  answer: string
}

export interface ContactInfo {
  phone?: string
  email?: string
  whatsapp?: string
  address?: string
}

export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea'
  required: boolean
  options?: string[]
}

export interface LandingPageStats {
  summary: {
    total_views: number
    total_leads: number
    conversion_rate: number
  }
  daily: {
    date: string
    views: number
    leads: number
    conversion_rate: number
  }[]
}

// SDR Agent Types
export interface SdrAgent {
  id: string
  tenant_id: string
  channel_id?: string
  name: string
  type: 'sdr' | 'support'
  avatar?: string
  description?: string
  system_prompt: string
  personality?: string
  objectives?: string
  restrictions?: string
  knowledge_instructions?: string
  settings?: Record<string, unknown>
  language: string
  tone: 'professional' | 'friendly' | 'formal' | 'casual'
  webhook_url?: string
  ai_model: string
  temperature: number
  is_active: boolean
  last_used_at?: string
  created_at: string
  updated_at: string
  channel?: Channel
  documents_count?: number
  faqs_count?: number
  interactions_count?: number
}

export interface SdrDocument {
  id: string
  sdr_agent_id: string
  uploaded_by?: string
  name: string
  original_filename: string
  file_path: string
  file_type: string
  file_size: number
  content?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  processed_at?: string
  is_active: boolean
  created_at: string
  uploader?: User
  formatted_size?: string
}

export interface SdrFaq {
  id: string
  sdr_agent_id: string
  question: string
  answer: string
  keywords?: string[]
  priority: number
  is_active: boolean
  created_at: string
}

export interface SdrKnowledgeEntry {
  id: string
  sdr_agent_id: string
  title: string
  content: string
  category?: string
  tags?: string[]
  is_active: boolean
  created_at: string
}

export interface SdrAgentStats {
  total_interactions: number
  interactions_today: number
  avg_response_time: number | null
  positive_feedback: number
  negative_feedback: number
}

// Appointment Types
export interface Appointment {
  id: string
  tenant_id: string
  lead_id: string
  contact_id: string
  user_id: string
  scheduled_by?: string
  type: 'meeting' | 'visit' | 'demo' | 'follow_up' | 'other'
  scheduled_at: string
  ends_at?: string
  duration_minutes: number
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
  title?: string
  description?: string
  location?: string
  meeting_link?: string
  reminder_sent: boolean
  reminder_sent_at?: string
  confirmation_received: boolean
  confirmed_at?: string
  notes?: string
  outcome?: string
  rescheduled_from?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  lead?: Lead
  contact?: Contact
  user?: User
  scheduled_by_user?: User
}

export interface UserSchedule {
  id: string
  tenant_id: string
  user_id: string
  day_of_week: number
  start_time: string
  end_time: string
  break_start?: string
  break_end?: string
  slot_duration: number
  is_active: boolean
  created_at: string
  updated_at: string
  day_name?: string
}

export interface ScheduledTask {
  id: string
  tenant_id: string
  lead_id?: string
  appointment_id?: string
  ticket_id?: string
  type: 'appointment_reminder' | 'appointment_confirmation' | 'follow_up' | 'custom_message'
  scheduled_for: string
  message: string
  channel: 'whatsapp' | 'email' | 'sms'
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  sent_at?: string
  error_message?: string
  retry_count: number
  created_at: string
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// =============================================================================
// STAGE ACTIVITY TYPES (Atividades por Etapa)
// =============================================================================
export type StageActivityType = 'call' | 'email' | 'meeting' | 'task' | 'demo' | 'follow_up'
export type StageActivityStatus = 'pending' | 'completed' | 'skipped'

export interface StageActivityTemplate {
  id: string
  tenant_id: string
  pipeline_id: string
  stage_id: string
  title: string
  description?: string
  activity_type: StageActivityType
  is_required: boolean
  order: number
  default_duration_minutes?: number
  due_days?: number
  points: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
  creator?: User
}

export interface DealStageActivity {
  id: string
  tenant_id: string
  lead_id: string
  stage_id: string
  template_id?: string
  title: string
  description?: string
  activity_type: StageActivityType
  is_required: boolean
  status: StageActivityStatus
  due_at?: string
  completed_at?: string
  completed_by?: string
  points_earned: number
  created_at: string
  updated_at: string
  template?: StageActivityTemplate
  stage?: PipelineStage
  lead?: Lead
  completed_by_user?: User
}

export interface StageProgress {
  total: number
  completed: number
  pending: number
  skipped: number
  required_total: number
  required_completed: number
  required_pending: number
  percentage: number
  can_advance: boolean
}

export interface CanAdvanceResult {
  can_advance: boolean
  pending_required_count: number
  pending_required: DealStageActivity[]
}

// =============================================================================
// GAMIFICATION TYPES (Pontos, Tiers, Conquistas, Ranking)
// =============================================================================
export interface GamificationTier {
  id: string
  tenant_id: string
  name: string
  slug: string
  icon?: string
  color: string
  min_points: number
  max_points?: number
  order: number
  benefits?: string[]
  is_active: boolean
  created_at: string
}

export interface PointRule {
  id: string
  tenant_id: string
  action_type: string
  name: string
  description?: string
  points: number
  multiplier: number
  conditions?: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export interface PointTransaction {
  id: string
  tenant_id: string
  user_id: string
  action: string
  points: number
  balance_after: number
  reference_type?: string
  reference_id?: string
  description?: string
  metadata?: Record<string, unknown>
  created_at: string
  user?: User
}

export interface UserPoints {
  id: string
  tenant_id: string
  user_id: string
  period: string
  total_points: number
  current_tier_id?: string
  rank?: number
  activities_completed: number
  deals_won: number
  deals_value: number
  created_at: string
  updated_at: string
  user?: User
  tier?: GamificationTier
}

export interface Reward {
  id: string
  tenant_id: string
  tier_id?: string
  name: string
  description?: string
  image?: string
  reward_type: 'physical' | 'digital' | 'experience' | 'badge'
  value?: number
  points_cost?: number
  stock?: number
  is_active: boolean
  created_at: string
  tier?: GamificationTier
}

export interface UserReward {
  id: string
  tenant_id: string
  user_id: string
  reward_id: string
  status: 'pending' | 'approved' | 'delivered' | 'rejected'
  claimed_at: string
  approved_at?: string
  approved_by?: string
  delivered_at?: string
  rejected_at?: string
  rejection_reason?: string
  notes?: string
  created_at: string
  user?: User
  reward?: Reward
  approver?: User
}

export interface Achievement {
  id: string
  tenant_id: string
  name: string
  description?: string
  icon: string
  condition_type: string
  condition_value: Record<string, unknown>
  points_bonus: number
  is_active: boolean
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  earned_at: string
  progress?: number
  created_at: string
  achievement?: Achievement
}

export interface GamificationSettings {
  id: string
  tenant_id: string
  is_enabled: boolean
  show_leaderboard: boolean
  show_points_to_users: boolean
  notify_tier_change: boolean
  notify_achievements: boolean
  reset_period: 'monthly' | 'quarterly' | 'yearly' | 'never'
  created_at: string
  updated_at: string
}

export interface UserGamificationStats {
  user: User
  current_period: UserPoints
  tier: GamificationTier | null
  next_tier: GamificationTier | null
  points_to_next_tier: number
  recent_transactions: PointTransaction[]
  achievements: UserAchievement[]
  available_rewards: Reward[]
  rank: number
}

export interface LeaderboardEntry {
  rank: number
  user: User
  total_points: number
  tier: GamificationTier | null
  activities_completed: number
  deals_won: number
  deals_value: number
}

export interface GamificationAdminStats {
  total_users: number
  active_users: number
  total_points_awarded: number
  total_rewards_claimed: number
  pending_rewards: number
  tiers_distribution: {
    tier: GamificationTier
    count: number
  }[]
}

// =============================================================================
// EXTERNAL INTEGRATION TYPES (Integracoes Externas - Linx, Webhooks, ERPs)
// =============================================================================
export type AuthType = 'none' | 'basic' | 'bearer' | 'api_key' | 'linx_smart'
export type IntegrationType = 'erp' | 'crm' | 'sales_system' | 'other'
export type IntegrationStatus = 'success' | 'error'
export type TriggerEvent = 'lead_created' | 'lead_stage_changed' | 'lead_owner_assigned'

export interface ExternalIntegration {
  id: string
  tenant_id: string
  name: string
  slug?: string
  description?: string
  type: IntegrationType
  endpoint_url: string
  http_method: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  auth_type: AuthType
  auth_config?: {
    // Basic Auth
    username?: string
    password?: string
    // Bearer Token
    token?: string
    // API Key
    header_name?: string
    key?: string
    // Linx Smart API
    subscription_key?: string
    ambiente?: string
    cnpj_empresa?: string
  }
  trigger_on?: TriggerEvent[]
  trigger_stages?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  mappings?: ExternalIntegrationMapping[]
  logs_count?: number
  last_sync_at?: string
  last_sync_status?: IntegrationStatus
}

export interface ExternalIntegrationMapping {
  id: string
  tenant_id: string
  integration_id: string
  model_type: 'Lead' | 'Contact'
  mapping: Record<string, string>
  created_at: string
  updated_at: string
}

export interface ExternalIntegrationLog {
  id: string
  tenant_id: string
  integration_id: string
  model_type: string
  model_id: string
  status: IntegrationStatus
  request_payload: Record<string, unknown>
  response_payload: Record<string, unknown>
  executed_at: string
  created_at: string
}

export interface IntegrationTemplate {
  id: string
  name: string
  description: string
  type: IntegrationType
  trigger_on: TriggerEvent[]
  auth_type: AuthType
  mapping: Record<string, string>
}

export interface IntegrationAvailableFields {
  lead: Record<string, string>
  contact: Record<string, string>
  owner: Record<string, string>
  pipeline: Record<string, string>
  channel: Record<string, string>
  tenant: Record<string, string>
}

// =============================================================================
// QUICK REPLIES (Respostas Rápidas)
// =============================================================================
export interface QuickReply {
  id: string
  tenant_id: string
  user_id: string
  title: string
  shortcut: string
  content: string
  variables?: string[]
  is_active: boolean
  use_count: number
  order: number
  created_at: string
  updated_at: string
}

export interface QuickReplyVariable {
  key: string
  description: string
}
