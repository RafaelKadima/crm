import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

// Types
export interface MetaIntegration {
  id: string
  tenant_id: string
  business_id: string | null
  waba_id: string
  phone_number_id: string
  display_phone_number: string | null
  verified_name: string | null
  status: 'active' | 'expired' | 'reauth_required'
  status_label: string
  status_color: string
  expires_at: string | null
  days_until_expiration: number | null
  is_expiring_soon: boolean
  needs_reauth: boolean
  scopes: string[] | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface MetaIntegrationStatus {
  oauth_configured: boolean
  token_service_configured: boolean
}

export interface MetaTemplate {
  id: string
  name: string
  status: string
  category: string
  language: string
}

// API endpoints
const metaApi = {
  getStatus: () => api.get<{ success: boolean; data: MetaIntegrationStatus }>('/meta/status'),
  getConnectUrl: () => api.get<{ success: boolean; redirect_url: string }>('/meta/connect'),
  list: () => api.get<{ success: boolean; data: MetaIntegration[] }>('/meta/integrations'),
  get: (id: string) => api.get<{ success: boolean; data: MetaIntegration }>(`/meta/integrations/${id}`),
  delete: (id: string) => api.delete<{ success: boolean; message: string }>(`/meta/integrations/${id}`),
  refreshToken: (id: string) => api.post<{ success: boolean; message: string; data: Partial<MetaIntegration> }>(`/meta/integrations/${id}/refresh-token`),
  getTemplates: (id: string, status?: string) => api.get<{ success: boolean; data: MetaTemplate[] }>(`/meta/integrations/${id}/templates`, { params: { status } }),
  syncTemplates: (id: string) => api.post<{ success: boolean; message: string; count: number }>(`/meta/integrations/${id}/templates/sync`),
}

// Hooks

/**
 * Verifica status da configuração OAuth
 */
export function useMetaStatus() {
  return useQuery({
    queryKey: ['meta', 'status'],
    queryFn: async () => {
      const response = await metaApi.getStatus()
      return response.data.data
    },
  })
}

/**
 * Lista todas as integrações Meta do tenant
 */
export function useMetaIntegrations() {
  return useQuery({
    queryKey: ['meta', 'integrations'],
    queryFn: async () => {
      const response = await metaApi.list()
      return response.data.data
    },
  })
}

/**
 * Busca uma integração específica
 */
export function useMetaIntegration(id: string) {
  return useQuery({
    queryKey: ['meta', 'integrations', id],
    queryFn: async () => {
      const response = await metaApi.get(id)
      return response.data.data
    },
    enabled: !!id,
  })
}

/**
 * Inicia o fluxo de conexão OAuth
 */
export function useConnectMeta() {
  return useMutation({
    mutationFn: async () => {
      const response = await metaApi.getConnectUrl()
      return response.data.redirect_url
    },
    onSuccess: (redirectUrl) => {
      // Redireciona para o OAuth da Meta
      window.location.href = redirectUrl
    },
  })
}

/**
 * Desconecta uma integração
 */
export function useDisconnectMeta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await metaApi.delete(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta', 'integrations'] })
    },
  })
}

/**
 * Renova o token de uma integração
 */
export function useRefreshMetaToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await metaApi.refreshToken(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta', 'integrations'] })
    },
  })
}

/**
 * Lista templates de uma integração
 */
export function useMetaTemplates(integrationId: string, status?: string) {
  return useQuery({
    queryKey: ['meta', 'integrations', integrationId, 'templates', status],
    queryFn: async () => {
      const response = await metaApi.getTemplates(integrationId, status)
      return response.data.data
    },
    enabled: !!integrationId,
  })
}

/**
 * Sincroniza templates da Meta
 */
export function useSyncMetaTemplates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await metaApi.syncTemplates(integrationId)
      return response.data
    },
    onSuccess: (_, integrationId) => {
      queryClient.invalidateQueries({ queryKey: ['meta', 'integrations', integrationId, 'templates'] })
    },
  })
}
