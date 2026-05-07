import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Loader2, Shield, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/api/axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/Switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

// ─── Types (do backend Sprint 3) ──────────────────────────────────────

interface CustomProfile {
  id: string
  tenant_id: string
  name: string
  description: string | null
  custom_permissions: Record<string, boolean>
  menu_permissions: Record<string, boolean> | null
  is_default: boolean
  users_count?: number
  created_at: string
  updated_at: string
}

interface CatalogResponse {
  permissions: Record<string, boolean>     // 35 keys × default
  admin_only_actions: string[]              // whitelist
  groups: Record<string, string[]>          // categoria → keys[]
}

const GROUP_LABELS: Record<string, string> = {
  tickets: 'Tickets',
  contacts: 'Contatos',
  messages: 'Mensagens',
  broadcasts: 'Broadcasts',
  templates: 'Templates WABA',
  kanban: 'Kanban',
  reports: 'Relatórios',
  queues: 'Filas',
  quickreplies: 'Respostas rápidas',
  admin: 'Admin / sistema',
}

const PERMISSION_LABELS: Record<string, string> = {
  // Tickets
  tickets_view: 'Ver tickets',
  tickets_create: 'Criar tickets',
  tickets_delete: 'Excluir tickets',
  tickets_reopen: 'Reabrir tickets',
  tickets_reopen_others: 'Reabrir tickets de outros',
  tickets_transfer: 'Transferir tickets',
  tickets_pause: 'Pausar tickets',
  tickets_close: 'Fechar tickets',
  // Contatos
  contacts_view: 'Ver contatos',
  contacts_create: 'Criar contatos',
  contacts_edit: 'Editar contatos',
  contacts_delete: 'Excluir contatos',
  contacts_export: 'Exportar contatos (CSV)',
  // Mensagens
  messages_send: 'Enviar mensagens',
  messages_send_media: 'Enviar mídia',
  messages_quote: 'Citar/responder mensagens',
  messages_delete: 'Excluir mensagens',
  // Broadcasts
  broadcasts_view: 'Ver broadcasts',
  broadcasts_create: 'Criar broadcasts',
  broadcasts_send: 'Disparar broadcasts',
  // Templates
  templates_view: 'Ver templates',
  templates_create: 'Criar templates',
  templates_submit: 'Submeter pra Meta',
  // Kanban
  kanban_view: 'Ver kanban',
  kanban_manage: 'Gerenciar kanban',
  // Relatórios
  reports_view: 'Ver relatórios',
  reports_export: 'Exportar relatórios',
  // Filas
  queues_view: 'Ver filas',
  queues_manage: 'Gerenciar filas',
  // Quick replies
  quickreplies_manage_public: 'Gerenciar respostas públicas',
  quickreplies_manage_private: 'Gerenciar respostas privadas',
  // Admin
  api_service_access: 'Acesso à API de serviço',
  audit_log_view: 'Ver auditoria',
  sessions_manage: 'Gerenciar sessões',
  users_manage: 'Gerenciar usuários',
}

// ─── Panel ────────────────────────────────────────────────────────────

