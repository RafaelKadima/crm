import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/endpoints'

interface DashboardStats {
  total_leads: number
  total_contacts: number
  total_tickets: number
  total_tasks: number
  leads_won: number
  leads_lost: number
  conversion_rate: number
}

interface DashboardData {
  stats: DashboardStats
  recent_leads: any[]
  recent_tasks: any[]
}

// Query única que carrega tudo do dashboard
function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await dashboardApi.getData()
      return response.data as DashboardData
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Hook para estatísticas - usa select para extrair do cache
export function useDashboardStats() {
  const query = useDashboardData()
  return {
    ...query,
    data: query.data?.stats,
  }
}

// Hook para leads recentes - usa select para extrair do cache
export function useRecentLeads() {
  const query = useDashboardData()
  return {
    ...query,
    data: query.data?.recent_leads || [],
  }
}

// Hook para tarefas recentes - usa select para extrair do cache
export function useRecentTasks() {
  const query = useDashboardData()
  return {
    ...query,
    data: query.data?.recent_tasks || [],
  }
}

