import api from './axios'

// Types
export interface SupportSession {
  id: string
  user_id: string
  title: string | null
  summary: string | null
  status: 'active' | 'completed' | 'archived'
  context: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  last_message_at: string | null
  created_at: string
  updated_at: string
  messages?: SupportMessage[]
  actions?: SupportAction[]
  messages_count?: number
  actions_count?: number
}

export interface SupportMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls: ToolCall[] | null
  metadata: Record<string, unknown> | null
  input_tokens: number | null
  output_tokens: number | null
  created_at: string
}

export interface ToolCall {
  tool: string
  arguments: Record<string, unknown>
  result: Record<string, unknown> | null
  success: boolean
  execution_time_ms: number | null
}

export interface SupportAction {
  id: string
  session_id: string
  tool_name: string
  arguments: Record<string, unknown> | null
  result: Record<string, unknown> | null
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed'
  requires_approval: boolean
  dangerous: boolean
  error_message: string | null
  execution_time_ms: number | null
  approved_at: string | null
  executed_at: string | null
  created_at: string
}

export type ChatResponse = {
  message: SupportMessage
  tool_calls: ToolCall[]
  pending_approvals: SupportAction[]
  iterations: number
}

// API Functions
export const supportAgentApi = {
  // Sessions
  getSessions: async () => {
    const response = await api.get<{ data: SupportSession[] }>('/super-admin/support/sessions')
    return response.data
  },

  createSession: async (title?: string) => {
    const response = await api.post<{ session: SupportSession }>('/super-admin/support/sessions', { title })
    return response.data.session
  },

  getSession: async (sessionId: string) => {
    const response = await api.get<{ session: SupportSession }>(`/super-admin/support/sessions/${sessionId}`)
    return response.data.session
  },

  completeSession: async (sessionId: string, summary?: string) => {
    const response = await api.post<{ session: SupportSession }>(`/super-admin/support/sessions/${sessionId}/complete`, { summary })
    return response.data.session
  },

  // Chat
  sendMessage: async (sessionId: string, message: string) => {
    const response = await api.post<ChatResponse>(`/super-admin/support/sessions/${sessionId}/chat`, { message })
    return response.data
  },

  // Actions
  approveAction: async (actionId: string) => {
    const response = await api.post<{ action: SupportAction }>(`/super-admin/support/actions/${actionId}/approve`)
    return response.data.action
  },

  rejectAction: async (actionId: string) => {
    const response = await api.post<{ action: SupportAction }>(`/super-admin/support/actions/${actionId}/reject`)
    return response.data.action
  },
}
