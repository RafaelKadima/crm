import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';

// ==================== TYPES ====================

export interface AgentStageRule {
  id: string;
  sdr_agent_id: string;
  pipeline_stage_id: string;
  trigger_condition: string | null;
  action_template: string | null;
  auto_move_to: string | null;
  notify_human: boolean;
  notification_channel: string | null;
  priority: number;
  is_active: boolean;
  stage?: {
    id: string;
    name: string;
    color: string;
  };
  auto_move_to_stage?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface AgentEscalationRule {
  id: string;
  sdr_agent_id: string;
  condition_type: string;
  condition_value: string;
  action: string;
  notification_template: string | null;
  assign_to_user_id: string | null;
  priority: number;
  is_active: boolean;
  description?: string;
  assign_to_user?: {
    id: string;
    name: string;
  };
}

export const CONDITION_TYPES = {
  keyword: 'Palavras-chave',
  sentiment: 'Sentimento',
  time_in_stage: 'Tempo no estágio',
  explicit_request: 'Pedido explícito',
  message_count: 'Número de mensagens',
  no_response: 'Sem resposta',
} as const;

export const ESCALATION_ACTIONS = {
  pause_agent: 'Pausar agente',
  notify_owner: 'Notificar responsável',
  transfer_ticket: 'Transferir ticket',
  create_task: 'Criar tarefa',
} as const;

// ==================== STAGE RULES ====================

export function useAgentStageRules(agentId: string | undefined) {
  return useQuery<{ data: AgentStageRule[] }>({
    queryKey: ['agent-stage-rules', agentId],
    queryFn: async () => {
      const response = await api.get(`/sdr-agents/${agentId}/rules/stages`);
      return response.data;
    },
    enabled: !!agentId,
  });
}

export function useCreateStageRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      data,
    }: {
      agentId: string;
      data: Partial<AgentStageRule>;
    }) => {
      const response = await api.post(`/sdr-agents/${agentId}/rules/stages`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-stage-rules', variables.agentId] });
    },
  });
}

export function useUpdateStageRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      ruleId,
      data,
    }: {
      agentId: string;
      ruleId: string;
      data: Partial<AgentStageRule>;
    }) => {
      const response = await api.put(`/sdr-agents/${agentId}/rules/stages/${ruleId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-stage-rules', variables.agentId] });
    },
  });
}

export function useDeleteStageRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, ruleId }: { agentId: string; ruleId: string }) => {
      const response = await api.delete(`/sdr-agents/${agentId}/rules/stages/${ruleId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-stage-rules', variables.agentId] });
    },
  });
}

// ==================== ESCALATION RULES ====================

export function useAgentEscalationRules(agentId: string | undefined) {
  return useQuery<{
    data: AgentEscalationRule[];
    condition_types: Record<string, string>;
    actions: Record<string, string>;
  }>({
    queryKey: ['agent-escalation-rules', agentId],
    queryFn: async () => {
      const response = await api.get(`/sdr-agents/${agentId}/rules/escalation`);
      return response.data;
    },
    enabled: !!agentId,
  });
}

export function useCreateEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      data,
    }: {
      agentId: string;
      data: Partial<AgentEscalationRule>;
    }) => {
      const response = await api.post(`/sdr-agents/${agentId}/rules/escalation`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-escalation-rules', variables.agentId] });
    },
  });
}

export function useUpdateEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      ruleId,
      data,
    }: {
      agentId: string;
      ruleId: string;
      data: Partial<AgentEscalationRule>;
    }) => {
      const response = await api.put(`/sdr-agents/${agentId}/rules/escalation/${ruleId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-escalation-rules', variables.agentId] });
    },
  });
}

export function useDeleteEscalationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agentId, ruleId }: { agentId: string; ruleId: string }) => {
      const response = await api.delete(`/sdr-agents/${agentId}/rules/escalation/${ruleId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agent-escalation-rules', variables.agentId] });
    },
  });
}

