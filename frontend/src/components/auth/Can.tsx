import type { ReactNode } from 'react'
import { useHasPermission, type PermissionKey } from '@/hooks/useHasPermission'

interface CanProps {
  permission: PermissionKey
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Renderização condicional baseada em permission do RBAC v2 (Sprint 3).
 * Default deny — durante loading retorna `fallback` (que pode ser null).
 *
 * @example
 *   <Can permission="users_manage">
 *     <Button>Editar usuário</Button>
 *   </Can>
 *
 *   <Can permission="audit_log_view" fallback={<EmptyState />}>
 *     <AuditLogsTable />
 *   </Can>
 */
export function Can({ permission, fallback = null, children }: CanProps) {
  const allowed = useHasPermission(permission)
  return <>{allowed ? children : fallback}</>
}
