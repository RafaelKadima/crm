import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'

interface MyPermissions {
  role: string
  role_label: string
  is_admin: boolean
  is_super_admin: boolean
  permissions: string[]
}

/**
 * Hook para buscar e verificar permissões do usuário logado
 */
export function usePermissions() {
  const { isAuthenticated, user } = useAuthStore()

  const { data, isLoading, error } = useQuery<MyPermissions>({
    queryKey: ['my-permissions'],
    queryFn: async () => {
      const response = await api.get('/permissions/me')
      return response.data
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    refetchOnWindowFocus: false,
  })

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const hasPermission = (permissionKey: string): boolean => {
    if (!data) return false
    
    // Admin e Super Admin têm todas as permissões
    if (data.is_admin || data.is_super_admin) return true
    
    return data.permissions.includes(permissionKey)
  }

  /**
   * Verifica se o usuário tem TODAS as permissões listadas
   */
  const hasAllPermissions = (permissionKeys: string[]): boolean => {
    return permissionKeys.every(key => hasPermission(key))
  }

  /**
   * Verifica se o usuário tem QUALQUER uma das permissões listadas
   */
  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => hasPermission(key))
  }

  /**
   * Verifica se o usuário é admin
   */
  const isAdmin = (): boolean => {
    return data?.is_admin || data?.is_super_admin || user?.role === 'admin'
  }

  /**
   * Verifica se o usuário pode ver todos os leads/tickets (admin ou gestor)
   */
  const canViewAll = (module: 'leads' | 'tickets' | 'tasks'): boolean => {
    return hasPermission(`${module}.view_all`) || isAdmin()
  }

  /**
   * Verifica se o usuário pode gerenciar (create/edit/delete) um módulo
   */
  const canManage = (module: string): boolean => {
    return hasAnyPermission([
      `${module}.create`,
      `${module}.edit`,
      `${module}.delete`,
    ]) || isAdmin()
  }

  return {
    permissions: data?.permissions || [],
    role: data?.role || user?.role,
    roleLabel: data?.role_label,
    isAdmin: isAdmin(),
    isSuperAdmin: data?.is_super_admin || false,
    isLoading,
    error,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canViewAll,
    canManage,
  }
}

/**
 * Hook para buscar features habilitadas do tenant
 */
export function useTenantFeatures() {
  const { isAuthenticated, tenant } = useAuthStore()

  const { data, isLoading, error } = useQuery<Record<string, { name: string; is_enabled: boolean }>>({
    queryKey: ['tenant-features', tenant?.id],
    queryFn: async () => {
      // Esta rota precisa ser implementada no backend
      const response = await api.get('/tenant/features')
      return response.data
    },
    enabled: isAuthenticated && !!tenant?.id,
    staleTime: 1000 * 60 * 10, // Cache por 10 minutos
    refetchOnWindowFocus: false,
  })

  /**
   * Verifica se uma feature está habilitada para o tenant
   */
  const hasFeature = (featureKey: string): boolean => {
    if (!data) return false
    return data[featureKey]?.is_enabled || false
  }

  return {
    features: data,
    isLoading,
    error,
    hasFeature,
  }
}

/**
 * Hook combinado para verificar permissão + feature
 */
export function useAccess() {
  const { hasPermission, hasAnyPermission, isAdmin } = usePermissions()
  const { hasFeature } = useTenantFeatures()

  /**
   * Verifica se o usuário pode acessar uma funcionalidade
   * considerando tanto a feature do tenant quanto a permissão do usuário
   */
  const canAccess = (options: {
    permission?: string
    permissions?: string[]
    feature?: string
    requireAll?: boolean
  }): boolean => {
    const { permission, permissions, feature, requireAll = false } = options

    // Admin sempre pode acessar
    if (isAdmin) return true

    // Verifica feature do tenant
    if (feature && !hasFeature(feature)) return false

    // Verifica permissões
    if (permission && !hasPermission(permission)) return false
    
    if (permissions && permissions.length > 0) {
      if (requireAll) {
        if (!permissions.every(p => hasPermission(p))) return false
      } else {
        if (!hasAnyPermission(permissions)) return false
      }
    }

    return true
  }

  return {
    canAccess,
    hasPermission,
    hasFeature,
    isAdmin,
  }
}

