import { TeamSettingsPage } from '@/pages/settings/TeamSettingsPage'
import { CustomProfilesPanel } from './CustomProfilesPanel'
import { Can } from '@/components/auth/Can'

/**
 * Página de Equipe — combina o gerenciamento de usuários existente
 * (TeamSettingsPage) com o novo painel de Custom Profiles (RBAC v2,
 * Sprint 3 backend). Custom Profiles só aparece pra quem tem
 * permission `users_manage`.
 */
export function TeamPage() {
  return (
    <div className="space-y-8">
      <TeamSettingsPage />

      <Can permission="users_manage">
        <CustomProfilesPanel />
      </Can>
    </div>
  )
}
