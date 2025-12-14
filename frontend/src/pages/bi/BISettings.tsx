import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/api/axios'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { 
  Loader2, 
  Play, 
  Settings2, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  X,
  Search,
  AlertTriangle,
  ExternalLink,
  ClipboardList,
  BarChart3
} from 'lucide-react'
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
  const [modalOpen, setModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [tempSelectedAccounts, setTempSelectedAccounts] = useState<string[]>([])

  // Busca contas disponíveis
  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['bi-available-accounts'],
    queryFn: async () => {
      const { data } = await api.get('/bi/available-accounts')
      return data as { accounts: AdAccount[], monitored_count: number }
    }
  })

  // Atualiza contas selecionadas quando dados carregam
  useEffect(() => {
    if (accountsData?.accounts) {
      const monitored = accountsData.accounts.filter((a: AdAccount) => a.is_monitored).map((a: AdAccount) => a.id)
      setSelectedAccounts(monitored)
    }
  }, [accountsData])

  // Busca configuração atual
  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ['bi-config'],
    queryFn: async () => {
      const { data } = await api.get('/bi/config')
      return data as BIConfig
    }
  })

  // Busca status do scheduler
  const { data: schedulerStatus } = useQuery({
    queryKey: ['bi-scheduler-status'],
    queryFn: async () => {
      const { data } = await api.get('/bi/scheduler-status')
      return data as SchedulerStatus
    },
    refetchInterval: 30000
  })

  // Mutation para atualizar contas monitoradas
  const updateAccountsMutation = useMutation({
    mutationFn: async (accountIds: string[]) => {
      const { data } = await api.put('/bi/monitored-accounts', { account_ids: accountIds })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bi-available-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['bi-config'] })
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
      queryClient.invalidateQueries({ queryKey: ['bi-config'] })
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
    onSuccess: (data: any) => {
      toast.success(data.message || 'Análise concluída!')
      queryClient.invalidateQueries({ queryKey: ['bi-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['bi-analyses'] })
      queryClient.invalidateQueries({ queryKey: ['bi-actions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao executar análise')
    }
  })

  // Handlers
  const handleRemoveAccount = (accountId: string) => {
    const newSelected = selectedAccounts.filter(id => id !== accountId)
    setSelectedAccounts(newSelected)
    updateAccountsMutation.mutate(newSelected)
  }

  const handleOpenModal = () => {
    setTempSelectedAccounts([...selectedAccounts])
    setSearchTerm('')
    setModalOpen(true)
  }

  const handleModalSave = () => {
    setSelectedAccounts(tempSelectedAccounts)
    updateAccountsMutation.mutate(tempSelectedAccounts)
    setModalOpen(false)
  }

  const handleTempAccountToggle = (accountId: string) => {
    setTempSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId)
      }
      return [...prev, accountId]
    })
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

  // Contas selecionadas (monitoradas)
  const monitoredAccounts = accountsData?.accounts?.filter((a: AdAccount) => 
    selectedAccounts.includes(a.id)
  ) || []

  // Contas filtradas no modal
  const filteredAccounts = accountsData?.accounts?.filter((a: AdAccount) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.platform_account_id.includes(searchTerm)
  ) || []

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
          disabled={runAnalysisMutation.isPending}
          size="lg"
          className="gap-2"
        >
          {runAnalysisMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Gerar Análise Agora
        </Button>
      </div>

      {/* Links rápidos */}
      <div className="flex gap-3">
        <Link to="/bi/actions">
          <Button variant="outline" size="sm" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Ver Ações Pendentes
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
        <Link to="/bi">
          <Button variant="outline" size="sm" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard BI
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
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
                onCheckedChange={(checked: boolean) => {
                  updateConfigMutation.mutate({ auto_analysis_enabled: checked })
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={config?.analysis_frequency ?? 'daily'}
                onValueChange={(value: string) => {
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

      {/* Contas Monitoradas - Nova UX */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Contas Monitoradas
              </CardTitle>
              <CardDescription>
                Contas de anúncios que o BI Agent analisa automaticamente
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenModal}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Conta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {monitoredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhuma conta selecionada</p>
              <p className="text-sm mb-4">Adicione contas para o BI Agent monitorar</p>
              <Button variant="outline" size="sm" onClick={handleOpenModal} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Conta
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {monitoredAccounts.map((account: AdAccount) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border p-4 bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{account.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {account.platform} • {account.platform_account_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {account.status !== 'connected' && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Desconectada
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveAccount(account.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <p className="text-xs text-muted-foreground pt-2">
                {monitoredAccounts.length} conta(s) monitorada(s)
              </p>
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
                As ações sugeridas aparecem em <Link to="/bi/actions" className="text-primary hover:underline">Ações Pendentes</Link>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Adicionar Contas */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar Contas para Monitoramento</DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-[300px] max-h-[400px] pr-2">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma conta encontrada</p>
              </div>
            ) : (
              filteredAccounts.map((account: AdAccount) => (
                <div
                  key={account.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    tempSelectedAccounts.includes(account.id) 
                      ? "border-primary bg-primary/5" 
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleTempAccountToggle(account.id)}
                >
                  <Checkbox
                    checked={tempSelectedAccounts.includes(account.id)}
                    onCheckedChange={() => handleTempAccountToggle(account.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{account.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {account.platform} • {account.platform_account_id}
                    </p>
                  </div>
                  {account.status !== 'connected' && (
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs shrink-0">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Desconectada
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {tempSelectedAccounts.length} selecionada(s)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleModalSave} disabled={updateAccountsMutation.isPending}>
                  {updateAccountsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Salvar Seleção
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
