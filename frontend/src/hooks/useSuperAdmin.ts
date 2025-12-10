import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'

// Types
export interface TenantStats {
  total_tenants: number
  active_tenants: number
  total_users: number
  total_leads: number
  tenants_by_plan: Record<string, number>
  recent_tenants: any[]
  recent_logs: any[]
}

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  whatsapp_number?: string
  ia_enabled: boolean
  is_active: boolean
  settings?: Record<string, any>
  created_at: string
  users_count?: number
  leads_count?: number
  channels_count?: number
}

export interface TenantFeature {
  name: string
  description: string
  icon: string
  is_enabled: boolean
}

export interface CreateTenantData {
  name: string
  slug?: string
  plan: string
  admin_name: string
  admin_email: string
  admin_password: string
  whatsapp_number?: string
  ia_enabled?: boolean
  features?: string[]
}

export interface CreateUserData {
  tenant_id: string
  name: string
  email: string
  password: string
  role: string
  phone?: string
}

// Dashboard
export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: ['super-admin', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/super-admin/dashboard')
      return response.data as TenantStats
    },
  })
}

// Tenants
export function useTenants(params?: { search?: string; plan?: string; is_active?: boolean; page?: number }) {
  return useQuery({
    queryKey: ['super-admin', 'tenants', params],
    queryFn: async () => {
      const response = await api.get('/super-admin/tenants', { params })
      return response.data
    },
  })
}

export function useTenant(tenantId: string) {
  return useQuery({
    queryKey: ['super-admin', 'tenant', tenantId],
    queryFn: async () => {
      const response = await api.get(`/super-admin/tenants/${tenantId}`)
      return response.data
    },
    enabled: !!tenantId,
  })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateTenantData) => {
      const response = await api.post('/super-admin/tenants', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] })
    },
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: string; data: Partial<Tenant> }) => {
      const response = await api.put(`/super-admin/tenants/${tenantId}`, data)
      return response.data
    },
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenant', tenantId] })
    },
  })
}

export function useUpdateTenantFeatures() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ tenantId, features }: { tenantId: string; features: { key: string; enabled: boolean; config?: any }[] }) => {
      const response = await api.put(`/super-admin/tenants/${tenantId}/features`, { features })
      return response.data
    },
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenant', tenantId] })
    },
  })
}

// Users
export function useSuperAdminUsers(params?: { search?: string; tenant_id?: string; role?: string; page?: number }) {
  return useQuery({
    queryKey: ['super-admin', 'users', params],
    queryFn: async () => {
      const response = await api.get('/super-admin/users', { params })
      return response.data
    },
  })
}

export function useCreateSuperAdminUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await api.post('/super-admin/users', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] })
    },
  })
}

export function useUpdateSuperAdminUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<CreateUserData & { is_active?: boolean }> }) => {
      const response = await api.put(`/super-admin/users/${userId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] })
    },
  })
}

export function useDeleteSuperAdminUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.delete(`/super-admin/users/${userId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'dashboard'] })
    },
  })
}

// Config
export function usePlans() {
  return useQuery({
    queryKey: ['super-admin', 'plans'],
    queryFn: async () => {
      const response = await api.get('/super-admin/plans')
      return response.data.plans
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function useFeatures() {
  return useQuery({
    queryKey: ['super-admin', 'features'],
    queryFn: async () => {
      const response = await api.get('/super-admin/features')
      return response.data.features
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: ['super-admin', 'permissions'],
    queryFn: async () => {
      const response = await api.get('/super-admin/permissions')
      return response.data
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

// Logs
export function useSuperAdminLogs(params?: { action?: string; tenant_id?: string; date_from?: string; date_to?: string; page?: number }) {
  return useQuery({
    queryKey: ['super-admin', 'logs', params],
    queryFn: async () => {
      const response = await api.get('/super-admin/logs', { params })
      return response.data
    },
  })
}

