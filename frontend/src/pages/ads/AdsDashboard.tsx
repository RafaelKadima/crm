import { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  MousePointer, 
  Target, 
  Eye,
  Users,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { useAdsDashboard, useAdsRanking, useAdInsights } from '@/hooks/useAds';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import MetricsChart from '@/components/ads/MetricsChart';
import InsightCard from '@/components/ads/InsightCard';

const periodOptions = [
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
];

export default function AdsDashboard() {
  const [days, setDays] = useState(30);
  
  const { data: dashboard, isLoading, refetch } = useAdsDashboard(days);
  const { data: ranking } = useAdsRanking(10);
  const { data: insights } = useAdInsights({ status: 'pending' });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ads Intelligence
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Visão geral das suas campanhas de anúncios
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Gasto Total</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(dashboard?.totals.spend || 0)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">ROAS</p>
                <p className="text-2xl font-bold mt-1">
                  {(dashboard?.totals.roas || 0).toFixed(2)}x
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Conversões</p>
                <p className="text-2xl font-bold mt-1">
                  {formatNumber(dashboard?.totals.conversions || 0)}
                </p>
              </div>
              <Target className="w-10 h-10 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">CTR</p>
                <p className="text-2xl font-bold mt-1">
                  {formatPercent(dashboard?.totals.ctr || 0)}
                </p>
              </div>
              <MousePointer className="w-10 h-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Impressões</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(dashboard?.totals.impressions || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <MousePointer className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Cliques</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatNumber(dashboard?.totals.clicks || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">CPC</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(dashboard?.totals.cpc || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Campanhas Ativas</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {dashboard?.counts.active_campaigns || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Performance ao longo do tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsChart data={dashboard?.daily || []} />
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Top Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.top_campaigns.map((campaign, index) => (
                <div 
                  key={campaign.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                      ${index === 0 ? 'bg-yellow-400 text-yellow-900' : 
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}
                    `}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatCurrency(campaign.spend)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      Number(campaign.roas || 0) >= 2 ? 'text-green-600' :
                      Number(campaign.roas || 0) >= 1 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Number(campaign.roas || 0).toFixed(2)}x
                    </p>
                    <p className="text-xs text-gray-500">
                      {Number(campaign.conversions || 0)} conv.
                    </p>
                  </div>
                </div>
              ))}
              
              {(!dashboard?.top_campaigns || dashboard.top_campaigns.length === 0) && (
                <p className="text-center text-gray-500 py-4">
                  Nenhuma campanha encontrada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Insights Ativos
              {insights?.counts?.total > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  {insights.counts.total}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights?.data?.slice(0, 5).map((insight) => (
                <InsightCard key={insight.id} insight={insight} compact />
              ))}
              
              {(!insights?.data || insights.data.length === 0) && (
                <p className="text-center text-gray-500 py-4">
                  Nenhum insight pendente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ad Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Ranking de Anúncios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ranking?.all?.slice(0, 5).map((ad, index) => (
                <div 
                  key={ad.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className={`
                      px-2 py-1 rounded text-xs font-medium
                      ${ad.performance_label === 'winner' ? 'bg-green-100 text-green-700' :
                        ad.performance_label === 'average' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'}
                    `}>
                      {ad.performance_score?.toFixed(0) || '-'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                        {ad.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        CTR: {Number(ad.ctr || 0).toFixed(2)}% | CPC: {formatCurrency(Number(ad.cpc || 0))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {ad.performance_label === 'winner' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : ad.performance_label === 'underperforming' ? (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
              ))}
              
              {(!ranking?.all || ranking.all.length === 0) && (
                <p className="text-center text-gray-500 py-4">
                  Nenhum anúncio com score calculado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

