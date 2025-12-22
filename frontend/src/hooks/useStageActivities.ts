import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { stageActivityTemplatesApi, dealStageActivitiesApi, activitiesDashboardApi } from '@/api/endpoints'
import type { StageActivityTemplate, DealStageActivity } from '@/types'

// =============================================================================
// STAGE ACTIVITY TEMPLATES HOOKS
// =============================================================================

export function useStageActivityTemplates(pipelineId: string, stageId: string) {
  return useQuery({
    queryKey: ['stage-activity-templates', pipelineId, stageId],
    queryFn: async () => {
      const response = await stageActivityTemplatesApi.list(pipelineId, stageId)
      return response.data
    },
    enabled: !!pipelineId && !!stageId,
  })
}

export function useCreateStageActivityTemplate(pipelineId: string, stageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<StageActivityTemplate>) =>
      stageActivityTemplatesApi.create(pipelineId, stageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-activity-templates', pipelineId, stageId] })
    },
  })
}

export function useUpdateStageActivityTemplate(pipelineId: string, stageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StageActivityTemplate> }) =>
      stageActivityTemplatesApi.update(pipelineId, stageId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-activity-templates', pipelineId, stageId] })
    },
  })
}

export function useDeleteStageActivityTemplate(pipelineId: string, stageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => stageActivityTemplatesApi.delete(pipelineId, stageId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-activity-templates', pipelineId, stageId] })
    },
  })
}

export function useReorderStageActivityTemplates(pipelineId: string, stageId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (templateIds: string[]) =>
      stageActivityTemplatesApi.reorder(pipelineId, stageId, templateIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stage-activity-templates', pipelineId, stageId] })
    },
  })
}

// =============================================================================
// DEAL STAGE ACTIVITIES HOOKS
// =============================================================================

export function useLeadStageActivities(leadId: string) {
  return useQuery({
    queryKey: ['lead-stage-activities', leadId],
    queryFn: async () => {
      const response = await dealStageActivitiesApi.list(leadId)
      return response.data
    },
    enabled: !!leadId,
  })
}

export function useLeadAllActivities(leadId: string) {
  return useQuery({
    queryKey: ['lead-all-activities', leadId],
    queryFn: async () => {
      const response = await dealStageActivitiesApi.listAll(leadId)
      return response.data
    },
    enabled: !!leadId,
  })
}

export function useLeadStageProgress(leadId: string) {
  return useQuery({
    queryKey: ['lead-stage-progress', leadId],
    queryFn: async () => {
      const response = await dealStageActivitiesApi.getProgress(leadId)
      return response.data
    },
    enabled: !!leadId,
  })
}

export function useLeadCanAdvance(leadId: string) {
  return useQuery({
    queryKey: ['lead-can-advance', leadId],
    queryFn: async () => {
      const response = await dealStageActivitiesApi.canAdvance(leadId)
      return response.data
    },
    enabled: !!leadId,
  })
}

export function useCompleteStageActivity(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (activityId: string) => dealStageActivitiesApi.complete(leadId, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-stage-activities', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-stage-progress', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-can-advance', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-all-activities', leadId] })
      // Also refresh gamification stats
      queryClient.invalidateQueries({ queryKey: ['gamification'] })
    },
  })
}

export function useSkipStageActivity(leadId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (activityId: string) => dealStageActivitiesApi.skip(leadId, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-stage-activities', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-stage-progress', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-can-advance', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-all-activities', leadId] })
    },
  })
}

// =============================================================================
// ACTIVITIES DASHBOARD HOOKS (Admin)
// =============================================================================

export function useActivitiesDashboard(params?: { user_id?: string }) {
  return useQuery({
    queryKey: ['activities-dashboard', params?.user_id],
    queryFn: async () => {
      const response = await activitiesDashboardApi.getDashboard(params)
      return response.data
    },
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useOverdueActivities(params?: { user_id?: string; pipeline_id?: string; per_page?: number; page?: number }) {
  return useQuery({
    queryKey: ['overdue-activities', params],
    queryFn: async () => {
      const response = await activitiesDashboardApi.getOverdue(params)
      return response.data
    },
  })
}

export function useDueTodayActivities() {
  return useQuery({
    queryKey: ['due-today-activities'],
    queryFn: async () => {
      const response = await activitiesDashboardApi.getDueToday()
      return response.data
    },
  })
}

export function useDueSoonActivities(days = 3) {
  return useQuery({
    queryKey: ['due-soon-activities', days],
    queryFn: async () => {
      const response = await activitiesDashboardApi.getDueSoon(days)
      return response.data
    },
  })
}
