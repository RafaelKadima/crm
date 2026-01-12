import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

export interface ChannelConfig {
  // Meta Cloud API fields
  phone_number_id?: string
  waba_id?: string // WhatsApp Business Account ID
  access_token?: string
  business_account_id?: string
  page_id?: string
  instagram_account_id?: string
  // Internal WhatsApp API fields
  internal_connected?: boolean
  internal_phone_number?: string
  connected_at?: string
  disconnected_at?: string
  qr_ready_at?: string
}

export type WhatsAppProviderType = 'meta' | 'internal'

export interface WhatsAppProvider {
  type: WhatsAppProviderType
  label: string
  description: string
  supports_templates: boolean
  requires_qr: boolean
}

export interface Channel {
  id: string
  tenant_id: string
  name: string
  type: 'whatsapp' | 'instagram' | 'webchat' | 'other'
  provider_type?: WhatsAppProviderType
  internal_session_id?: string
  identifier: string
  ia_mode: 'none' | 'ia_sdr' | 'enterprise'
  ia_workflow_id?: string
  config?: ChannelConfig
  is_active: boolean
  leads_count?: number
  tickets_count?: number
  queue_menu_enabled?: boolean
  queue_menu_header?: string
  queue_menu_footer?: string
  queue_menu_invalid_response?: string
  return_timeout_hours?: number // Timeout para retorno direto ao atendente (padrão 24h)
  created_at: string
  updated_at: string
}

interface CreateChannelData {
  name: string
  type: string
  provider_type?: WhatsAppProviderType
  identifier: string
  ia_mode?: string
  ia_workflow_id?: string
  config?: ChannelConfig
  is_active?: boolean
}

interface UpdateChannelData extends Partial<CreateChannelData> {
  id: string
}

interface TestConnectionResult {
  success: boolean
  message: string
  data?: Record<string, any>
}

// Fetch all channels
export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const response = await api.get<Channel[]>('/channels')
      return response.data
    },
  })
}

// Fetch single channel
export function useChannel(id: string) {
  return useQuery({
    queryKey: ['channels', id],
    queryFn: async () => {
      const response = await api.get<Channel>(`/channels/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

// Create channel
export function useCreateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateChannelData) => {
      const response = await api.post('/channels', data)
      return response.data.channel as Channel
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

// Update channel
export function useUpdateChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateChannelData) => {
      const response = await api.put(`/channels/${id}`, data)
      return response.data.channel as Channel
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.setQueryData(['channels', channel.id], channel)
    },
  })
}

// Delete channel
export function useDeleteChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/channels/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

// Test channel connection
export function useTestChannelConnection() {
  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post<TestConnectionResult>(`/channels/${channelId}/test-connection`)
      return response.data
    },
  })
}

// Update IA mode
export function useUpdateChannelIaMode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ channelId, iaMode, iaWorkflowId, sdrAgentId }: { 
      channelId: string
      iaMode: string
      iaWorkflowId?: string
      sdrAgentId?: string
    }) => {
      const response = await api.put(`/channels/${channelId}/ia-mode`, {
        ia_mode: iaMode,
        ia_workflow_id: iaWorkflowId,
        sdr_agent_id: sdrAgentId,
      })
      return response.data.channel as Channel
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.setQueryData(['channels', channel.id], channel)
    },
  })
}

// Toggle channel active
export function useToggleChannelActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post(`/channels/${channelId}/toggle-active`)
      return response.data.channel as Channel
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.setQueryData(['channels', channel.id], channel)
    },
  })
}

// Channel type labels and icons
export const channelTypeInfo = {
  whatsapp: {
    label: 'WhatsApp',
    color: 'bg-green-500',
    description: 'WhatsApp Business API',
  },
  instagram: {
    label: 'Instagram',
    color: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    description: 'Instagram Direct Messages',
  },
  webchat: {
    label: 'Webchat',
    color: 'bg-blue-500',
    description: 'Chat do Website',
  },
  other: {
    label: 'Outro',
    color: 'bg-gray-500',
    description: 'Canal personalizado',
  },
}

// IA Mode labels
export const iaModeInfo = {
  none: {
    label: 'Sem IA',
    description: 'Atendimento 100% humano',
    color: 'bg-gray-500',
  },
  ia_sdr: {
    label: 'IA SDR',
    description: 'IA faz qualificação inicial',
    color: 'bg-purple-500',
  },
  enterprise: {
    label: 'Enterprise',
    description: 'IA avançada com workflows',
    color: 'bg-blue-500',
  },
}

// WhatsApp Provider info
export const whatsappProviderInfo: Record<WhatsAppProviderType, {
  label: string
  description: string
  supports_templates: boolean
  requires_qr: boolean
}> = {
  meta: {
    label: 'Meta Cloud API',
    description: 'WhatsApp Business API oficial da Meta',
    supports_templates: true,
    requires_qr: false,
  },
  internal: {
    label: 'WhatsApp Interno',
    description: 'Conexao via QR Code (sem custos Meta)',
    supports_templates: false,
    requires_qr: true,
  },
}

// =========================================================================
// INTERNAL WHATSAPP API HOOKS
// =========================================================================

export interface InternalSessionStatus {
  status: string
  connected: boolean
  phone_number?: string
  session_id?: string
  provider?: string
  error?: string
  channel_config?: {
    internal_connected: boolean
    internal_phone_number?: string
    connected_at?: string
  }
}

export interface InternalConnectResult {
  status: 'qr_ready' | 'already_connected' | 'connecting' | 'error'
  qr_code?: string // Base64 PNG
  phone_number?: string
  error?: string
}

// Fetch available WhatsApp providers
export function useWhatsAppProviders() {
  return useQuery({
    queryKey: ['whatsapp-providers'],
    queryFn: async () => {
      const response = await api.get<{ providers: WhatsAppProvider[] }>('/whatsapp/providers')
      return response.data.providers
    },
  })
}

// Create internal WhatsApp session
export function useCreateInternalSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post('/whatsapp/internal/session', { channel_id: channelId })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })
}

// Connect internal session and get QR code
export function useConnectInternalSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post<InternalConnectResult>(`/whatsapp/channels/${channelId}/internal/connect`)
      return response.data
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['internal-status', channelId] })
    },
  })
}

// Get current QR code for internal session
export function useInternalQRCode(channelId: string, enabled: boolean = false) {
  return useQuery({
    queryKey: ['internal-qr', channelId],
    queryFn: async () => {
      const response = await api.get<InternalConnectResult>(`/whatsapp/channels/${channelId}/internal/qr`)
      return response.data
    },
    enabled: enabled && !!channelId,
    refetchInterval: enabled ? 5000 : false, // Poll every 5 seconds while enabled
  })
}

// Get internal session status
export function useInternalStatus(channelId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['internal-status', channelId],
    queryFn: async () => {
      const response = await api.get<InternalSessionStatus>(`/whatsapp/channels/${channelId}/internal/status`)
      return response.data
    },
    enabled: enabled && !!channelId,
    refetchInterval: enabled ? 10000 : false, // Poll every 10 seconds
  })
}

// Disconnect internal session
export function useDisconnectInternalSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.post(`/whatsapp/channels/${channelId}/internal/disconnect`)
      return response.data
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['internal-status', channelId] })
    },
  })
}

// Delete internal session completely
export function useDeleteInternalSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await api.delete(`/whatsapp/channels/${channelId}/internal/session`)
      return response.data
    },
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      queryClient.invalidateQueries({ queryKey: ['internal-status', channelId] })
    },
  })
}

