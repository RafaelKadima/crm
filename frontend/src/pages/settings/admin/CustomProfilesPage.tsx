import { Shield } from 'lucide-react'
import { CustomProfilesPanel } from '@/pages/settings/company/CustomProfilesPanel'

/**
 * Custom Profiles em Admin — replica o painel que aparece em Equipe
 * (S1) pra dar acesso direto via Admin sidebar. Mesmo backend.
 */
export function CustomProfilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          Perfis customizados (RBAC v2)
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Gerencie perfis com permissões granulares pros usuários do tenant.
        </p>
      </div>

      <CustomProfilesPanel />
    </div>
  )
}
