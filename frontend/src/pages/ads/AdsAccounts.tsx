import { useState } from 'react';
import { 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Trash2,
  Settings
} from 'lucide-react';
import { useAdAccounts, useConnectAdAccount, useSyncAdAccount } from '@/hooks/useAds';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';

export default function AdsAccounts() {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [platform, setPlatform] = useState<'meta' | 'google'>('meta');
  
  const { data: accounts, isLoading, refetch } = useAdAccounts();
  const connectMutation = useConnectAdAccount();
  const syncMutation = useSyncAdAccount();

  const handleConnect = async () => {
    if (!accessToken.trim()) return;
    
    try {
      await connectMutation.mutateAsync({ platform, access_token: accessToken });
      setShowConnectModal(false);
      setAccessToken('');
    } catch (error) {
      console.error('Failed to connect account:', error);
    }
  };

  const handleSync = async (accountId: string) => {
    try {
      await syncMutation.mutateAsync(accountId);
    } catch (error) {
      console.error('Failed to sync account:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'paused':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'paused': return 'Pausado';
      case 'disconnected': return 'Desconectado';
      case 'error': return 'Erro';
      default: return status;
    }
  };

  const getPlatformIcon = (platform: string) => {
    if (platform === 'meta') {
      return (
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">f</span>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">G</span>
      </div>
    );
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
            Contas de Anúncios
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gerencie suas contas Meta Ads e Google Ads
          </p>
        </div>
        
        <Button onClick={() => setShowConnectModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Conectar Conta
        </Button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts?.map((account) => (
          <Card key={account.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getPlatformIcon(account.platform)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {account.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {account.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                    </p>
                  </div>
                </div>
                {getStatusIcon(account.status)}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ID da Conta:</span>
                  <span className="text-gray-900 dark:text-white font-mono">
                    {account.platform_account_id}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${
                    account.status === 'active' ? 'text-green-600' :
                    account.status === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {getStatusLabel(account.status)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Campanhas:</span>
                  <span className="text-gray-900 dark:text-white">
                    {account.campaigns_count || 0}
                  </span>
                </div>
                {account.last_sync_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Última Sync:</span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(account.last_sync_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {account.last_error && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400">
                  {account.last_error}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleSync(account.id)}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Sincronizar
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty State */}
        {(!accounts || accounts.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma conta conectada
              </h3>
              <p className="text-gray-500 mb-4">
                Conecte sua primeira conta de anúncios para começar a gerenciar suas campanhas.
              </p>
              <Button onClick={() => setShowConnectModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Conectar Conta
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Connect Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar Conta de Anúncios</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plataforma
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlatform('meta')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                    platform === 'meta' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">f</span>
                  </div>
                  <span className="text-sm font-medium">Meta Ads</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setPlatform('google')}
                  disabled
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex flex-col items-center gap-2 opacity-50 cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-600 font-bold text-lg">G</span>
                  </div>
                  <span className="text-sm font-medium">Google Ads</span>
                  <span className="text-xs text-gray-500">Em breve</span>
                </button>
              </div>
            </div>

            {platform === 'meta' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Token
                  </label>
                  <Input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Cole seu Access Token do Meta Business"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Obtenha seu token em{' '}
                    <a 
                      href="https://business.facebook.com/settings/system-users" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Meta Business Settings <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Permissões necessárias:</strong> ads_management, ads_read, 
                    business_management, read_insights
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConnectModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConnect}
                disabled={!accessToken.trim() || connectMutation.isPending}
              >
                {connectMutation.isPending ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Conectando...
                  </>
                ) : (
                  'Conectar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

