import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketsApi } from '@/api/endpoints'
import type { Ticket } from '@/types'

interface TicketsParams {
  page?: number
  status?: string
}

export function useTickets(params?: TicketsParams) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const response = await ticketsApi.list(params)
      return response.data
    },
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await ticketsApi.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Ticket>) => ticketsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useSendTicketMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      ticketsApi.sendMessage(id, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.id] })
    },
  })
}

export function useCloseTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => ticketsApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

