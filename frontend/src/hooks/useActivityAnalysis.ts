import { useQuery } from '@tanstack/react-query'
import { activityAnalysisApi } from '@/api/endpoints'
import type {
  ActivityEffectivenessResponse,
  SequenceAnalysisResponse,
  UserEffectivenessResponse,
} from '@/api/endpoints'

interface DateRangeParams {
  start_date?: string
  end_date?: string
}

interface EffectivenessParams extends DateRangeParams {
  pipeline_id?: string
}

/**
 * Hook to fetch activity effectiveness report
 */
export function useActivityEffectiveness(params?: EffectivenessParams) {
  return useQuery<ActivityEffectivenessResponse>({
    queryKey: ['activity-effectiveness', params],
    queryFn: async () => {
      const { data } = await activityAnalysisApi.getEffectiveness(params)
      return data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch sequence analysis (won vs lost comparison)
 */
export function useSequenceAnalysis(params?: DateRangeParams) {
  return useQuery<SequenceAnalysisResponse>({
    queryKey: ['sequence-analysis', params],
    queryFn: async () => {
      const { data } = await activityAnalysisApi.getSequenceAnalysis(params)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch effectiveness by user
 */
export function useEffectivenessByUser(params?: DateRangeParams) {
  return useQuery<UserEffectivenessResponse>({
    queryKey: ['effectiveness-by-user', params],
    queryFn: async () => {
      const { data } = await activityAnalysisApi.getEffectivenessByUser(params)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch user contribution analysis
 */
export function useMyContribution(params?: DateRangeParams) {
  return useQuery({
    queryKey: ['my-contribution', params],
    queryFn: async () => {
      const { data } = await activityAnalysisApi.getMyContribution(params)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch tenant insights
 */
export function useTenantInsights(params?: DateRangeParams) {
  return useQuery({
    queryKey: ['tenant-insights', params],
    queryFn: async () => {
      const { data } = await activityAnalysisApi.getTenantInsights(params)
      return data
    },
    staleTime: 5 * 60 * 1000,
  })
}
