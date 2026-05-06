import { useQuery } from '@tanstack/react-query'
import api from '@/api/axios'

/**
 * Mapa de permissões resolvidas pelo backend (RBAC v2 — Sprint 3).
 * Backend retorna mapa completo das 35 keys já considerando:
 *   1. is_super_admin → tudo true
 *   2. ADMIN_ONLY_ACTIONS → exige isAdmin
 *   3. custom_profile_enabled + profile → mapa do profile
 *   4. fallback RoleEnum
 *
 * Frontend só consome — não duplica lógica.
 */
export type PermissionKey =
  | 'tickets_view' | 'tickets_create' | 'tickets_delete' | 'tickets_reopen'
  | 'tickets_reopen_others' | 'tickets_transfer' | 'tickets_pause' | 'tickets_close'
  | 'contacts_view' | 'contacts_create' | 'contacts_edit' | 'contacts_delete' | 'contacts_export'
  | 'messages_send' | 'messages_send_media' | 'messages_quote' | 'messages_delete'
  | 'broadcasts_view' | 'broadcasts_create' | 'broadcasts_send'
  | 'templates_view' | 'templates_create' | 'templates_submit'
  | 'kanban_view' | 'kanban_manage'
  | 'reports_view' | 'reports_export'
  | 'queues_view' | 'queues_manage'
  | 'quickreplies_manage_public' | 'quickreplies_manage_private'
  | 'api_service_access' | 'audit_log_view' | 'sessions_manage' | 'users_manage'

interface PermissionsResponse {
  permissions: Record<PermissionKey, boolean>
  custom_profile: { id: string; name: string; description: string | null } | null
  custom_profile_enabled: boolean
  role: string | null
  is_admin: boolean
  is_super_admin: boolean
}

export function usePermissions() {
  return useQuery<PermissionsResponse>({
    queryKey: ['auth', 'permissions'],
    queryFn: async () => {
      const response = await api.get<PermissionsResponse>('/auth/permissions')
      return response.data
    },
    staleTime: 60_000, // 1min — permissões mudam pouco
  })
}

/**
 * Hook conveniente — retorna se user tem uma permission específica.
 * Default `false` enquanto está carregando (deny-by-default).
 */
export function useHasPermission(key: PermissionKey): boolean {
  const { data } = usePermissions()
  return data?.permissions?.[key] ?? false
}

/**
 * Versão "any" — true se user tem ao menos UMA das keys passadas.
 * Útil pra gates de seções inteiras (ex: mostra grupo Admin se tiver
 * audit_log_view OU users_manage OU sessions_manage).
 */
export function useHasAnyPermission(...keys: PermissionKey[]): boolean {
  const { data } = usePermissions()
  if (!data) return false
  return keys.some((k) => data.permissions[k] === true)
}
