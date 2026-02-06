import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppointments, useCancelAppointment, useConfirmAppointment, useCompleteAppointment, useNoShowAppointment } from '../../hooks/useAppointments';
import { useUsers } from '../../hooks/useUsers';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { 
  CalendarDays, 
  Clock, 
  User, 
  MapPin, 
  Video, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  Filter,
  Building,
  Phone,
  Eye,
  MoreVertical
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import type { Appointment } from '../../types';
import NewAppointmentModal from './NewAppointmentModal';
import AppointmentDetailsModal from './AppointmentDetailsModal';

export default function AppointmentsPage() {
  const { t, i18n } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const dateLocale = i18n.language === 'pt-BR' ? ptBR : enUS;

  const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    meeting: { label: t('appointments.types.meeting'), icon: <Video className="w-4 h-4" />, color: 'bg-blue-500' },
    visit: { label: t('appointments.types.visit'), icon: <Building className="w-4 h-4" />, color: 'bg-purple-500' },
    demo: { label: t('appointments.types.demo'), icon: <Eye className="w-4 h-4" />, color: 'bg-green-500' },
    follow_up: { label: t('appointments.types.follow_up'), icon: <Phone className="w-4 h-4" />, color: 'bg-orange-500' },
    other: { label: t('appointments.types.other'), icon: <CalendarDays className="w-4 h-4" />, color: 'bg-gray-500' },
  };

  const STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
    scheduled: { label: t('appointments.status.scheduled'), color: 'text-blue-600', bgColor: 'bg-blue-100' },
    confirmed: { label: t('appointments.status.confirmed'), color: 'text-green-600', bgColor: 'bg-green-100' },
    completed: { label: t('appointments.status.completed'), color: 'text-muted-foreground', bgColor: 'bg-gray-100' },
    cancelled: { label: t('appointments.status.cancelled'), color: 'text-red-600', bgColor: 'bg-red-100' },
    no_show: { label: t('appointments.status.noShow'), color: 'text-orange-600', bgColor: 'bg-orange-100' },
    rescheduled: { label: t('appointments.status.rescheduled'), color: 'text-purple-600', bgColor: 'bg-purple-100' },
  };

  const { data: appointmentsData, isLoading } = useAppointments({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    user_id: userFilter || undefined,
  });

  const { data: usersData } = useUsers();
  const confirmMutation = useConfirmAppointment();
  const cancelMutation = useCancelAppointment();
  const completeMutation = useCompleteAppointment();
  const noShowMutation = useNoShowAppointment();

  const appointments = appointmentsData?.data || [];
  const users = usersData?.data || [];

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return t('appointments.today');
    if (isTomorrow(date)) return t('appointments.tomorrow');
    return format(date, i18n.language === 'pt-BR' ? "dd 'de' MMMM" : "MMMM dd", { locale: dateLocale });
  };

  const formatTime = (dateStr: string) => {
    return format(parseISO(dateStr), 'HH:mm');
  };

  const handleConfirm = async (id: string) => {
    await confirmMutation.mutateAsync(id);
  };

  const handleCancel = async (id: string) => {
    const reason = prompt(t('appointments.cancelReason'));
    if (reason !== null) {
      await cancelMutation.mutateAsync({ id, reason });
    }
  };

  const handleComplete = async (id: string) => {
    const outcome = prompt(t('appointments.outcomePrompt'));
    await completeMutation.mutateAsync({ id, outcome: outcome || undefined });
  };

  const handleNoShow = async (id: string) => {
    if (confirm(t('appointments.confirmNoShow'))) {
      await noShowMutation.mutateAsync(id);
    }
  };

  // Agrupa agendamentos por data
  const groupedAppointments = appointments.reduce((groups: Record<string, Appointment[]>, appointment: Appointment) => {
    const date = format(parseISO(appointment.scheduled_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedAppointments).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <PageHeader
            title={t('appointments.title')}
            subtitle={t('appointments.subtitle')}
            actions={
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500
                         text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600
                         transition-all shadow-lg shadow-cyan-500/25"
              >
                <Plus className="w-5 h-5" />
                {t('appointments.newAppointment')}
              </button>
            }
          />
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-6 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3 text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">{t('appointments.filters')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">{t('appointments.allStatuses')}</option>
              {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">{t('appointments.allTypes')}</option>
              {Object.entries(TYPE_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm
                       focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">{t('appointments.allSellers')}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${viewMode === 'list'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
              >
                {t('appointments.list')}
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${viewMode === 'calendar'
                            ? 'bg-cyan-500 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white'}`}
              >
                {t('appointments.calendar')}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-slate-800/30 rounded-xl p-12 text-center border border-slate-700/50">
            <CalendarDays className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">{t('appointments.noAppointments')}</h3>
            <p className="text-slate-400 mb-6">
              {t('appointments.startCreating')}
            </p>
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg
                       hover:bg-cyan-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('appointments.createAppointment')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                    <CalendarDays className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-medium">
                      {formatDate(groupedAppointments[date][0].scheduled_at)}
                    </span>
                    <span className="text-slate-500 text-sm">
                      ({format(parseISO(date), 'EEEE', { locale: dateLocale })})
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-slate-700/50"></div>
                  <span className="text-slate-500 text-sm">
                    {groupedAppointments[date].length} {t('appointments.appointmentsCount')}
                  </span>
                </div>

                {/* Appointments List */}
                <div className="grid gap-3">
                  {groupedAppointments[date].map((appointment: Appointment) => {
                    const typeInfo = TYPE_LABELS[appointment.type] || TYPE_LABELS.other;
                    const statusInfo = STATUS_LABELS[appointment.status] || STATUS_LABELS.scheduled;
                    const isOverdue = isPast(parseISO(appointment.scheduled_at)) && 
                                     !['completed', 'cancelled', 'no_show'].includes(appointment.status);

                    return (
                      <div
                        key={appointment.id}
                        className={`bg-slate-800/50 backdrop-blur rounded-xl p-4 border transition-all
                                  hover:border-cyan-500/50 cursor-pointer
                                  ${isOverdue ? 'border-orange-500/50' : 'border-slate-700/50'}`}
                        onClick={() => setSelectedAppointment(appointment)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            {/* Time */}
                            <div className="flex flex-col items-center justify-center w-16 py-2 bg-slate-700/50 rounded-lg">
                              <span className="text-2xl font-bold text-white">
                                {formatTime(appointment.scheduled_at).split(':')[0]}
                              </span>
                              <span className="text-slate-400 text-sm">
                                :{formatTime(appointment.scheduled_at).split(':')[1]}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs 
                                               font-medium text-white ${typeInfo.color}`}>
                                  {typeInfo.icon}
                                  {typeInfo.label}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                                               ${statusInfo.color} ${statusInfo.bgColor}`}>
                                  {statusInfo.label}
                                </span>
                                {isOverdue && (
                                  <span className="flex items-center gap-1 text-orange-400 text-xs">
                                    <AlertCircle className="w-3 h-3" />
                                    {t('appointments.overdue')}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-white font-medium mb-1">
                                {appointment.title || `${typeInfo.label} com ${appointment.lead?.contact?.name || 'Lead'}`}
                              </h3>

                              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <User className="w-4 h-4" />
                                  {appointment.lead?.contact?.name || 'Lead'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {appointment.duration_minutes} min
                                </span>
                                {appointment.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {appointment.location}
                                  </span>
                                )}
                                {appointment.user && (
                                  <span className="flex items-center gap-1 text-cyan-400">
                                    <User className="w-4 h-4" />
                                    {appointment.user.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {appointment.status === 'scheduled' && (
                              <>
                                <button
                                  onClick={() => handleConfirm(appointment.id)}
                                  className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                  title={t('common.confirm')}
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleCancel(appointment.id)}
                                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                  title={t('common.cancel')}
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            {['scheduled', 'confirmed'].includes(appointment.status) && (
                              <div className="relative group">
                                <button className="p-2 text-slate-400 hover:bg-slate-700/50 rounded-lg transition-colors">
                                  <MoreVertical className="w-5 h-5" />
                                </button>
                                <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 rounded-lg shadow-xl 
                                              border border-slate-700 py-1 hidden group-hover:block z-10">
                                  <button
                                    onClick={() => handleComplete(appointment.id)}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50"
                                  >
                                    {t('appointments.markAsCompleted')}
                                  </button>
                                  <button
                                    onClick={() => handleNoShow(appointment.id)}
                                    className="w-full px-3 py-2 text-left text-sm text-orange-400 hover:bg-slate-700/50"
                                  >
                                    {t('appointments.noShow')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <NewAppointmentModal
          onClose={() => setShowNewModal(false)}
        />
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
        />
      )}
    </div>
  );
}

