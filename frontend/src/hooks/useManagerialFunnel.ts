import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

export type ManagerialFilters = {
  date_from?: string
  date_to?: string
  pipeline_id?: string
  channel_id?: string
  owner_id?: string
  queue_id?: string
  compare_to_previous?: boolean
}

export type FunnelCategory =
  | 'arrived'
  | 'qualified'
  | 'scheduled'
  | 'meeting_done'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'unmapped'

export type TopOfFunnel = {
  contacts_new: number
  tickets_new: number
  leads_new: number
}

export type ByCategoryRow = {
  category: FunnelCategory
  label: string
  leads_passed: number
  total_value: number
  stage_ids: string[]
}

export type AppointmentsBreakdown = {
  total: number
  scheduled: number
  confirmed: number
  completed: number
  no_show: number
  cancelled: number
  rescheduled: number
  show_up_rate: number
}

export type BottomOfFunnel = {
  won_count: number
  won_value: number
  lost_count: number
  lost_value: number
  disqualified_count: number
  disqualified_value: number
}

export type ConversionRate = {
  from: FunnelCategory
  to: FunnelCategory
  rate: number
}

export type FunnelReport = {
  filters: ManagerialFilters
  top_of_funnel: TopOfFunnel
  by_category: ByCategoryRow[]
  appointments: AppointmentsBreakdown
  bottom_of_funnel: BottomOfFunnel
  conversion_rates: ConversionRate[]
  previous_period: {
    top_of_funnel: TopOfFunnel
    by_category: ByCategoryRow[]
    bottom_of_funnel: BottomOfFunnel
    appointments: AppointmentsBreakdown
    date_from: string
    date_to: string
  } | null
}

function toParams(filters: ManagerialFilters): URLSearchParams {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value))
    }
  })
  return params
}

export function useManagerialFunnel(filters: ManagerialFilters) {
  return useQuery({
    queryKey: ['managerial-funnel', filters],
    queryFn: async () => {
      const { data } = await api.get<FunnelReport>(
        `/managerial/funnel?${toParams(filters).toString()}`
      )
      return data
    },
  })
}

export function useDrillDown(category: FunnelCategory | null, filters: ManagerialFilters) {
  return useQuery({
    queryKey: ['managerial-drill-down', category, filters],
    enabled: !!category,
    queryFn: async () => {
      const params = toParams(filters)
      params.append('category', category as string)
      const { data } = await api.get(`/managerial/funnel/drill-down?${params.toString()}`)
      return data
    },
  })
}

export function useLossAnalysis(filters: ManagerialFilters) {
  return useQuery({
    queryKey: ['managerial-losses', filters],
    queryFn: async () => {
      const { data } = await api.get(`/managerial/losses?${toParams(filters).toString()}`)
      return data
    },
  })
}

export function useVelocity(filters: ManagerialFilters) {
  return useQuery({
    queryKey: ['managerial-velocity', filters],
    queryFn: async () => {
      const { data } = await api.get(`/managerial/velocity?${toParams(filters).toString()}`)
      return data
    },
  })
}

export function useForecast(filters: ManagerialFilters) {
  return useQuery({
    queryKey: ['managerial-forecast', filters],
    queryFn: async () => {
      const { data } = await api.get(`/managerial/forecast?${toParams(filters).toString()}`)
      return data
    },
  })
}

export function useCohort(filters: ManagerialFilters) {
  return useQuery({
    queryKey: ['managerial-cohort', filters],
    queryFn: async () => {
      const { data } = await api.get(`/managerial/cohort?${toParams(filters).toString()}`)
      return data
    },
  })
}

export function useFunnelMapping(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ['funnel-mapping', pipelineId],
    enabled: !!pipelineId,
    queryFn: async () => {
      const { data } = await api.get(`/pipelines/${pipelineId}/funnel-mapping`)
      return data
    },
  })
}

export function useUpdateFunnelMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      pipelineId,
      stages,
    }: {
      pipelineId: string
      stages: Array<{ id: string; funnel_category: FunnelCategory }>
    }) => {
      const { data } = await api.put(`/pipelines/${pipelineId}/funnel-mapping`, { stages })
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['funnel-mapping', variables.pipelineId] })
      qc.invalidateQueries({ queryKey: ['managerial-funnel'] })
    },
  })
}

export function useLostReasons() {
  return useQuery({
    queryKey: ['lost-reasons'],
    queryFn: async () => {
      const { data } = await api.get('/lost-reasons')
      return data.lost_reasons as Array<{
        id: string
        name: string
        slug: string
        color: string | null
        is_active: boolean
        sort_order: number
      }>
    },
  })
}

export function useCreateLostReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string; sort_order?: number }) => {
      const { data } = await api.post('/lost-reasons', payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lost-reasons'] }),
  })
}

export function useUpdateLostReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; is_active?: boolean; sort_order?: number; color?: string }) => {
      const { data } = await api.put(`/lost-reasons/${id}`, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lost-reasons'] }),
  })
}

export function useDeleteLostReason() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/lost-reasons/${id}`)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lost-reasons'] }),
  })
}
