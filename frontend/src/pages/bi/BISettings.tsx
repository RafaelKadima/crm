import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Play, Settings2, Clock, Building2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AdAccount {
  id: string
  name: string
  platform: string
  platform_account_id: string
  status: string
  is_monitored: boolean
}

interface SchedulerStatus {
  running: boolean
  next_run: string | null
  schedule: string
}

interface BIConfig {
  auto_analysis_enabled: boolean
  analysis_frequency: string
  monitored_accounts: string[]
}

export default function BISettings() {
  const queryClient = useQueryClient()
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])

  // Busca contas disponíveis
  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['bi-available-accounts'],
    queryFn: async () => {
      const { data } = await api.get('/bi/available-accounts')
      return data as { accounts: AdAccount[], monitored_count: number }
    },
    onSuccess: (data) => {
      const monitored = data.accounts.filter(a => a.is_monitored).map(a => a.id)
      setSelectedAccounts(monitored)
    }
  })

  // Busca configuração atual
  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['bi-config'],
    queryFn: async () => {
      const { data } = await api.get('/bi/config')
      return data as BIConfig
    }
  })

  // Busca status do scheduler
  const { data: schedulerStatus, isLoading: loadingScheduler } = useQuery({
    queryKey: ['bi-scheduler-status'],
    queryFn: async () => {
      const { data } = await api.get('/bi/scheduler-status')
      return data as SchedulerStatus
    },
    refetchInterval: 30000 // Atualiza a cada 30s
  })

  // Mutation para atualizar contas monitoradas
  const updateAccountsMutation = useMutation({
    mutationFn: async (accountIds: string[]) => {
      const { data } = await api.put('/bi/monitored-accounts', { account_ids: accountIds })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bi-available-accounts'])
      queryClient.invalidateQueries(['bi-config'])
      toast.success('Contas monitoradas atualizadas!')
    },
    onError: () => {
      toast.error('Erro ao atualizar contas')
    }
  })

  // Mutation para atualizar configuração
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<BIConfig>) => {
      const { data } = await api.put('/bi/config', updates)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['bi-config'])
      toast.success('Configuração atualizada!')
    },
    onError: () => {
      toast.error('Erro ao atualizar configuração')
    }
  })

  // Mutation para executar análise manual
  const runAnalysisMutation = useMutation({
    mutationFn: async (accountIds?: string[]) => {
      const { data } = await api.post('/bi/run-manual-analysis', { 
        account_ids: accountIds?.length ? accountIds : undefined 
      })
      return data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Análise concluída!')
      queryClient.invalidateQueries(['bi-dashboard'])
      queryClient.invalidateQueries(['bi-analyses'])
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao executar análise')
    }
  })

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId)
      }
      return [...prev, accountId]
    })
  }

  const handleSaveAccounts = () => {
    updateAccountsMutation.mutate(selectedAccounts)
  }

  const handleRunAnalysis = () => {
    runAnalysisMutation.mutate(selectedAccounts.length > 0 ? selectedAccounts : undefined)
  }

  const formatNextRun = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loadingAccounts || loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações do BI Agent</h2>
          <p className="text-muted-foreground">
            Configure as contas monitoradas e a frequência de análise automática
          </p>
        </div>
        <Button 
          onClick={handleRunAnalysis}
          disabled={runAnalysisMutation.isLoading}
          size="lg"
          className="gap-2"
        >
          {runAnalysisMutation.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Gerar Análise Agora
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status do Scheduler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status do Agendador
            </CardTitle>
            <CardDescription>
              Análises automáticas programadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={schedulerStatus?.running ? 'default' : 'secondary'}>
                {schedulerStatus?.running ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" /> Inativo</>
                )}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Agenda:</span>
              <span className="text-sm font-medium">{schedulerStatus?.schedule || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Próxima execução:</span>
              <span className="text-sm font-medium">
                {formatNextRun(schedulerStatus?.next_run || null)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Configurações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Defina como o BI Agent deve funcionar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Análise Automática</Label>
                <p className="text-xs text-muted-foreground">
                  Executar análises automaticamente
                </p>
              </div>
              <Switch
                checked={config?.auto_analysis_enabled ?? false}
                onCheckedChange={(checked) => {
                  updateConfigMutation.mutate({ auto_analysis_enabled: checked })
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={config?.analysis_frequency ?? 'daily'}
                onValueChange={(value) => {
                  updateConfigMutation.mutate({ analysis_frequency: value })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária (6h)</SelectItem>
                  <SelectItem value="twice_daily">2x por dia (6h e 18h)</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contas Monitoradas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Contas Monitoradas
              </CardTitle>
              <CardDescription>
                Selecione as contas de anúncios que o BI Agent deve analisar
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectedAccounts.length} de {accountsData?.accounts.length || 0} selecionadas
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAccounts}
                disabled={updateAccountsMutation.isLoading}
              >
                {updateAccountsMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {accountsData?.accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta de anúncios conectada</p>
              <p className="text-sm">Conecte contas no módulo Ads Intelligence</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {accountsData?.accounts.map((account) => (
                <div
                  key={account.id}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                    selectedAccounts.includes(account.id) 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleAccountToggle(account.id)}
                >
                  <Checkbox
                    checked={selectedAccounts.includes(account.id)}
                    onCheckedChange={() => handleAccountToggle(account.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.platform} • {account.platform_account_id}
                    </p>
                  </div>
                  <Badge 
                    variant={account.status === 'connected' ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {account.status === 'connected' ? 'Conectada' : 'Desconectada'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info sobre análise */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <h4 className="font-medium">Como funciona a análise?</h4>
              <p className="text-sm text-muted-foreground mt-1">
                O BI Agent analisa automaticamente as contas selecionadas no horário configurado.
                A análise inclui:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>Coleta de métricas de vendas, marketing e suporte</li>
                <li>Geração de predições de receita e leads</li>
                <li>Detecção de anomalias e tendências</li>
                <li>Sugestão de ações para otimização</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                Use o botão <strong>"Gerar Análise Agora"</strong> para executar uma análise imediata
                quando precisar de insights urgentes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

