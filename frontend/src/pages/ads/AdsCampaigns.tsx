import { useState } from 'react';
import { 
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  BarChart3
} from 'lucide-react';
import { useAdCampaigns, useAdAccounts } from '@/hooks/useAds';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

export default function AdsCampaigns() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('');
  
  const { data: accounts } = useAdAccounts();
  const { data: campaigns, isLoading } = useAdCampaigns({
    search: search || undefined,
    status: statusFilter || undefined,
    account_id: accountFilter || undefined,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'destructive'; label: string }> = {
      ACTIVE: { variant: 'success', label: 'Ativo' },
      PAUSED: { variant: 'warning', label: 'Pausado' },
      DELETED: { variant: 'destructive', label: 'Excluído' },
      ARCHIVED: { variant: 'default', label: 'Arquivado' },
    };
    
    const config = statusConfig[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
            Campanhas
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Visualize e gerencie suas campanhas de anúncios
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="">Todos os status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="PAUSED">Pausado</option>
              <option value="ARCHIVED">Arquivado</option>
            </select>

            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
            >
              <option value="">Todas as contas</option>
              {accounts?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campanha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gasto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impressões
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliques
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPC
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conv.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROAS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {campaigns?.data?.map((campaign) => (
                  <tr 
                    key={campaign.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {campaign.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {campaign.account?.name} • {campaign.objective || 'Sem objetivo'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(campaign.spend)}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                      {formatNumber(campaign.impressions)}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                      {formatNumber(campaign.clicks)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`${
                        campaign.ctr >= 2 ? 'text-green-600' :
                        campaign.ctr >= 1 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {campaign.ctr.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                      {formatCurrency(campaign.cpc)}
                    </td>
                    <td className="px-4 py-4 text-right text-gray-600 dark:text-gray-300">
                      {formatNumber(campaign.conversions)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`font-semibold ${
                          campaign.roas >= 2 ? 'text-green-600' :
                          campaign.roas >= 1 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {campaign.roas.toFixed(2)}x
                        </span>
                        {campaign.roas >= 2 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : campaign.roas < 1 ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {(!campaigns?.data || campaigns.data.length === 0) && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma campanha encontrada
              </h3>
              <p className="text-gray-500">
                Conecte uma conta de anúncios para ver suas campanhas aqui.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {campaigns?.meta && campaigns.meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {campaigns.data.length} de {campaigns.meta.total} campanhas
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={campaigns.meta.current_page === 1}
            >
              Anterior
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={campaigns.meta.current_page === campaigns.meta.last_page}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

