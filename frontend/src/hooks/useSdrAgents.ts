import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import type { SdrAgent, SdrDocument, SdrFaq, SdrKnowledgeEntry, SdrAgentStats } from '../types'

// ============================================================================
// SDR AGENTS
// ============================================================================

export function useSdrAgents() {
  return useQuery({
    queryKey: ['sdr-agents'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SdrAgent[] }>('/sdr-agents')
      return data.data
    },
  })
}

export function useSdrAgent(id: string | undefined) {
  return useQuery({
    queryKey: ['sdr-agents', id],
    queryFn: async () => {
      const { data } = await api.get<{ agent: SdrAgent; stats: SdrAgentStats }>(`/sdr-agents/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateSdrAgent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (agent: Partial<SdrAgent>) => {
      const { data } = await api.post('/sdr-agents', agent)
      return data.agent
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents'] })
    },
  })
}

export function useUpdateSdrAgent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...agent }: Partial<SdrAgent> & { id: string }) => {
      const { data } = await api.put(`/sdr-agents/${id}`, agent)
      return data.agent
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.id] })
    },
  })
}

export function useDeleteSdrAgent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sdr-agents/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents'] })
    },
  })
}

export function useToggleSdrAgentActive() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/sdr-agents/${id}/toggle-active`)
      return data.agent
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', id] })
    },
  })
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export function useSdrDocuments(agentId: string | undefined) {
  return useQuery({
    queryKey: ['sdr-agents', agentId, 'documents'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SdrDocument[] }>(`/sdr-agents/${agentId}/documents`)
      return data.data
    },
    enabled: !!agentId,
  })
}

export function useUploadSdrDocument() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, file, name }: { agentId: string; file: File; name?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (name) formData.append('name', name)
      
      const { data } = await api.post(`/sdr-agents/${agentId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.document
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

export function useDeleteSdrDocument() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, documentId }: { agentId: string; documentId: string }) => {
      await api.delete(`/sdr-agents/${agentId}/documents/${documentId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'documents'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

export function useReprocessSdrDocument() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, documentId }: { agentId: string; documentId: string }) => {
      const { data } = await api.post(`/sdr-agents/${agentId}/documents/${documentId}/reprocess`)
      return data.document
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'documents'] })
    },
  })
}

// ============================================================================
// FAQs
// ============================================================================

export function useSdrFaqs(agentId: string | undefined) {
  return useQuery({
    queryKey: ['sdr-agents', agentId, 'faqs'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SdrFaq[] }>(`/sdr-agents/${agentId}/faqs`)
      return data.data
    },
    enabled: !!agentId,
  })
}

export function useCreateSdrFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, ...faq }: Partial<SdrFaq> & { agentId: string }) => {
      const { data } = await api.post(`/sdr-agents/${agentId}/faqs`, faq)
      return data.faq
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'faqs'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

export function useUpdateSdrFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, faqId, ...faq }: Partial<SdrFaq> & { agentId: string; faqId: string }) => {
      const { data } = await api.put(`/sdr-agents/${agentId}/faqs/${faqId}`, faq)
      return data.faq
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'faqs'] })
    },
  })
}

export function useDeleteSdrFaq() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, faqId }: { agentId: string; faqId: string }) => {
      await api.delete(`/sdr-agents/${agentId}/faqs/${faqId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'faqs'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

// ============================================================================
// KNOWLEDGE ENTRIES
// ============================================================================

export function useSdrKnowledge(agentId: string | undefined) {
  return useQuery({
    queryKey: ['sdr-agents', agentId, 'knowledge'],
    queryFn: async () => {
      const { data } = await api.get<{ 
        data: SdrKnowledgeEntry[]
        categories: string[]
      }>(`/sdr-agents/${agentId}/knowledge`)
      return data
    },
    enabled: !!agentId,
  })
}

export function useCreateSdrKnowledge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, ...entry }: Partial<SdrKnowledgeEntry> & { agentId: string }) => {
      const { data } = await api.post(`/sdr-agents/${agentId}/knowledge`, entry)
      return data.entry
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'knowledge'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

export function useUpdateSdrKnowledge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, entryId, ...entry }: Partial<SdrKnowledgeEntry> & { agentId: string; entryId: string }) => {
      const { data } = await api.put(`/sdr-agents/${agentId}/knowledge/${entryId}`, entry)
      return data.entry
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'knowledge'] })
    },
  })
}

export function useDeleteSdrKnowledge() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, entryId }: { agentId: string; entryId: string }) => {
      await api.delete(`/sdr-agents/${agentId}/knowledge/${entryId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'knowledge'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

// ============================================================================
// PIPELINES
// ============================================================================

export interface StageRule {
  stage_id: string
  trigger: string
  action: string
}

export interface PipelineWithRules {
  id: string
  name: string
  description?: string
  is_primary: boolean
  stages_with_rules: Array<{
    id: string
    name: string
    color: string
    order: number
    trigger: string
    action: string
  }>
}

export function useSdrAgentPipelines(agentId: string | undefined) {
  return useQuery({
    queryKey: ['sdr-agents', agentId, 'pipelines'],
    queryFn: async () => {
      const { data } = await api.get<{ data: PipelineWithRules[] }>(`/sdr-agents/${agentId}/pipelines`)
      return data.data
    },
    enabled: !!agentId,
  })
}

export function useSyncSdrAgentPipelines() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, pipelineIds, primaryPipelineId }: { 
      agentId: string
      pipelineIds: string[]
      primaryPipelineId?: string 
    }) => {
      const { data } = await api.post(`/sdr-agents/${agentId}/pipelines/sync`, {
        pipeline_ids: pipelineIds,
        primary_pipeline_id: primaryPipelineId,
      })
      return data.pipelines
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

export function useUpdateStageRules() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, stageRules }: { 
      agentId: string
      stageRules: StageRule[]
    }) => {
      const { data } = await api.put(`/sdr-agents/${agentId}/stage-rules`, {
        stage_rules: stageRules,
      })
      return data.stage_rules
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId, 'pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

export function useUpdatePipelineInstructions() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ agentId, pipelineInstructions, canMoveLeads }: { 
      agentId: string
      pipelineInstructions?: string
      canMoveLeads?: boolean
    }) => {
      const { data } = await api.put(`/sdr-agents/${agentId}/pipeline-instructions`, {
        pipeline_instructions: pipelineInstructions,
        can_move_leads: canMoveLeads,
      })
      return data.agent
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents', variables.agentId] })
    },
  })
}

// ============================================================================
// TESTS & PREVIEW
// ============================================================================

export function usePreviewSdrPayload(agentId: string | undefined) {
  return useQuery({
    queryKey: ['sdr-agents', agentId, 'preview-payload'],
    queryFn: async () => {
      const { data } = await api.get(`/sdr-agents/${agentId}/preview-payload`)
      return data
    },
    enabled: !!agentId,
  })
}

export function useTestSdrPrompt() {
  return useMutation({
    mutationFn: async ({ agentId, message }: { agentId: string; message: string }) => {
      const { data } = await api.post(`/sdr-agents/${agentId}/test-prompt`, { message })
      return data
    },
  })
}