export function CustomProfilesPanel() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<CustomProfile | null>(null)
  const [creating, setCreating] = useState(false)

  const profilesQuery = useQuery<{ data: CustomProfile[] }>({
    queryKey: ['custom-profiles'],
    queryFn: async () => (await api.get('/custom-profiles')).data,
  })

  const catalogQuery = useQuery<CatalogResponse>({
    queryKey: ['custom-profiles', 'catalog'],
    queryFn: async () => (await api.get('/custom-profiles/catalog')).data,
  })

  const handleDelete = async (profile: CustomProfile) => {
    if (profile.users_count && profile.users_count > 0) {
      toast.error('Profile tem usuários vinculados. Migre-os antes de excluir.')
      return
    }
    if (!confirm(`Excluir profile "${profile.name}"?`)) return
    try {
      await api.delete(`/custom-profiles/${profile.id}`)
      toast.success('Profile excluído.')
      queryClient.invalidateQueries({ queryKey: ['custom-profiles'] })
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao excluir.')
    }
  }

  if (profilesQuery.isLoading || catalogQuery.isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/30" />
  }

  const profiles = profilesQuery.data?.data ?? []
  const catalog = catalogQuery.data!

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Perfis customizados (RBAC v2)
          </CardTitle>
          <CardDescription>
            Define conjuntos granulares das 35 permission keys pra atribuir aos
            usuários. Mais flexível que os roles legados (admin/gestor/vendedor/
            marketing).
          </CardDescription>
        </div>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Novo perfil
        </Button>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed bg-muted/30 px-6 py-12 text-center">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-3">
              Nenhum perfil customizado criado.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Sem perfis, usuários seguem o role legado (admin/gestor/etc).
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {profiles.map((p) => {
              const enabledCount = Object.values(p.custom_permissions ?? {}).filter(Boolean).length
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.name}</span>
                      {p.is_default && <Badge variant="secondary">Padrão</Badge>}
                      <Badge variant="outline">
                        {enabledCount}/35 permissões
                      </Badge>
                      {p.users_count != null && (
                        <Badge variant="outline">
                          {p.users_count} {p.users_count === 1 ? 'usuário' : 'usuários'}
                        </Badge>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      {/* Edit/Create dialog */}
      {(editing || creating) && (
        <ProfileEditorDialog
          profile={editing}
          catalog={catalog}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['custom-profiles'] })
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </Card>
  )
}

// ─── Editor Dialog ────────────────────────────────────────────────────

interface ProfileEditorDialogProps {
  profile: CustomProfile | null
  catalog: CatalogResponse
  onClose: () => void
  onSaved: () => void
}

function ProfileEditorDialog({ profile, catalog, onClose, onSaved }: ProfileEditorDialogProps) {
  const isNew = !profile
  const [name, setName] = useState(profile?.name ?? '')
  const [description, setDescription] = useState(profile?.description ?? '')
  const [isDefault, setIsDefault] = useState(profile?.is_default ?? false)
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    if (profile) {
      // Merge stored com defaults pra cobrir keys novas
      const merged: Record<string, boolean> = { ...catalog.permissions }
      Object.keys(profile.custom_permissions ?? {}).forEach((k) => {
        merged[k] = profile.custom_permissions![k]
      })
      return merged
    }
    return { ...catalog.permissions }
  })
  const [saving, setSaving] = useState(false)

  const togglePermission = (key: string) => {
    setPermissions((p) => ({ ...p, [key]: !p[key] }))
  }

  const isAdminOnly = (key: string) => catalog.admin_only_actions.includes(key)

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description?.trim() || null,
        is_default: isDefault,
        custom_permissions: permissions,
      }
      if (isNew) {
        await api.post('/custom-profiles', payload)
        toast.success('Perfil criado.')
      } else {
        await api.put(`/custom-profiles/${profile.id}`, payload)
        toast.success('Perfil atualizado.')
      }
      onSaved()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Novo perfil' : `Editar: ${profile.name}`}</DialogTitle>
          <DialogDescription>
            Selecione as permissões que o perfil deve conceder. Permissões com 🛡️
            só funcionam pra usuários com role admin (mesmo se marcadas).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-name">Nome *</Label>
              <Input
                id="prof-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Atendente Sênior"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center justify-between">
                <span>Perfil padrão</span>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              </Label>
              <p className="text-xs text-muted-foreground">
                Atribui automaticamente a novos usuários.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-desc">Descrição</Label>
            <Textarea
              id="prof-desc"
              rows={2}
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quem usa esse perfil e por quê"
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Permissões</h4>
            {Object.entries(catalog.groups).map(([groupKey, keys]) => (
              <div key={groupKey} className="rounded-lg border bg-muted/20 px-4 py-3">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {GROUP_LABELS[groupKey] ?? groupKey}
                </h5>
                <ul className="space-y-1.5">
                  {keys.map((key) => (
                    <li key={key} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">
                          {PERMISSION_LABELS[key] ?? key}
                        </span>
                        {isAdminOnly(key) && (
                          <span title="Só efetiva pra usuários com role admin">🛡️</span>
                        )}
                      </div>
                      <Switch
                        checked={!!permissions[key]}
                        onCheckedChange={() => togglePermission(key)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
            <span>
              Permissões com 🛡️ ({catalog.admin_only_actions.length} no total) só
              funcionam pra usuários com role admin. Marcá-las pra outros perfis
              não dá efeito — segurança em camadas.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isNew ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
