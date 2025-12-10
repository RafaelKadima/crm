import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';

export interface AgentTemplate {
  id: string;
  name: string;
  category: string;
  category_name: string;
  category_icon: string;
  description: string;
  system_prompt?: string;
  personality?: string;
  objectives?: string;
  restrictions?: string;
  pipeline_instructions?: string;
  recommended_stages?: Array<{
    name: string;
    color: string;
    order: number;
  }>;
  example_rules?: Array<{
    trigger: string;
    action: string;
    move_to: string;
  }>;
  settings?: Record<string, unknown>;
  icon?: string;
  color?: string;
}

export interface CategoryInfo {
  name: string;
  description: string;
  icon: string;
}

interface TemplatesResponse {
  data: AgentTemplate[];
  categories: Record<string, CategoryInfo>;
}

// Lista todos os templates
export function useAgentTemplates(category?: string) {
  return useQuery<TemplatesResponse>({
    queryKey: ['agent-templates', category],
    queryFn: async () => {
      const params = category ? { category } : {};
      const response = await api.get('/agent-templates', { params });
      return response.data;
    },
  });
}

// Retorna detalhes de um template
export function useAgentTemplate(templateId: string | undefined) {
  return useQuery<{ data: AgentTemplate }>({
    queryKey: ['agent-template', templateId],
    queryFn: async () => {
      const response = await api.get(`/agent-templates/${templateId}`);
      return response.data;
    },
    enabled: !!templateId,
  });
}

// Aplica template a um agente existente
export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      agentId,
      overwrite = false,
    }: {
      templateId: string;
      agentId: string;
      overwrite?: boolean;
    }) => {
      const response = await api.post(`/agent-templates/${templateId}/apply`, {
        agent_id: agentId,
        overwrite,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agent', variables.agentId] });
      queryClient.invalidateQueries({ queryKey: ['sdr-agents'] });
    },
  });
}

// Cria um novo agente a partir do template
export function useCreateAgentFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      name,
      channelId,
      language = 'pt-BR',
      tone = 'professional',
    }: {
      templateId: string;
      name: string;
      channelId?: string;
      language?: string;
      tone?: string;
    }) => {
      const response = await api.post(`/agent-templates/${templateId}/create-agent`, {
        name,
        channel_id: channelId,
        language,
        tone,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-agents'] });
    },
  });
}

