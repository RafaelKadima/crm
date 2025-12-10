import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/endpoints'

export function useFunnelReport() {
  return useQuery({
    queryKey: ['report-funnel'],
    queryFn: async () => {
      const response = await reportsApi.funnel()
      return response.data.data
    },
  })
}

export function useProductivityReport() {
  return useQuery({
    queryKey: ['report-productivity'],
    queryFn: async () => {
      const response = await reportsApi.productivity()
      return response.data.data
    },
  })
}

export function useIaReport() {
  return useQuery({
    queryKey: ['report-ia'],
    queryFn: async () => {
      const response = await reportsApi.ia()
      return response.data.data
    },
  })
}

export function useDistributionReport() {
  return useQuery({
    queryKey: ['report-distribution'],
    queryFn: async () => {
      const response = await reportsApi.distribution()
      return response.data.data
    },
  })
}

