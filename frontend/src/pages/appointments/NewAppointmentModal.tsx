import { useState, useEffect } from 'react';
import { useCreateAppointment, useAvailableSlots, useAvailableDays } from '../../hooks/useAppointments';
import { useLeads } from '../../hooks/useLeads';
import { useUsers } from '../../hooks/useUsers';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Video, 
  Building, 
  Eye, 
  Phone,
  MapPin,
  Link,
  FileText,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface Props {
  onClose: () => void;
  leadId?: string;
}

const TYPES = [
  { value: 'meeting', label: 'Reunião', icon: Video, color: 'bg-blue-500' },
  { value: 'visit', label: 'Visita à Loja', icon: Building, color: 'bg-purple-500' },
  { value: 'demo', label: 'Demonstração', icon: Eye, color: 'bg-green-500' },
  { value: 'follow_up', label: 'Follow-up', icon: Phone, color: 'bg-orange-500' },
];

const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function NewAppointmentModal({ onClose, leadId }: Props) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('meeting');
  const [selectedLeadId, setSelectedLeadId] = useState(leadId || '');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  const { data: leadsData } = useLeads();
  const { data: usersData } = useUsers();
  const { data: availableDaysData, isLoading: loadingDays } = useAvailableDays(selectedUserId, 14);
  const { data: availableSlotsData, isLoading: loadingSlots } = useAvailableSlots(selectedUserId, selectedDate);
  
  const createMutation = useCreateAppointment();

  const leads = leadsData?.data || [];
  const users = usersData?.data || [];
  const availableDays = availableDaysData?.available_days || [];
  const availableSlots = availableSlotsData?.slots || [];

  // Auto-seleciona o primeiro vendedor disponível
  useEffect(() => {
    if (users.length > 0 && !selectedUserId) {
      const firstSeller = users.find(u => u.role === 'vendedor') || users[0];
      setSelectedUserId(firstSeller?.id || '');
    }
  }, [users, selectedUserId]);

  const handleSubmit = async () => {
    if (!selectedLeadId || !selectedUserId || !selectedDate || !selectedTime) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const scheduledAt = `${selectedDate}T${selectedTime}:00`;

    try {
      await createMutation.mutateAsync({
        lead_id: selectedLeadId,
        user_id: selectedUserId,
        type: selectedType as 'meeting' | 'visit' | 'demo' | 'follow_up' | 'other',
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        title: title || undefined,
        description: description || undefined,
        location: location || undefined,
        meeting_link: meetingLink || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
    }
  };

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-slate-900 rounded-2xl 
                    shadow-2xl border border-slate-700/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div>
            <h2 className="text-xl font-semibold text-white">Novo Agendamento</h2>
            <p className="text-slate-400 text-sm mt-1">
              Passo {step} de 3
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-slate-700/50">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  s <= step ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Type & Lead */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Tipo de Agendamento
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                                ${selectedType === type.value 
                                  ? 'border-cyan-500 bg-cyan-500/10' 
                                  : 'border-slate-700 hover:border-slate-600'}`}
                    >
                      <div className={`p-2 rounded-lg ${type.color}`}>
                        <type.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-white font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Lead *
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3
                           focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Selecione um lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.contact?.name || lead.name || 'Lead sem nome'} - {lead.contact?.phone || 'Sem telefone'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Vendedor Responsável *
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    setSelectedDate('');
                    setSelectedTime('');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3
                           focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Selecione um vendedor</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Selecione a Data
                </label>
                {loadingDays ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                  </div>
                ) : availableDays.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum horário disponível nos próximos dias.</p>
                    <p className="text-sm mt-1">Configure a agenda do vendedor primeiro.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableDays.map((day) => (
                      <button
                        key={day.date}
                        onClick={() => {
                          setSelectedDate(day.date);
                          setSelectedTime('');
                        }}
                        className={`p-3 rounded-lg border text-center transition-all
                                  ${selectedDate === day.date 
                                    ? 'border-cyan-500 bg-cyan-500/10' 
                                    : 'border-slate-700 hover:border-slate-600'}`}
                      >
                        <div className="text-xs text-slate-400 capitalize">{day.day_name}</div>
                        <div className="text-white font-medium">{day.formatted}</div>
                        <div className="text-xs text-cyan-400 mt-1">{day.available_slots} horários</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Selecione o Horário
                  </label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum horário disponível neste dia.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.available}
                          className={`p-2 rounded-lg border text-center transition-all
                                    ${!slot.available 
                                      ? 'border-slate-800 bg-slate-800/50 text-slate-600 cursor-not-allowed'
                                      : selectedTime === slot.time 
                                        ? 'border-cyan-500 bg-cyan-500/10 text-white' 
                                        : 'border-slate-700 hover:border-slate-600 text-white'}`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Duração
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-4 py-2 rounded-lg border transition-all
                                ${duration === d 
                                  ? 'border-cyan-500 bg-cyan-500/10 text-white' 
                                  : 'border-slate-700 hover:border-slate-600 text-slate-400'}`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Título (opcional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Apresentação do produto"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3
                           focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Descrição (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre o agendamento..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3
                           focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
              </div>

              {selectedType === 'visit' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Rua Principal, 123 - Centro"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3
                             focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              )}

              {selectedType === 'meeting' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Link className="w-4 h-4 inline mr-2" />
                    Link da Reunião
                  </label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3
                             focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h4 className="text-white font-medium mb-3">Resumo do Agendamento</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tipo:</span>
                    <span className="text-white">{TYPES.find(t => t.value === selectedType)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lead:</span>
                    <span className="text-white">{selectedLead?.contact?.name || 'Não selecionado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data:</span>
                    <span className="text-white">
                      {selectedDate ? format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Horário:</span>
                    <span className="text-white">{selectedTime || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duração:</span>
                    <span className="text-white">{duration} minutos</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700/50">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!selectedLeadId || !selectedUserId)}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 
                       text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || !selectedDate || !selectedTime}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 
                       text-white font-medium rounded-lg hover:from-green-600 hover:to-emerald-600 
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Criar Agendamento
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

