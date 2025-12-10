import { useState } from 'react';
import { 
  Plus, 
  Zap, 
  Settings,
  Play,
  Pause,
  Trash2,
  History,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { 
  useAdAutomationRules, 
  useAdAutomationLogs,
  useToggleAutomationRule,
  useDeleteAutomationRule,
  useRollbackAutomationLog,
  useApproveAutomationLog,
  useRejectAutomationLog,
  type AdAutomationRule,
  type AdAutomationLog
} from '@/hooks/useAds';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import RuleBuilder from '@/components/ads/RuleBuilder';

const actionLabels: Record<string, string> = {
  pause_ad: 'Pausar Anúncio',
  resume_ad: 'Ativar Anúncio',
  increase_budget: 'Aumentar Orçamento',
  decrease_budget: 'Reduzir Orçamento',
  duplicate_adset: 'Duplicar Conjunto',
  create_alert: 'Criar Alerta',
};

const metricLabels: Record<string, string> = {
  cpc: 'CPC',
  ctr: 'CTR',
  cpm: 'CPM',
  roas: 'ROAS',
  spend: 'Gasto',
  conversions: 'Conversões',
  impressions: 'Impressões',
  clicks: 'Cliques',
};

export default function AdsAutomation() {
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AdAutomationRule | null>(null);
  
  const { data: rules, isLoading: rulesLoading } = useAdAutomationRules();
  const { data: logsData, isLoading: logsLoading } = useAdAutomationLogs();
  
  const toggleMutation = useToggleAutomationRule();
  const deleteMutation = useDeleteAutomationRule();
  const rollbackMutation = useRollbackAutomationLog();
  const approveMutation = useApproveAutomationLog();
  const rejectMutation = useRejectAutomationLog();

  const handleToggle = async (ruleId: string) => {
    try {
      await toggleMutation.mutateAsync(ruleId);
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return;
    try {
      await deleteMutation.mutateAsync(ruleId);
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleRollback = async (logId: string) => {
    if (!confirm('Tem certeza que deseja reverter esta ação?')) return;
    try {
      await rollbackMutation.mutateAsync(logId);
    } catch (error) {
      console.error('Failed to rollback:', error);
    }
  };

  const handleApprove = async (logId: string) => {
    try {
      await approveMutation.mutateAsync(logId);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (logId: string) => {
    try {
      await rejectMutation.mutateAsync(logId);
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive'; label: string }> = {
      pending: { variant: 'warning', label: 'Pendente' },
      executed: { variant: 'success', label: 'Executado' },
      failed: { variant: 'destructive', label: 'Falhou' },
      rolled_back: { variant: 'default', label: 'Revertido' },
      approved: { variant: 'success', label: 'Aprovado' },
      rejected: { variant: 'destructive', label: 'Rejeitado' },
    };
    const c = config[status] || { variant: 'default', label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCondition = (rule: AdAutomationRule) => {
    const metric = metricLabels[rule.condition.metric] || rule.condition.metric;
    const op = rule.condition.operator;
    const val = rule.condition.value;
    const days = rule.condition.duration_days;
    return `${metric} ${op} ${val} por ${days} dia(s)`;
  };

  const formatAction = (rule: AdAutomationRule) => {
    const action = actionLabels[rule.action.type] || rule.action.type;
    if (rule.action.params?.percent) {
      return `${action} ${rule.action.params.percent}%`;
    }
    return action;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Automação
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Configure regras automáticas para otimizar suas campanhas
          </p>
        </div>
        
        <Button onClick={() => { setEditingRule(null); setShowRuleModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Zap className="w-4 h-4 inline mr-2" />
          Regras ({rules?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4 inline mr-2" />
          Histórico
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {rulesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : rules?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhuma regra configurada
                </h3>
                <p className="text-gray-500 mb-4">
                  Crie sua primeira regra de automação para otimizar suas campanhas automaticamente.
                </p>
                <Button onClick={() => setShowRuleModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Regra
                </Button>
              </CardContent>
            </Card>
          ) : (
            rules?.map((rule) => (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {rule.name}
                        </h3>
                        <Badge variant={rule.is_active ? 'success' : 'default'}>
                          {rule.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {rule.requires_approval && (
                          <Badge variant="warning">Requer Aprovação</Badge>
                        )}
                      </div>
                      
                      {rule.description && (
                        <p className="text-sm text-gray-500 mb-3">{rule.description}</p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded">
                          <span className="text-gray-500">SE:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCondition(rule)}
                          </span>
                        </div>
                        <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded">
                          <span className="text-blue-600 dark:text-blue-400">ENTÃO:</span>{' '}
                          <span className="font-medium text-blue-700 dark:text-blue-300">
                            {formatAction(rule)}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>Frequência: {rule.frequency}</span>
                        <span>•</span>
                        <span>Execuções: {rule.execution_count}</span>
                        {rule.last_executed_at && (
                          <>
                            <span>•</span>
                            <span>Última: {new Date(rule.last_executed_at).toLocaleString('pt-BR')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggle(rule.id)}
                      >
                        {rule.is_active ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => { setEditingRule(rule); setShowRuleModal(true); }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {logsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="w-8 h-8" />
            </div>
          ) : logsData?.data?.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhuma execução registrada
                </h3>
                <p className="text-gray-500">
                  O histórico de execuções aparecerá aqui quando as regras forem executadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Data/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Regra
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Entidade
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Ação
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {logsData?.data?.map((log) => (
                        <tr key={log.id}>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {log.rule?.name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {log.entity_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {actionLabels[log.action_type] || log.action_type}
                          </td>
                          <td className="px-4 py-3">
                            {getStatusBadge(log.status)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {log.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleApprove(log.id)}
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleReject(log.id)}
                                  >
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                              {log.can_rollback && log.status === 'executed' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleRollback(log.id)}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Rule Builder Modal */}
      <Dialog open={showRuleModal} onOpenChange={setShowRuleModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Editar Regra' : 'Nova Regra de Automação'}
            </DialogTitle>
          </DialogHeader>
          <RuleBuilder 
            rule={editingRule}
            onSave={() => setShowRuleModal(false)}
            onCancel={() => setShowRuleModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

