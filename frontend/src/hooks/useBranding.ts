import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'

export interface Branding {
  primary_color: string
  secondary_color: string
  accent_color: string
  sidebar_color: string
  sidebar_text_color: string
  header_color: string
  header_text_color: string
  button_radius: string
  font_family: string
}

export interface TenantBranding {
  name: string
  logo_url: string | null
  logo_dark_url: string | null
  favicon_url: string | null
  branding: Branding
}

export const DEFAULT_BRANDING: Branding = {
  primary_color: '#3B82F6',
  secondary_color: '#8B5CF6',
  accent_color: '#10B981',
  sidebar_color: '#111827',
  sidebar_text_color: '#F9FAFB',
  header_color: '#1F2937',
  header_text_color: '#F9FAFB',
  button_radius: '8',
  font_family: 'DM Sans',
}

export function useBranding() {
  const { isAuthenticated } = useAuthStore()
  
  return useQuery<TenantBranding>({
    queryKey: ['branding'],
    queryFn: async () => {
      const response = await api.get('/branding')
      return response.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
    enabled: isAuthenticated, // Só executa quando autenticado
  })
}

export function useUpdateBranding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Branding> & { name?: string }) => {
      const response = await api.put('/branding', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] })
    },
  })
}

export function useUploadLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'light' | 'dark' | 'favicon' }) => {
      const formData = new FormData()
      formData.append('logo', file)
      formData.append('type', type)
      
      const response = await api.post('/branding/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] })
    },
  })
}

export function useRemoveLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (type: 'light' | 'dark' | 'favicon') => {
      const response = await api.delete('/branding/logo', { data: { type } })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] })
    },
  })
}

export function useResetBranding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/branding/reset')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding'] })
    },
  })
}
