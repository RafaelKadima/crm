import { useState } from 'react';
import { useCancelAppointment, useConfirmAppointment, useCompleteAppointment, useRescheduleAppointment } from '../../hooks/useAppointments';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Video, 
  Building,
  Eye,
  Phone,
  Link,
  FileText,
  CheckCircle,
  XCircle,
  RotateCcw,
  MessageSquare,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import type { Appointment } from '../../types';

interface Props {
  appointment: Appointment;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  meeting: <Video className="w-5 h-5" />,
  visit: <Building className="w-5 h-5" />,
  demo: <Eye className="w-5 h-5" />,
  follow_up: <Phone className="w-5 h-5" />,
  other: <Calendar className="w-5 h-5" />,
};

const TYPE_LABELS: Record<string, string> = {
  meeting: 'Reunião',
  visit: 'Visita à Loja',
  demo: 'Demonstração',
  follow_up: 'Follow-up',
  other: 'Outro',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: 'Agendado', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  confirmed: { label: 'Confirmado', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  completed: { label: 'Realizado', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  cancelled: { label: 'Cancelado', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  no_show: { label: 'Não Compareceu', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  rescheduled: { label: 'Reagendado', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
};

export default function AppointmentDetailsModal({ appointment, onClose }: Props) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [outcome, setOutcome] = useState('');

  const confirmMutation = useConfirmAppointment();
  const cancelMutation = useCancelAppointment();
  const completeMutation = useCompleteAppointment();
  const rescheduleMutation = useRescheduleAppointment();

  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;
  const canEdit = ['scheduled', 'confirmed'].includes(appointment.status);

  const handleConfirm = async () => {
    await confirmMutation.mutateAsync(appointment.id);
  };

  const handleCancel = async () => {
    const reason = prompt('Motivo do cancelamento:');
    if (reason !== null) {
      await cancelMutation.mutateAsync({ id: appointment.id, reason });
      onClose();
    }
  };

  const handleComplete = async () => {
    await completeMutation.mutateAsync({ id: appointment.id, outcome: outcome || undefined });
    onClose();
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      alert('Selecione a nova data e horário');
      return;
    }
    await rescheduleMutation.mutateAsync({
      id: appointment.id,
      scheduled_at: `${newDate}T${newTime}:00`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden bg-slate-900 rounded-2xl 
                    shadow-2xl border border-slate-700/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
              {TYPE_ICONS[appointment.type]}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {appointment.title || `${TYPE_LABELS[appointment.type]} com ${appointment.lead?.contact?.name || 'Lead'}`}
              </h2>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date & Time */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-medium">
                {format(parseISO(appointment.scheduled_at), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <div className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                {format(parseISO(appointment.scheduled_at), 'HH:mm')} - {appointment.duration_minutes} min
              </div>
            </div>
          </div>

          {/* Lead */}
          {appointment.lead && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-white font-medium">
                  {appointment.lead.contact?.name || 'Lead'}
                </div>
                {appointment.lead.contact?.phone && (
                  <div className="text-slate-400 text-sm">{appointment.lead.contact.phone}</div>
                )}
                {appointment.lead.contact?.email && (
                  <div className="text-slate-400 text-sm">{appointment.lead.contact.email}</div>
                )}
              </div>
            </div>
          )}

          {/* Responsible */}
          {appointment.user && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Responsável</div>
                <div className="text-white">{appointment.user.name}</div>
              </div>
            </div>
          )}

          {/* Location */}
          {appointment.location && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Local</div>
                <div className="text-white">{appointment.location}</div>
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {appointment.meeting_link && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <Link className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Link da Reunião</div>
                <a 
                  href={appointment.meeting_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline break-all"
                >
                  {appointment.meeting_link}
                </a>
              </div>
            </div>
          )}

          {/* Description */}
          {appointment.description && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Descrição</div>
                <div className="text-white whitespace-pre-wrap">{appointment.description}</div>
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm text-slate-400">Observações</div>
                <div className="text-white whitespace-pre-wrap">{appointment.notes}</div>
              </div>
            </div>
          )}

          {/* Outcome (if completed) */}
          {appointment.outcome && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Resultado</span>
              </div>
              <div className="text-white">{appointment.outcome}</div>
            </div>
          )}

          {/* Reminder Status */}
          {appointment.reminder_sent && (
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 text-sm">
              <span className="text-slate-400">Lembrete enviado em: </span>
              <span className="text-white">
                {appointment.reminder_sent_at 
                  ? format(parseISO(appointment.reminder_sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : 'Sim'}
              </span>
            </div>
          )}

          {/* Confirmation Status */}
          {appointment.confirmation_received && (
            <div className="bg-green-500/10 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Presença confirmada pelo lead</span>
              {appointment.confirmed_at && (
                <span className="text-slate-400">
                  em {format(parseISO(appointment.confirmed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
          )}

          {/* Reschedule Form */}
          {showReschedule && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Reagendar
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nova Data</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2
                             focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Novo Horário</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2
                             focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowReschedule(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReschedule}
                  disabled={rescheduleMutation.isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-purple-500 text-white rounded-lg 
                           hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {rescheduleMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Complete Form */}
          {canEdit && !showReschedule && (
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-white font-medium mb-3">Marcar como Realizado</h4>
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Descreva o resultado do agendamento..."
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm
                         focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-green-500 text-white rounded-lg 
                           hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {canEdit && (
          <div className="flex items-center justify-between p-6 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/20 
                         rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Cancelar
              </button>
              <button
                onClick={() => setShowReschedule(!showReschedule)}
                className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:bg-purple-500/20 
                         rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reagendar
              </button>
            </div>

            {appointment.status === 'scheduled' && (
              <button
                onClick={handleConfirm}
                disabled={confirmMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg 
                         hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {confirmMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Confirmar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

