import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

// Types
export interface AdAccount {
  id: string;
  name: string;
  platform: 'meta' | 'google';
  platform_account_id: string;
  platform_account_name: string | null;
  status: 'active' | 'paused' | 'disconnected' | 'error';
  currency: string;
  timezone: string;
  last_sync_at: string | null;
  last_error: string | null;
  campaigns_count?: number;
  created_at: string;
}

export interface AdCampaign {
  id: string;
  ad_account_id: string;
  name: string;
  objective: string | null;
  status: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  budget_type: 'daily' | 'lifetime';
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  account?: AdAccount;
  adsets_count?: number;
  last_sync_at: string | null;
}

export interface AdAd {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  roas: number;
  performance_score: number | null;
  performance_label: 'winner' | 'average' | 'underperforming' | null;
  adset?: { id: string; name: string; campaign?: { id: string; name: string } };
}

export interface AdInsight {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_name: string | null;
  type: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  recommendation: string | null;
  data: Record<string, any> | null;
  suggested_action: {
    type: string;
    entity_type: string;
    entity_id: string;
    params: Record<string, any>;
  } | null;
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
  created_at: string;
}

export interface AdAutomationRule {
  id: string;
  name: string;
  description: string | null;
  ad_account_id: string | null;
  scope: 'account' | 'campaign' | 'adset' | 'ad';
  scope_id: string | null;
  condition: {
    metric: string;
    operator: string;
    value: number;
    duration_days: number;
    aggregation: string;
  };
  action: {
    type: string;
    params: Record<string, any>;
  };
  frequency: 'hourly' | 'daily' | 'weekly';
  cooldown_hours: number;
  max_executions_per_day: number | null;
  is_active: boolean;
  requires_approval: boolean;
  priority: number;
  execution_count: number;
  last_executed_at: string | null;
  account?: AdAccount;
  logs_count?: number;
}

export interface AdAutomationLog {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action_type: string;
  action_params: Record<string, any> | null;
  previous_state: Record<string, any> | null;
  new_state: Record<string, any> | null;
  status: 'pending' | 'executed' | 'failed' | 'rolled_back' | 'approved' | 'rejected';
  error_message: string | null;
  metrics_snapshot: Record<string, any> | null;
  can_rollback: boolean;
  executed_at: string | null;
  created_at: string;
  rule?: { id: string; name: string };
}

export interface DashboardData {
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversion_value: number;
    ctr: number;
    cpc: number;
    roas: number;
  };
  daily: Array<{
    date: string;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
  }>;
  counts: {
    accounts: number;
    active_accounts: number;
    active_campaigns: number;
  };
  top_campaigns: AdCampaign[];
  period: {
    days: number;
    start: string;
    end: string;
  };
}

// API Functions
const fetchAccounts = async (): Promise<AdAccount[]> => {
  const { data } = await api.get('/ads/accounts');
  return data.data;
};

const fetchDashboard = async (days = 30): Promise<DashboardData> => {
  const { data } = await api.get('/ads/dashboard', { params: { days } });
  return data;
};

const fetchCampaigns = async (params?: Record<string, any>): Promise<{ data: AdCampaign[]; meta: any }> => {
  const { data } = await api.get('/ads/campaigns', { params });
  return data;
};

const fetchRanking = async (limit = 20): Promise<{ all: AdAd[]; by_performance: any; counts: any }> => {
  const { data } = await api.get('/ads/ranking', { params: { limit } });
  return data;
};

const fetchInsights = async (params?: Record<string, any>): Promise<{ data: AdInsight[]; counts: any }> => {
  const { data } = await api.get('/ads/insights', { params });
  return data;
};

const fetchRules = async (): Promise<AdAutomationRule[]> => {
  const { data } = await api.get('/ads/rules');
  return data.data;
};

const fetchAutomationLogs = async (params?: Record<string, any>): Promise<{ data: AdAutomationLog[]; meta: any }> => {
  const { data } = await api.get('/ads/automation/logs', { params });
  return data;
};

// Hooks
export function useAdAccounts() {
  return useQuery({
    queryKey: ['ad-accounts'],
    queryFn: fetchAccounts,
  });
}

export function useAdsDashboard(days = 30) {
  return useQuery({
    queryKey: ['ads-dashboard', days],
    queryFn: () => fetchDashboard(days),
  });
}

export function useAdCampaigns(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['ad-campaigns', params],
    queryFn: () => fetchCampaigns(params),
  });
}

export function useAdsRanking(limit = 20) {
  return useQuery({
    queryKey: ['ads-ranking', limit],
    queryFn: () => fetchRanking(limit),
  });
}

export function useAdInsights(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['ad-insights', params],
    queryFn: () => fetchInsights(params),
  });
}

export function useAdAutomationRules() {
  return useQuery({
    queryKey: ['ad-automation-rules'],
    queryFn: fetchRules,
  });
}

export function useAdAutomationLogs(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['ad-automation-logs', params],
    queryFn: () => fetchAutomationLogs(params),
  });
}

// Mutations
export function useConnectAdAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { platform: string; access_token: string }) => {
      const response = await api.post('/ads/accounts', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-accounts'] });
    },
  });
}

export function useSyncAdAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      const response = await api.post(`/ads/accounts/${accountId}/sync`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ads-dashboard'] });
    },
  });
}

export function useApplyInsight() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ insightId, notes }: { insightId: string; notes?: string }) => {
      const response = await api.post(`/ads/insights/${insightId}/apply`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-insights'] });
      queryClient.invalidateQueries({ queryKey: ['ads-dashboard'] });
    },
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ insightId, notes }: { insightId: string; notes?: string }) => {
      const response = await api.post(`/ads/insights/${insightId}/dismiss`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-insights'] });
    },
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<AdAutomationRule>) => {
      const response = await api.post('/ads/rules', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-automation-rules'] });
    },
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ruleId, data }: { ruleId: string; data: Partial<AdAutomationRule> }) => {
      const response = await api.put(`/ads/rules/${ruleId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-automation-rules'] });
    },
  });
}

export function useToggleAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await api.post(`/ads/rules/${ruleId}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-automation-rules'] });
    },
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await api.delete(`/ads/rules/${ruleId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-automation-rules'] });
    },
  });
}

export function useRollbackAutomationLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (logId: string) => {
      const response = await api.post(`/ads/automation/logs/${logId}/rollback`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-automation-logs'] });
      queryClient.invalidateQueries({ queryKey: ['ads-dashboard'] });
    },
  });
}

export function useApproveAutomationLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (logId: string) => {
      const response = await api.post(`/ads/automation/logs/${logId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-automation-logs'] });
      queryClient.invalidateQueries({ queryKey: ['ads-dashboard'] });
    },
  });
}

export function useRejectAutomationLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (logId: string) => {
      const response = await api.post(`/ads/automation/logs/${logId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-automation-logs'] });
    },
  });
}

