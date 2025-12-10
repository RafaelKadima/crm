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

