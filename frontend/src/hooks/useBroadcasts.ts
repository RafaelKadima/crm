import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { broadcastsApi } from '@/api/endpoints'

export const useBroadcasts = (params?: {
  status?: string
  search?: string
  page?: number
  per_page?: number
}) => {
  return useQuery({
    queryKey: ['broadcasts', params],
    queryFn: async () => {
      const response = await broadcastsApi.list(params)
      return response.data
    },
  })
}

export const useBroadcast = (id: string | null) => {
  return useQuery({
    queryKey: ['broadcast', id],
    queryFn: async () => {
      const response = await broadcastsApi.show(id!)
      return response.data
    },
    enabled: !!id,
    // Poll every 5s when broadcast is sending
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'SENDING' ? 5000 : false
    },
  })
}

export const useCreateBroadcast = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string
      channel_id: string
      whatsapp_template_id: string
      filters?: Record<string, any>
      template_variables?: Array<{ index: number; field: string }>
    }) => {
      const response = await broadcastsApi.create(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
    },
  })
}

export const useStartBroadcast = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await broadcastsApi.start(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
    },
  })
}

export const usePauseBroadcast = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await broadcastsApi.pause(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
    },
  })
}

export const useCancelBroadcast = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await broadcastsApi.cancel(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
    },
  })
}

export const useDeleteBroadcast = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await broadcastsApi.delete(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
    },
  })
}

export const useBroadcastPreview = () => {
  return useMutation({
    mutationFn: async (filters: Record<string, any>) => {
      const response = await broadcastsApi.preview(filters)
      return response.data
    },
  })
}
