import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '@/api/endpoints'
import type { Lead } from '@/types'

interface LeadsParams {
  page?: number
  status?: string
  stage_id?: string
  owner_id?: string
}

export function useLeads(params?: LeadsParams) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const response = await leadsApi.list(params)
      return response.data
    },
    // Auto-refresh a cada 30 segundos para capturar novas mensagens
    staleTime: 1000 * 30, // 30 segundos - dados são considerados "frescos"
    refetchInterval: 60000, // Polling a cada 60s (menos frequente, WebSocket cuida do tempo real)
    refetchIntervalInBackground: false, // Só atualiza quando a aba está ativa
  })
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const response = await leadsApi.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Lead>) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useUpdateLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      leadsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', variables.id] })
    },
  })
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, stage_id }: { id: string; stage_id: string }) =>
      leadsApi.updateStage(id, stage_id),
    // Optimistic update
    onMutate: async ({ id, stage_id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['leads'] })

      // Snapshot previous value
      const previousLeads = queryClient.getQueryData(['leads'])

      // Optimistically update
      queryClient.setQueryData(['leads'], (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((lead: Lead) =>
            lead.id === id ? { ...lead, stage_id } : lead
          ),
        }
      })

      return { previousLeads }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads'], context.previousLeads)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useAssignLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, owner_id }: { id: string; owner_id: string }) =>
      leadsApi.assign(id, owner_id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', variables.id] })
    },
  })
}

export function useDeleteLead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => leadsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useLeadActivities(leadId: string) {
  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      const response = await leadsApi.activities(leadId)
      return response.data.data
    },
    enabled: !!leadId,
  })
}

