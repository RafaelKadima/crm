import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import api from '@/api/axios'

export interface ModuleFunction {
  name: string
  description: string
}

export interface TenantFeature {
  name: string
  description: string
  icon: string
  is_enabled: boolean
  all_functions: boolean
  enabled_functions: string[]
  available_functions: Record<string, ModuleFunction>
}

export interface FeaturesResponse {
  features: Record<string, TenantFeature>
  basic_features: string[]
  plan: string
  plan_label: string
  ia_enabled: boolean
  tenant_id: string
  tenant_name: string
  is_super_admin?: boolean
}

/**
 * Hook para obter as features disponíveis para o tenant do usuário logado.
 */
export function useMyFeatures() {
  return useQuery({
    queryKey: ['my-features'],
    queryFn: async () => {
      const response = await api.get('/my-features')
      return response.data as FeaturesResponse
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 30, // 30 minutos
  })
}

/**
 * Hook para verificar se o tenant tem acesso a uma feature específica.
 */
export function useHasFeature(featureKey: string) {
  const { data, isLoading } = useMyFeatures()
  
  if (isLoading || !data) {
    return { hasAccess: false, isLoading: true }
  }

  // Super admins têm acesso a tudo
  if (data.is_super_admin) {
    return { hasAccess: true, isLoading: false }
  }

  // Verifica se a feature está habilitada
  const feature = data.features[featureKey]
  const hasAccess = feature?.is_enabled ?? false

  return { hasAccess, isLoading: false }
}

/**
 * Hook que retorna uma lista de features ativas.
 */
export function useActiveFeatures() {
  const { data, isLoading } = useMyFeatures()

  if (isLoading || !data) {
    return { activeFeatures: [], isLoading: true }
  }

  // Super admins têm todas as features ativas
  if (data.is_super_admin) {
    return { 
      activeFeatures: Object.keys(data.features), 
      isLoading: false 
    }
  }

  const activeFeatures = Object.entries(data.features)
    .filter(([_, feature]) => feature.is_enabled)
    .map(([key]) => key)

  return { activeFeatures, isLoading: false }
}

/**
 * Mapeamento de features para itens de menu da sidebar.
 */
export const featureMenuMap: Record<string, string[]> = {
  // Feature key => menu items que dependem dela
  'sdr_ia': ['sdr', 'sdr-agents'],
  'landing_pages': ['landing-pages'],
  'products': ['products', 'product-categories'],
  'appointments': ['appointments', 'schedules', 'minha-agenda'],
  'groups': ['groups', 'grupos'],
  'reports_advanced': ['reports-advanced'],
  'whatsapp': [], // WhatsApp é configurado nos canais
  'instagram': [], // Instagram é configurado nos canais
  'automation': ['automations'],
  'api_access': ['api'],
  'multi_pipeline': [], // Pipelines múltiplos são configurados internamente
}

/**
 * Features básicas que todo tenant tem acesso (não precisam de ativação).
 */
export const basicFeatures = [
  'dashboard',
  'leads',
  'contacts',
  'tickets',
  'tasks',
  'pipelines',
  'users',
  'channels',
  'settings',
]

/**
 * Hook para verificar se o tenant tem acesso a uma sub-função específica de um módulo.
 */
export function useHasFunction(featureKey: string, functionKey: string) {
  const { data, isLoading } = useMyFeatures()

  if (isLoading || !data) {
    return { hasAccess: false, isLoading: true }
  }

  // Super admins têm acesso a tudo
  if (data.is_super_admin) {
    return { hasAccess: true, isLoading: false }
  }

  const feature = data.features[featureKey]
  if (!feature?.is_enabled) {
    return { hasAccess: false, isLoading: false }
  }

  // Se all_functions = true, tem acesso a tudo
  if (feature.all_functions) {
    return { hasAccess: true, isLoading: false }
  }

  const hasAccess = feature.enabled_functions?.includes(functionKey) ?? false
  return { hasAccess, isLoading: false }
}

/**
 * Hook que retorna funções para verificar acesso a features e sub-funções.
 * Útil quando precisa verificar múltiplas features/funções em um componente.
 */
export function useFeatureAccess() {
  const { data, isLoading } = useMyFeatures()

  const hasFeature = useCallback(
    (featureKey: string): boolean => {
      if (isLoading || !data) return false
      if (data.is_super_admin) return true
      return data.features[featureKey]?.is_enabled ?? false
    },
    [data, isLoading]
  )

  const hasFunction = useCallback(
    (featureKey: string, functionKey: string): boolean => {
      if (isLoading || !data) return false
      if (data.is_super_admin) return true

      const feature = data.features[featureKey]
      if (!feature?.is_enabled) return false

      // Se all_functions = true, tem acesso a tudo
      if (feature.all_functions) return true

      return feature.enabled_functions?.includes(functionKey) ?? false
    },
    [data, isLoading]
  )

  const getEnabledFunctions = useCallback(
    (featureKey: string): string[] => {
      if (isLoading || !data) return []
      if (data.is_super_admin) {
        return Object.keys(data.features[featureKey]?.available_functions ?? {})
      }

      const feature = data.features[featureKey]
      if (!feature?.is_enabled) return []

      return feature.enabled_functions ?? []
    },
    [data, isLoading]
  )

  return { hasFeature, hasFunction, getEnabledFunctions, isLoading, data }
}

