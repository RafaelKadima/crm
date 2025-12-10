import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

export interface TransferOptions {
  current_queue: {
    id: string
    name: string
  } | null
  current_owner: {
    id: string
    name: string
  } | null
  same_queue_users: Array<{
    id: string
    name: string
    email: string
  }>
  other_queues: Array<{
    id: string
    name: string
    pipeline: string
    users_count: number
    auto_distribute: boolean
  }>
  existing_ownerships: Array<{
    queue_id: string
    queue_name: string
    user_id: string
    user_name: string
    assigned_at: string
  }>
}

// Buscar opções de transferência
export function useTransferOptions(ticketId: string | null) {
  return useQuery<TransferOptions>({
    queryKey: ['transfer-options', ticketId],
    queryFn: async () => {
      const { data } = await api.get(`/tickets/${ticketId}/transfer-options`)
      return data
    },
    enabled: !!ticketId,
  })
}

// Transferir para usuário (mesma fila)
export function useTransferToUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { data } = await api.put(`/tickets/${ticketId}/transfer`, {
        user_id: userId,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// Transferir para outra fila
export function useTransferToQueue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ticketId,
      queueId,
      userId,
    }: {
      ticketId: string
      queueId: string
      userId?: string
    }) => {
      const { data } = await api.put(`/tickets/${ticketId}/transfer-queue`, {
        queue_id: queueId,
        user_id: userId,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// Encerrar conversa
export function useCloseTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason?: string }) => {
      const { data } = await api.put(`/tickets/${ticketId}/close`, { reason })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

// Reabrir conversa
export function useReopenTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { data } = await api.put(`/tickets/${ticketId}/reopen`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}
