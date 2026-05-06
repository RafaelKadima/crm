import { Bell } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/api/axios'
import { useSettings } from '@/hooks/useSettings'
import { ConfigPage, type ConfigField } from '@/components/settings/ConfigPage'

interface NotificationForm extends Record<string, unknown> {
  // 7 events × 3 channels = 21 booleans
  new_lead_email: boolean
  new_lead_push: boolean
  new_lead_sound: boolean
  lead_assigned_email: boolean
  lead_assigned_push: boolean
  lead_assigned_sound: boolean
  new_message_email: boolean
  new_message_push: boolean
  new_message_sound: boolean
  task_due_email: boolean
  task_due_push: boolean
  task_due_sound: boolean
  appointment_reminder_email: boolean
  appointment_reminder_push: boolean
  appointment_reminder_sound: boolean
  deal_won_email: boolean
  deal_won_push: boolean
  deal_won_sound: boolean
  deal_lost_email: boolean
  deal_lost_push: boolean
  deal_lost_sound: boolean
}

const DEFAULTS: NotificationForm = {
  new_lead_email: true,
  new_lead_push: true,
  new_lead_sound: true,
  lead_assigned_email: true,
  lead_assigned_push: true,
  lead_assigned_sound: true,
  new_message_email: false,
  new_message_push: true,
  new_message_sound: true,
  task_due_email: true,
  task_due_push: true,
  task_due_sound: false,
  appointment_reminder_email: true,
  appointment_reminder_push: true,
  appointment_reminder_sound: true,
  deal_won_email: true,
  deal_won_push: true,
  deal_won_sound: true,
  deal_lost_email: true,
  deal_lost_push: false,
  deal_lost_sound: false,
}

const EVENTS: { key: string; label: string; description: string }[] = [
  { key: 'new_lead', label: 'Novo lead', description: 'Quando um lead novo entra no funil.' },
  { key: 'lead_assigned', label: 'Lead atribuído', description: 'Quando um lead é distribuído pra você.' },
  { key: 'new_message', label: 'Nova mensagem', description: 'Mensagens recebidas em tickets atribuídos.' },
  { key: 'task_due', label: 'Tarefa vencendo', description: 'Quando uma tarefa está prestes a vencer.' },
  { key: 'appointment_reminder', label: 'Lembrete de agendamento', description: 'Antes de reuniões agendadas.' },
  { key: 'deal_won', label: 'Negócio ganho', description: 'Quando um deal é fechado positivamente.' },
  { key: 'deal_lost', label: 'Negócio perdido', description: 'Quando um deal é marcado como perdido.' },
]

export function NotificationsPage() {
  const settings = useSettings<NotificationForm>({
    load: async () => {
      try {
        const res = await api.get('/notifications/settings')
        return { ...DEFAULTS, ...(res.data ?? {}) }
      } catch {
        // Endpoint pode ainda não existir — usa defaults
        return DEFAULTS
      }
    },
    save: async (next) => {
      await api.put('/notifications/settings', next)
      toast.success('Preferências de notificação salvas.')
    },
  })

  if (!settings.values) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="h-96 animate-pulse rounded-xl border bg-muted/30" />
      </div>
    )
  }

  // Cada evento vira uma section com 3 toggles (email/push/sound)
  const sections = EVENTS.map((evt) => ({
    title: evt.label,
    description: evt.description,
    fields: [
      { key: `${evt.key}_email`, label: 'E-mail', type: 'boolean', description: 'Notificação por e-mail.' },
      { key: `${evt.key}_push`, label: 'Push (navegador)', type: 'boolean', description: 'Notificação no desktop/celular.' },
      { key: `${evt.key}_sound`, label: 'Som', type: 'boolean', description: 'Toca som ao receber.' },
    ] as ConfigField[],
  }))

  return (
    <ConfigPage<NotificationForm>
      title="Notificações"
      description="Escolha como ser notificado pra cada tipo de evento."
      icon={Bell}
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
      sections={sections}
      help={{
        description:
          'Cada evento pode notificar por 3 canais independentes: e-mail, push e som. ' +
          'Configurações afetam só você — outros usuários têm preferências próprias.',
        sections: [
          {
            title: 'Push notifications',
            content: 'Exigem permissão do navegador (concedida via popup do browser na primeira vez).',
          },
          {
            title: 'Som',
            content: 'Habilita sons curtos no momento da notificação. Volume controlado pelo sistema.',
          },
        ],
      }}
    />
  )
}
