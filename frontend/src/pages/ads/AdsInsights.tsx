import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Trophy,
  DollarSign,
  Zap,
  Filter
} from 'lucide-react';
import { useAdInsights, useApplyInsight, useDismissInsight, type AdInsight } from '@/hooks/useAds';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import InsightCard from '@/components/ads/InsightCard';

const insightTypeConfig = {
  performance_drop: { icon: TrendingDown, label: 'Queda de Performance', color: 'red' },
  opportunity: { icon: TrendingUp, label: 'Oportunidade', color: 'green' },
  budget_alert: { icon: DollarSign, label: 'Alerta de Orçamento', color: 'yellow' },
  winner_ad: { icon: Trophy, label: 'Anúncio Vencedor', color: 'green' },
  suggestion: { icon: Lightbulb, label: 'Sugestão', color: 'blue' },
  anomaly: { icon: AlertTriangle, label: 'Anomalia', color: 'orange' },
};

export default function AdsInsights() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  
  const { data: insightsData, isLoading, refetch } = useAdInsights({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    severity: severityFilter || undefined,
  });

  const applyMutation = useApplyInsight();
  const dismissMutation = useDismissInsight();

  const handleApply = async (insight: AdInsight) => {
    try {
      await applyMutation.mutateAsync({ insightId: insight.id });
    } catch (error) {
      console.error('Failed to apply insight:', error);
    }
  };

  const handleDismiss = async (insight: AdInsight) => {
    try {
      await dismissMutation.mutateAsync({ insightId: insight.id });
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const counts = insightsData?.counts || { total: 0, critical: 0, by_type: {} };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Insights da IA
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Recomendações inteligentes para otimizar suas campanhas
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={counts.critical > 0 ? 'border-red-200 dark:border-red-800' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                counts.critical > 0 
                  ? 'bg-red-100 dark:bg-red-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${
                  counts.critical > 0 ? 'text-red-600' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Críticos</p>
                <p className={`text-xl font-bold ${
                  counts.critical > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                }`}>
                  {counts.critical}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Pendentes</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {counts.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Winners</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {counts.by_type?.winner_ad || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Oportunidades</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {counts.by_type?.opportunity || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Filter className="w-4 h-4 text-gray-400" />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="pending">Pendentes</option>
              <option value="">Todos</option>
              <option value="applied">Aplicados</option>
              <option value="dismissed">Dispensados</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="">Todos os tipos</option>
              {Object.entries(insightTypeConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="">Todas as severidades</option>
              <option value="critical">Crítico</option>
              <option value="warning">Aviso</option>
              <option value="info">Informação</option>
              <option value="success">Sucesso</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      <div className="space-y-4">
        {insightsData?.data?.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onApply={() => handleApply(insight)}
            onDismiss={() => handleDismiss(insight)}
            isApplying={applyMutation.isPending}
            isDismissing={dismissMutation.isPending}
          />
        ))}

        {/* Empty State */}
        {(!insightsData?.data || insightsData.data.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Tudo em ordem!
              </h3>
              <p className="text-gray-500">
                Não há insights pendentes no momento. Continue monitorando suas campanhas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

