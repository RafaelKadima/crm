import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { leadsApi } from '@/api/endpoints'
import type { Lead } from '@/types'

interface LeadsParams {
  page?: number
  per_page?: number
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

/**
 * Hook para carregar leads com paginação infinita (lazy loading)
 * Carrega 10 por vez e permite "Carregar mais"
 */
export function useInfiniteLeads(params?: Omit<LeadsParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['leads-infinite', params],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await leadsApi.list({
        ...params,
        page: pageParam,
        per_page: params?.per_page || 10
      })
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Se há mais páginas, retorna o próximo número de página
      if (lastPage.current_page < lastPage.last_page) {
        return lastPage.current_page + 1
      }
      return undefined // Não há mais páginas
    },
    staleTime: 1000 * 30,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
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
    onSuccess: (response) => {
      // Debug: ver a resposta completa
      console.log('[GTM Debug] Response:', response)
      console.log('[GTM Debug] Response data:', response?.data)
      
      // Dispara evento GTM se o estágio tiver gtm_event_key
      const lead = response?.data?.lead
      const stage = lead?.stage
      
      console.log('[GTM Debug] Lead:', lead)
      console.log('[GTM Debug] Stage:', stage)
      console.log('[GTM Debug] gtm_event_key:', stage?.gtm_event_key)
      console.log('[GTM Debug] dataLayer exists:', typeof window !== 'undefined' && !!(window as any).dataLayer)
      
      if (stage?.gtm_event_key) {
        const eventData = {
          event: stage.gtm_event_key,
          event_category: 'crm',
          event_label: stage.name,
          lead_id: lead.id,
          lead_source: lead.source || 'direct',
          contact_name: lead.contact?.name,
          contact_email: lead.contact?.email,
          contact_phone: lead.contact?.phone,
          value: lead.value || 0,
          currency: 'BRL',
          stage_to: stage.name,
          pipeline_name: lead.pipeline?.name,
          content_type: 'product',
          content_name: lead.pipeline?.name || 'Lead',
          timestamp: new Date().toISOString(),
        }
        
        if (typeof window !== 'undefined' && (window as any).dataLayer) {
          ;(window as any).dataLayer.push(eventData)
          console.log('[GTM] ✅ Event pushed:', stage.gtm_event_key, eventData)
        } else {
          console.log('[GTM] ❌ dataLayer not found!')
        }
      } else {
        console.log('[GTM] ⚠️ No gtm_event_key for this stage')
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

