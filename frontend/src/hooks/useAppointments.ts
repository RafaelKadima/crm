import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import type { Appointment, UserSchedule } from '../types';

// ==================== TYPES ====================

export interface AppointmentFilters {
  status?: string;
  type?: string;
  user_id?: string;
  lead_id?: string;
  date_from?: string;
  date_to?: string;
  upcoming?: boolean;
  today?: boolean;
}

export interface CreateAppointmentData {
  lead_id: string;
  user_id: string;
  type?: 'meeting' | 'visit' | 'demo' | 'follow_up' | 'other';
  scheduled_at: string;
  duration_minutes?: number;
  title?: string;
  description?: string;
  location?: string;
  meeting_link?: string;
}

export interface ScheduleData {
  user_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  slot_duration?: number;
  is_active?: boolean;
}

export interface AvailableSlot {
  time: string;
  datetime: string;
  available: boolean;
}

export interface AvailableDay {
  date: string;
  day_name: string;
  formatted: string;
  available_slots: number;
}

// ==================== APPOINTMENTS ====================

export function useAppointments(filters?: AppointmentFilters) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, String(value));
          }
        });
      }
      const { data } = await api.get(`/appointments?${params}`);
      return data;
    },
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data } = await api.get(`/appointments/${id}`);
      return data as Appointment;
    },
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAppointmentData) => {
      const response = await api.post('/appointments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateAppointmentData> }) => {
      const response = await api.put(`/appointments/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useConfirmAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/appointments/${id}/confirm`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const response = await api.post(`/appointments/${id}/cancel`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useCompleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, outcome }: { id: string; outcome?: string }) => {
      const response = await api.post(`/appointments/${id}/complete`, { outcome });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useNoShowAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/appointments/${id}/no-show`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, scheduled_at, duration_minutes }: { 
      id: string; 
      scheduled_at: string; 
      duration_minutes?: number;
    }) => {
      const response = await api.post(`/appointments/${id}/reschedule`, {
        scheduled_at,
        duration_minutes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useAvailableSlots(userId: string, date: string) {
  return useQuery({
    queryKey: ['available-slots', userId, date],
    queryFn: async () => {
      const { data } = await api.get('/appointments/available-slots', {
        params: { user_id: userId, date },
      });
      return data as { date: string; user_id: string; slots: AvailableSlot[] };
    },
    enabled: !!userId && !!date,
  });
}

export function useAvailableDays(userId: string, days?: number) {
  return useQuery({
    queryKey: ['available-days', userId, days],
    queryFn: async () => {
      const { data } = await api.get('/appointments/available-days', {
        params: { user_id: userId, days },
      });
      return data as { user_id: string; available_days: AvailableDay[] };
    },
    enabled: !!userId,
  });
}

// ==================== SCHEDULES ====================

export function useUserSchedules(userId?: string) {
  return useQuery({
    queryKey: ['schedules', userId],
    queryFn: async () => {
      const params = userId ? `?user_id=${userId}` : '';
      const { data } = await api.get(`/schedules${params}`);
      return data as { user_id: string; schedules: UserSchedule[] };
    },
  });
}

export function useSetSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ScheduleData) => {
      const response = await api.post('/schedules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useSetWeekSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, schedules }: { userId?: string; schedules: ScheduleData[] }) => {
      const response = await api.post('/schedules/week', {
        user_id: userId,
        schedules,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

