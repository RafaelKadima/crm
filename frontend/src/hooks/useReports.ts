import { useQuery } from '@tanstack/react-query'
import { reportsApi, type ReportFilters, type TimeSeriesFilters } from '@/api/endpoints'

export function useFunnelReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['report-funnel', filters],
    queryFn: async () => {
      const response = await reportsApi.funnel(filters)
      return response.data.data
    },
  })
}

export function useFunnelTimeSeries(filters?: TimeSeriesFilters) {
  return useQuery({
    queryKey: ['report-funnel-time-series', filters],
    queryFn: async () => {
      const response = await reportsApi.funnelTimeSeries(filters)
      return response.data
    },
  })
}

export function useProductivityReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['report-productivity', filters],
    queryFn: async () => {
      const response = await reportsApi.productivity(filters)
      return response.data.data
    },
  })
}

export function useIaReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['report-ia', filters],
    queryFn: async () => {
      const response = await reportsApi.ia(filters)
      return response.data.data
    },
  })
}

export function useDistributionReport(filters?: ReportFilters) {
  return useQuery({
    queryKey: ['report-distribution', filters],
    queryFn: async () => {
      const response = await reportsApi.distribution(filters)
      return response.data.data
    },
  })
}
