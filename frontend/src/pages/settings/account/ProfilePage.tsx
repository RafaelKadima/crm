import { useState } from 'react'
import { User, Lock } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'
import { useSettings } from '@/hooks/useSettings'
import { ConfigPage } from '@/components/settings/ConfigPage'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'

interface ProfileForm extends Record<string, unknown> {
  name: string
  email: string
  phone: string
  avatar: string | null
}

export function ProfilePage() {
  const { user, setAuth, token, tenant } = useAuthStore()

  const settings = useSettings<ProfileForm>({
    load: async () => {
      const res = await api.get('/auth/me')
      const u = res.data.user
      return {
        name: u.name ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
        avatar: u.avatar ?? null,
      }
    },
    save: async (next) => {
      const res = await api.put('/users/me', {
        name: next.name,
        email: next.email,
        phone: next.phone,
      })
      // Sync auth store
      if (token) {
        setAuth(token, res.data.user, tenant ?? undefined)
      }
      toast.success('Perfil atualizado.')
    },
  })

  if (!settings.values) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl border bg-muted/30" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ConfigPage<ProfileForm>
        title="Perfil"
        description="Suas informações pessoais e credenciais de acesso."
        icon={User}
        values={settings.values}
        onChange={settings.set}
        onSave={() =>
          settings.save().catch((e) => {
            toast.error(e?.response?.data?.message ?? 'Erro ao salvar.')
          })
        }
        onReset={settings.reset}
        isDirty={settings.isDirty}
        isSaving={settings.isSaving}
        isLoading={settings.isLoading}
        changesCount={settings.changesCount}
        sections={[
          {
            title: 'Informações pessoais',
            description: 'Como aparecem pra outros usuários do sistema.',
            fields: [
              { key: 'name', label: 'Nome completo', type: 'text', required: true, placeholder: 'João Silva' },
              { key: 'email', label: 'E-mail', type: 'email', required: true, placeholder: 'joao@empresa.com' },
              { key: 'phone', label: 'Telefone', type: 'text', placeholder: '(11) 91234-5678' },
            ],
          },
        ]}
        help={{
          description:
            'Suas informações de perfil são visíveis pra outros usuários do tenant. ' +
            'O e-mail é usado pra login e recuperação de senha — mudar aqui altera o login.',
          sections: [
            {
              title: 'Trocar e-mail',
              content:
                'Ao salvar um e-mail novo, o sistema mantém suas sessões ativas. Pra alterar a senha use a aba Segurança.',
            },
            {
              title: 'Avatar',
              content: 'Upload de foto fica disponível em sprint futura — por ora, iniciais do nome.',
            },
          ],
        }}
      />

      <PasswordChangeCard />
    </div>
  )
}

// ─── Password change (separado pra não acoplar com profile save) ────

function PasswordChangeCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  const submit = async () => {
    if (next !== confirm) {
      toast.error('Confirmação não bate com a nova senha.')
      return
    }
    if (next.length < 8) {
      toast.error('Senha precisa ter ao menos 8 caracteres.')
      return
    }
    setSaving(true)
    try {
      await api.put('/users/me/password', {
        current_password: current,
        new_password: next,
        new_password_confirmation: confirm,
      })
      toast.success('Senha alterada. Suas outras sessões foram encerradas por segurança.')
      reset()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erro ao alterar senha.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Alterar senha
        </CardTitle>
        <CardDescription>
          Ao trocar a senha, sessões em outros dispositivos são encerradas automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current">Senha atual</Label>
          <Input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new">Nova senha</Label>
            <Input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button
            onClick={submit}
            disabled={saving || !current || !next || next !== confirm}
          >
            {saving ? 'Salvando...' : 'Alterar senha'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
