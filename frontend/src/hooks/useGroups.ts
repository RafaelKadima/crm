import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { groupsApi } from '@/api/endpoints'
import type { Group } from '@/types'

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const response = await groupsApi.list()
      return response.data
    },
  })
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      const response = await groupsApi.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useGroupDashboard(id: string) {
  return useQuery({
    queryKey: ['group-dashboard', id],
    queryFn: async () => {
      const response = await groupsApi.dashboard(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useGroupMetricsPerTenant(id: string) {
  return useQuery({
    queryKey: ['group-metrics', id],
    queryFn: async () => {
      const response = await groupsApi.metricsPerTenant(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useGroupFunnelReport(id: string) {
  return useQuery({
    queryKey: ['group-funnel', id],
    queryFn: async () => {
      const response = await groupsApi.funnelReport(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useGroupSalesRanking(id: string) {
  return useQuery({
    queryKey: ['group-ranking', id],
    queryFn: async () => {
      const response = await groupsApi.salesRanking(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Group>) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Group> }) =>
      groupsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] })
    },
  })
}

export function useAddTenantToGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupId, tenantId }: { groupId: string; tenantId: string }) =>
      groupsApi.addTenant(groupId, tenantId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] })
    },
  })
}

export function useRemoveTenantFromGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ groupId, tenantId }: { groupId: string; tenantId: string }) =>
      groupsApi.removeTenant(groupId, tenantId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] })
    },
  })
}

