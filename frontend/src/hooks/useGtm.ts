import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { useAuthStore } from '@/store/authStore'

export interface GtmSettings {
  gtm_container_id: string | null
  gtm_enabled: boolean
  gtm_webhook_url: string | null
  ga4_measurement_id: string | null
}

export interface PipelineStageEvent {
  id: string
  name: string
  slug: string
  order: number
  color: string
  gtm_event_key: string | null
}

export interface PipelineEvents {
  pipeline: {
    id: string
    name: string
  }
  stages: PipelineStageEvent[]
}

export interface EventSuggestion {
  [key: string]: string
}

// GTM Settings
export function useGtmSettings() {
  const { isAuthenticated } = useAuthStore()
  
  return useQuery({
    queryKey: ['gtm', 'settings'],
    queryFn: async () => {
      const response = await api.get('/gtm/settings')
      return response.data as GtmSettings
    },
    enabled: isAuthenticated, // Só executa quando autenticado
  })
}

export function useUpdateGtmSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<GtmSettings>) => {
      const response = await api.put('/gtm/settings', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtm', 'settings'] })
    },
  })
}

// Pipeline Events
export function usePipelineEvents(pipelineId: string) {
  return useQuery({
    queryKey: ['gtm', 'pipeline', pipelineId, 'events'],
    queryFn: async () => {
      const response = await api.get(`/gtm/pipeline/${pipelineId}/events`)
      return response.data as PipelineEvents
    },
    enabled: !!pipelineId,
  })
}

export function useUpdatePipelineEvents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pipelineId, stages }: { pipelineId: string; stages: { id: string; gtm_event_key: string | null }[] }) => {
      const response = await api.put(`/gtm/pipeline/${pipelineId}/events`, { stages })
      return response.data
    },
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: ['gtm', 'pipeline', pipelineId, 'events'] })
    },
  })
}

export function useUpdateStageEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ stageId, gtm_event_key }: { stageId: string; gtm_event_key: string | null }) => {
      const response = await api.put(`/gtm/stage/${stageId}/event`, { gtm_event_key })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gtm'] })
    },
  })
}

// Event Suggestions
export function useEventSuggestions() {
  return useQuery({
    queryKey: ['gtm', 'suggestions'],
    queryFn: async () => {
      const response = await api.get('/gtm/suggestions')
      return response.data.suggestions as EventSuggestion
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}

/**
 * Hook para disparar eventos GTM no frontend.
 */
export function useGtmTrack() {
  const { data: settings } = useGtmSettings()

  const track = (eventName: string, eventData?: Record<string, any>) => {
    if (!settings?.gtm_enabled) return

    // Push para dataLayer do GTM
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: eventName,
        ...eventData,
        timestamp: new Date().toISOString(),
      })
    }
  }

  return { track, isEnabled: settings?.gtm_enabled ?? false }
}

