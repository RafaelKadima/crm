import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

export interface Queue {
  id: string
  tenant_id: string
  channel_id: string
  pipeline_id: string
  sdr_agent_id?: string
  sdr_disabled?: boolean
  name: string
  menu_option: number
  menu_label: string
  welcome_message?: string
  auto_distribute: boolean
  is_active: boolean
  leads_count?: number
  users_count?: number
  leads_waiting?: number
  channel?: {
    id: string
    name: string
    type: string
  }
  pipeline?: {
    id: string
    name: string
  }
  sdr_agent?: {
    id: string
    name: string
  }
  users?: Array<{
    id: string
    name: string
    email: string
    pivot?: {
      is_active: boolean
      priority: number
    }
  }>
  created_at: string
  updated_at: string
}

interface CreateQueueData {
  channel_id: string
  pipeline_id: string
  sdr_agent_id?: string
  sdr_disabled?: boolean
  name: string
  menu_option: number
  menu_label: string
  welcome_message?: string
  auto_distribute?: boolean
  is_active?: boolean
  user_ids?: string[]
}

interface UpdateQueueData extends Partial<Omit<CreateQueueData, 'channel_id'>> {
  id: string
}

interface QueueStats {
  queue_id: string
  name: string
  leads_count: number
  users_count: number
  leads_waiting: number
  auto_distribute: boolean
}

// Fetch all queues
export function useQueues(channelId?: string) {
  return useQuery({
    queryKey: ['queues', channelId],
    queryFn: async () => {
      const params = channelId ? { channel_id: channelId } : {}
      const response = await api.get<{ data: Queue[] }>('/queues', { params })
      return response.data.data
    },
  })
}

// Fetch queues for a specific channel
export function useChannelQueues(channelId: string) {
  return useQuery({
    queryKey: ['queues', 'channel', channelId],
    queryFn: async () => {
      const response = await api.get<{
        data: Queue[]
        menu_preview: string
        stats: QueueStats[]
      }>(`/channels/${channelId}/queues`)
      return response.data
    },
    enabled: !!channelId,
  })
}

// Fetch single queue
export function useQueue(id: string) {
  return useQuery({
    queryKey: ['queues', id],
    queryFn: async () => {
      const response = await api.get<Queue>(`/queues/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

// Create queue
export function useCreateQueue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateQueueData) => {
      const response = await api.post<{ queue: Queue }>('/queues', data)
      return response.data.queue
    },
    onSuccess: (queue) => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      queryClient.invalidateQueries({ queryKey: ['queues', 'channel', queue.channel_id] })
    },
  })
}

// Update queue
export function useUpdateQueue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateQueueData) => {
      const response = await api.put<{ queue: Queue }>(`/queues/${id}`, data)
      return response.data.queue
    },
    onSuccess: (queue) => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      queryClient.invalidateQueries({ queryKey: ['queues', queue.id] })
      queryClient.invalidateQueries({ queryKey: ['queues', 'channel', queue.channel_id] })
    },
  })
}

// Delete queue
export function useDeleteQueue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/queues/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] })
    },
  })
}

// Add users to queue
export function useAddQueueUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ queueId, userIds }: { queueId: string; userIds: string[] }) => {
      const response = await api.post<{ queue: Queue }>(`/queues/${queueId}/users`, {
        user_ids: userIds,
      })
      return response.data.queue
    },
    onSuccess: (queue) => {
      queryClient.invalidateQueries({ queryKey: ['queues', queue.id] })
      queryClient.invalidateQueries({ queryKey: ['queues', 'channel', queue.channel_id] })
    },
  })
}

// Remove users from queue
export function useRemoveQueueUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ queueId, userIds }: { queueId: string; userIds: string[] }) => {
      const response = await api.delete<{ queue: Queue }>(`/queues/${queueId}/users`, {
        data: { user_ids: userIds },
      })
      return response.data.queue
    },
    onSuccess: (queue) => {
      queryClient.invalidateQueries({ queryKey: ['queues', queue.id] })
      queryClient.invalidateQueries({ queryKey: ['queues', 'channel', queue.channel_id] })
    },
  })
}

// Sync users (replace all)
export function useSyncQueueUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ queueId, userIds }: { queueId: string; userIds: string[] }) => {
      const response = await api.put<{ queue: Queue }>(`/queues/${queueId}/users/sync`, {
        user_ids: userIds,
      })
      return response.data.queue
    },
    onSuccess: (queue) => {
      queryClient.invalidateQueries({ queryKey: ['queues', queue.id] })
      queryClient.invalidateQueries({ queryKey: ['queues', 'channel', queue.channel_id] })
    },
  })
}

// Toggle auto-distribute
export function useToggleAutoDistribute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (queueId: string) => {
      const response = await api.post<{ auto_distribute: boolean }>(
        `/queues/${queueId}/toggle-auto-distribute`
      )
      return response.data
    },
    onSuccess: (_, queueId) => {
      queryClient.invalidateQueries({ queryKey: ['queues', queueId] })
      queryClient.invalidateQueries({ queryKey: ['queues'] })
    },
  })
}

// Distribute waiting leads
export function useDistributeWaitingLeads() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (queueId: string) => {
      const response = await api.post<{ distributed: number; message: string }>(
        `/queues/${queueId}/distribute-waiting`
      )
      return response.data
    },
    onSuccess: (_, queueId) => {
      queryClient.invalidateQueries({ queryKey: ['queues', queueId] })
      queryClient.invalidateQueries({ queryKey: ['queues'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// Reorder menu
export function useReorderQueueMenu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      channelId,
      order,
    }: {
      channelId: string
      order: Array<{ queue_id: string; menu_option: number }>
    }) => {
      const response = await api.post<{ menu_preview: string }>(
        `/channels/${channelId}/queues/reorder`,
        { order }
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['queues', 'channel', variables.channelId] })
    },
  })
}

