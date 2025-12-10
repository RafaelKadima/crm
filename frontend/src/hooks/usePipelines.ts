import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pipelinesApi } from '@/api/endpoints'
import api from '@/api/axios'

export interface PipelineStage {
  id: string
  name: string
  slug: string
  color: string
  order: number
  gtm_event_key?: string
}

export interface PipelineUserPermission {
  id: string
  name: string
  email: string
  role: string
  permissions: {
    can_view: boolean
    can_edit: boolean
    can_delete: boolean
    can_manage_leads: boolean
  }
}

export interface SdrAgent {
  id: string
  name: string
  personality?: string
  is_active: boolean
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  is_default: boolean
  is_public: boolean
  sdr_agent_id?: string | null
  sdr_agent?: SdrAgent | null
  stages: PipelineStage[]
  users?: PipelineUserPermission[]
  user_permissions?: {
    can_view: boolean
    can_edit: boolean
    can_manage_leads: boolean
    is_admin: boolean
  }
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const response = await pipelinesApi.list()
      return response.data.data || response.data
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: ['pipeline', id],
    queryFn: async () => {
      const response = await pipelinesApi.get(id)
      return response.data as Pipeline
    },
    enabled: !!id,
  })
}

export function usePipelineStages(pipelineId: string) {
  return useQuery({
    queryKey: ['pipeline-stages', pipelineId],
    queryFn: async () => {
      const response = await pipelinesApi.stages(pipelineId)
      return response.data.data || response.data
    },
    enabled: !!pipelineId,
  })
}

export function useCreatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      is_default?: boolean
      is_public?: boolean
      sdr_agent_id?: string | null
      stages?: Array<{ name: string; color?: string; order?: number }>
      user_ids?: string[]
    }) => {
      const response = await api.post('/pipelines', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      description?: string
      is_default?: boolean
      is_public?: boolean
      sdr_agent_id?: string | null
    }) => {
      const response = await api.put(`/pipelines/${id}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline', variables.id] })
    },
  })
}

export function useDeletePipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/pipelines/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })
}

// Stages
export function useCreateStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pipelineId,
      ...data
    }: {
      pipelineId: string
      name: string
      color?: string
      order?: number
      gtm_event_key?: string
    }) => {
      const response = await api.post(`/pipelines/${pipelineId}/stages`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline', variables.pipelineId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', variables.pipelineId] })
    },
  })
}

export function useUpdateStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pipelineId,
      stageId,
      ...data
    }: {
      pipelineId: string
      stageId: string
      name?: string
      color?: string
      order?: number
      gtm_event_key?: string
    }) => {
      const response = await api.put(`/pipelines/${pipelineId}/stages/${stageId}`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline', variables.pipelineId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', variables.pipelineId] })
    },
  })
}

export function useDeleteStage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) => {
      const response = await api.delete(`/pipelines/${pipelineId}/stages/${stageId}`)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline', variables.pipelineId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', variables.pipelineId] })
    },
  })
}

// User Permissions
export function usePipelineUsers(pipelineId: string) {
  return useQuery({
    queryKey: ['pipeline-users', pipelineId],
    queryFn: async () => {
      const response = await api.get(`/pipelines/${pipelineId}/users`)
      return response.data as PipelineUserPermission[]
    },
    enabled: !!pipelineId,
  })
}

export function useAddUserToPipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pipelineId,
      userId,
      permissions,
    }: {
      pipelineId: string
      userId: string
      permissions?: {
        can_view?: boolean
        can_edit?: boolean
        can_delete?: boolean
        can_manage_leads?: boolean
      }
    }) => {
      const response = await api.post(`/pipelines/${pipelineId}/users`, {
        user_id: userId,
        ...permissions,
      })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-users', variables.pipelineId] })
    },
  })
}

export function useUpdateUserPipelinePermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pipelineId,
      userId,
      permissions,
    }: {
      pipelineId: string
      userId: string
      permissions: {
        can_view?: boolean
        can_edit?: boolean
        can_delete?: boolean
        can_manage_leads?: boolean
      }
    }) => {
      const response = await api.put(`/pipelines/${pipelineId}/users/${userId}`, permissions)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-users', variables.pipelineId] })
    },
  })
}

export function useRemoveUserFromPipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pipelineId, userId }: { pipelineId: string; userId: string }) => {
      const response = await api.delete(`/pipelines/${pipelineId}/users/${userId}`)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-users', variables.pipelineId] })
    },
  })
}

export function useSyncPipelineUsers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pipelineId,
      users,
    }: {
      pipelineId: string
      users: Array<{
        user_id: string
        can_view?: boolean
        can_edit?: boolean
        can_delete?: boolean
        can_manage_leads?: boolean
      }>
    }) => {
      const response = await api.post(`/pipelines/${pipelineId}/users/sync`, { users })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-users', variables.pipelineId] })
    },
  })
}
