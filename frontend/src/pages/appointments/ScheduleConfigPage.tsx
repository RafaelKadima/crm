import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserSchedules, useSetWeekSchedule, type ScheduleData } from '../../hooks/useAppointments';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { 
  Clock, 
  Calendar,
  Save,
  RefreshCw,
  User,
  CheckCircle,
  X,
  Coffee,
  Loader2,
  Settings
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import type { UserSchedule } from '../../types';

const DAY_KEYS = [
  { value: 0, labelKey: 'sunday', shortKey: 'sun' },
  { value: 1, labelKey: 'monday', shortKey: 'mon' },
  { value: 2, labelKey: 'tuesday', shortKey: 'tue' },
  { value: 3, labelKey: 'wednesday', shortKey: 'wed' },
  { value: 4, labelKey: 'thursday', shortKey: 'thu' },
  { value: 5, labelKey: 'friday', shortKey: 'fri' },
  { value: 6, labelKey: 'saturday', shortKey: 'sat' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

const SLOT_DURATIONS = [15, 30, 45, 60];

interface DaySchedule {
  day_of_week: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
  break_start: string;
  break_end: string;
  slot_duration: number;
}

const DEFAULT_SCHEDULE: Omit<DaySchedule, 'day_of_week'> = {
  is_active: true,
  start_time: '08:00',
  end_time: '18:00',
  break_start: '12:00',
  break_end: '13:00',
  slot_duration: 30,
};

export default function ScheduleConfigPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id || '');
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const DAYS = DAY_KEYS.map(day => ({
    value: day.value,
    label: t(`appointments.days.${day.labelKey}`),
    short: t(`appointments.days.${day.shortKey}`),
  }));

  const { data: usersData } = useUsers();
  const { data: schedulesData, isLoading, refetch } = useUserSchedules(selectedUserId);
  const saveMutation = useSetWeekSchedule();

  const users = usersData?.data || [];
  const isAdmin = user?.role === 'admin' || user?.role === 'gestor';

  // Inicializa schedules com dados do backend ou valores padrão
  useEffect(() => {
    if (schedulesData?.schedules) {
      const existingSchedules = schedulesData.schedules;
      
      const fullSchedules = DAYS.map(day => {
        const existing = existingSchedules.find((s: UserSchedule) => s.day_of_week === day.value);
        if (existing) {
          return {
            day_of_week: day.value,
            is_active: existing.is_active,
            start_time: existing.start_time,
            end_time: existing.end_time,
            break_start: existing.break_start || '',
            break_end: existing.break_end || '',
            slot_duration: existing.slot_duration,
          };
        }
        // Default: dias úteis ativos, fim de semana inativo
        return {
          ...DEFAULT_SCHEDULE,
          day_of_week: day.value,
          is_active: day.value >= 1 && day.value <= 5,
        };
      });
      
      setSchedules(fullSchedules);
      setHasChanges(false);
    }
  }, [schedulesData]);

  const updateSchedule = (dayOfWeek: number, field: keyof DaySchedule, value: string | number | boolean) => {
    setSchedules(prev => prev.map(s => 
      s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
    ));
    setHasChanges(true);
  };

  const toggleDay = (dayOfWeek: number) => {
    updateSchedule(dayOfWeek, 'is_active', !schedules.find(s => s.day_of_week === dayOfWeek)?.is_active);
  };

  const copyToAll = (dayOfWeek: number) => {
    const source = schedules.find(s => s.day_of_week === dayOfWeek);
    if (!source) return;

    setSchedules(prev => prev.map(s => ({
      ...s,
      start_time: source.start_time,
      end_time: source.end_time,
      break_start: source.break_start,
      break_end: source.break_end,
      slot_duration: source.slot_duration,
    })));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const activeSchedules = schedules
      .filter(s => s.is_active)
      .map(s => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        break_start: s.break_start || undefined,
        break_end: s.break_end || undefined,
        slot_duration: s.slot_duration,
        is_active: true,
      }));

    const inactiveSchedules = schedules
      .filter(s => !s.is_active)
      .map(s => ({
        day_of_week: s.day_of_week,
        start_time: '00:00',
        end_time: '00:00',
        is_active: false,
        slot_duration: 30,
      }));

    await saveMutation.mutateAsync({
      userId: selectedUserId,
      schedules: [...activeSchedules, ...inactiveSchedules] as ScheduleData[],
    });

    setHasChanges(false);
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <PageHeader
            title={t('appointments.scheduleConfig')}
            subtitle={t('appointments.scheduleConfigSubtitle')}
            actions={
              isAdmin ? (
                <div className="mt-4 md:mt-0">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5
                             focus:ring-2 focus:ring-cyan-500 focus:border-transparent min-w-[200px]"
                  >
                    <option value="">{t('appointments.selectUser')}</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              ) : undefined
            }
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : !selectedUserId ? (
          <div className="bg-slate-800/30 rounded-xl p-12 text-center border border-slate-700/50">
            <User className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">{t('appointments.selectUser')}</h3>
            <p className="text-slate-400">
              {t('appointments.selectUserDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Days Grid */}
            <div className="grid gap-4">
              {DAYS.map((day) => {
                const schedule = schedules.find(s => s.day_of_week === day.value);
                if (!schedule) return null;

                return (
                  <div
                    key={day.value}
                    className={`bg-slate-800/50 backdrop-blur rounded-xl border transition-all
                              ${schedule.is_active 
                                ? 'border-cyan-500/30' 
                                : 'border-slate-700/50 opacity-60'}`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleDay(day.value)}
                            className={`w-12 h-6 rounded-full relative transition-colors
                                      ${schedule.is_active ? 'bg-cyan-500' : 'bg-slate-700'}`}
                          >
                            <span 
                              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                                        ${schedule.is_active ? 'left-6' : 'left-0.5'}`}
                            />
                          </button>
                          <div>
                            <span className="text-white font-medium">{day.label}</span>
                            {schedule.is_active && (
                              <span className="text-slate-400 text-sm ml-2">
                                {schedule.start_time} - {schedule.end_time}
                              </span>
                            )}
                          </div>
                        </div>

                        {schedule.is_active && day.value >= 1 && day.value <= 5 && (
                          <button
                            onClick={() => copyToAll(day.value)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            {t('appointments.copyToAll')}
                          </button>
                        )}
                      </div>

                      {schedule.is_active && (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                          {/* Start Time */}
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {t('appointments.start')}
                            </label>
                            <select
                              value={schedule.start_time}
                              onChange={(e) => updateSchedule(day.value, 'start_time', e.target.value)}
                              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg 
                                       px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            >
                              {TIME_OPTIONS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>

                          {/* End Time */}
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {t('appointments.end')}
                            </label>
                            <select
                              value={schedule.end_time}
                              onChange={(e) => updateSchedule(day.value, 'end_time', e.target.value)}
                              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg 
                                       px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            >
                              {TIME_OPTIONS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>

                          {/* Break Start */}
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              <Coffee className="w-3 h-3 inline mr-1" />
                              {t('appointments.breakStart')}
                            </label>
                            <select
                              value={schedule.break_start}
                              onChange={(e) => updateSchedule(day.value, 'break_start', e.target.value)}
                              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg 
                                       px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            >
                              <option value="">{t('appointments.noBreak')}</option>
                              {TIME_OPTIONS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>

                          {/* Break End */}
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              <Coffee className="w-3 h-3 inline mr-1" />
                              {t('appointments.breakEnd')}
                            </label>
                            <select
                              value={schedule.break_end}
                              onChange={(e) => updateSchedule(day.value, 'break_end', e.target.value)}
                              disabled={!schedule.break_start}
                              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg 
                                       px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent
                                       disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">-</option>
                              {TIME_OPTIONS.map(time => (
                                <option key={time} value={time}>{time}</option>
                              ))}
                            </select>
                          </div>

                          {/* Slot Duration */}
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {t('appointments.slotDuration')}
                            </label>
                            <select
                              value={schedule.slot_duration}
                              onChange={(e) => updateSchedule(day.value, 'slot_duration', parseInt(e.target.value))}
                              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg 
                                       px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            >
                              {SLOT_DURATIONS.map(d => (
                                <option key={d} value={d}>{d} min</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                {t('appointments.weekSummary')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const schedule = schedules.find(s => s.day_of_week === day.value);
                  return (
                    <div
                      key={day.value}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        schedule?.is_active 
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                          : 'bg-slate-700/50 text-slate-500'
                      }`}
                    >
                      <div className="font-medium">{day.short}</div>
                      {schedule?.is_active && (
                        <div className="text-xs opacity-75">
                          {schedule.start_time}-{schedule.end_time}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white 
                         hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {t('appointments.discardChanges')}
              </button>

              <button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 
                         text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-lg shadow-cyan-500/25"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('appointments.saving')}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {t('appointments.saveSchedule')}
                  </>
                )}
              </button>
            </div>

            {saveMutation.isSuccess && (
              <div className="flex items-center gap-2 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400">{t('appointments.scheduleSaved')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

