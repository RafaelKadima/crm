import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

export interface ChannelConfig {
  phone_number_id?: string
  access_token?: string
  business_account_id?: string
  page_id?: string
  instagram_account_id?: string
}

export interface Channel {
  id: string
  tenant_id: string
  name: string
  type: 'whatsapp' | 'instagram' | 'webchat' | 'other'
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

