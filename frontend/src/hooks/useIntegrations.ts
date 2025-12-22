import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { integrationsApi } from '@/api/endpoints'
import type {
  ExternalIntegration,
  ExternalIntegrationMapping,
  ExternalIntegrationLog,
  IntegrationTemplate,
  IntegrationAvailableFields,
  PaginatedResponse,
} from '@/types'

// Fetch all integrations
export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const response = await integrationsApi.list()
      return response.data
    },
  })
}

// Fetch single integration
export function useIntegration(id: string) {
  return useQuery({
    queryKey: ['integrations', id],
    queryFn: async () => {
      const response = await integrationsApi.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

// Create integration
export function useCreateIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<ExternalIntegration> & { mapping?: Record<string, string> }) => {
      const response = await integrationsApi.create(data)
      return response.data.integration
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
  })
}

// Update integration
export function useUpdateIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<ExternalIntegration>) => {
      const response = await integrationsApi.update(id, data)
      return response.data.integration
    },
    onSuccess: (integration) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.setQueryData(['integrations', integration.id], integration)
    },
  })
}

// Delete integration
export function useDeleteIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await integrationsApi.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
    },
  })
}

// Toggle integration active/inactive
export function useToggleIntegration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await integrationsApi.toggle(id)
      return response.data.integration
    },
    onSuccess: (integration) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      queryClient.setQueryData(['integrations', integration.id], integration)
    },
  })
}

// Test integration connection
export function useTestIntegration() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await integrationsApi.test(id)
      return response.data
    },
  })
}

// Get integration logs
export function useIntegrationLogs(id: string, params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['integrations', id, 'logs', params],
    queryFn: async () => {
      const response = await integrationsApi.getLogs(id, params)
      return response.data as PaginatedResponse<ExternalIntegrationLog>
    },
    enabled: !!id,
  })
}

// Retry failed log
export function useRetryIntegrationLog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ integrationId, logId }: { integrationId: string; logId: string }) => {
      const response = await integrationsApi.retryLog(integrationId, logId)
      return response.data.log
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.integrationId, 'logs'] })
    },
  })
}

// Get integration mappings
export function useIntegrationMappings(id: string) {
  return useQuery({
    queryKey: ['integrations', id, 'mappings'],
    queryFn: async () => {
      const response = await integrationsApi.getMappings(id)
      return response.data as ExternalIntegrationMapping[]
    },
    enabled: !!id,
  })
}

// Save integration mapping
export function useSaveIntegrationMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ integrationId, modelType, mapping }: {
      integrationId: string
      modelType: string
      mapping: Record<string, string>
    }) => {
      const response = await integrationsApi.saveMapping(integrationId, { model_type: modelType, mapping })
      return response.data.mapping
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.integrationId, 'mappings'] })
      queryClient.invalidateQueries({ queryKey: ['integrations', variables.integrationId] })
    },
  })
}

// Preview payload
export function usePreviewPayload() {
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const response = await integrationsApi.previewPayload(integrationId)
      return response.data
    },
  })
}

// Get templates
export function useIntegrationTemplates() {
  return useQuery({
    queryKey: ['integration-templates'],
    queryFn: async () => {
      const response = await integrationsApi.getTemplates()
      return response.data as IntegrationTemplate[]
    },
  })
}

// Get available fields
export function useIntegrationAvailableFields() {
  return useQuery({
    queryKey: ['integration-available-fields'],
    queryFn: async () => {
      const response = await integrationsApi.getAvailableFields()
      return response.data as IntegrationAvailableFields
    },
  })
}

// Integration type info
export const integrationTypeInfo = {
  erp: {
    label: 'ERP',
    color: 'bg-blue-500',
    description: 'Sistema de gestao empresarial',
  },
  crm: {
    label: 'CRM',
    color: 'bg-green-500',
    description: 'Sistema de relacionamento',
  },
  sales_system: {
    label: 'Sistema de Vendas',
    color: 'bg-purple-500',
    description: 'Sistema de vendas externo',
  },
  other: {
    label: 'Outro',
    color: 'bg-gray-500',
    description: 'Integracao customizada',
  },
}

// Auth type info
export const authTypeInfo = {
  none: {
    label: 'Sem autenticacao',
    description: 'Nenhuma autenticacao necessaria',
  },
  basic: {
    label: 'Basic Auth',
    description: 'Usuario e senha',
  },
  bearer: {
    label: 'Bearer Token',
    description: 'Token de autorizacao',
  },
  api_key: {
    label: 'API Key',
    description: 'Chave de API no header',
  },
  linx_smart: {
    label: 'Linx Smart API',
    description: 'Autenticacao via token Linx Smart (gerenciado automaticamente)',
  },
}

// Trigger event info
export const triggerEventInfo = {
  lead_created: {
    label: 'Lead criado',
    description: 'Quando um novo lead e criado',
  },
  lead_stage_changed: {
    label: 'Mudanca de estagio',
    description: 'Quando lead muda de estagio no pipeline',
  },
  lead_owner_assigned: {
    label: 'Vendedor atribuido',
    description: 'Quando um vendedor e atribuido ao lead',
  },
}
