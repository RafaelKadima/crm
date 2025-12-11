import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Ban,
  AlertCircle,
  Bell,
  CheckCircle,
  Play,
  Clock,
  DollarSign,
  Target,
  Image,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import api from '@/api/axios'

interface Guardrail {
  id: string
  name: string
  description: string
  rule_type: string
  scope: string
  conditions: Record<string, any>
  action: {
    type: string
    message: string
  }
  priority: number
  is_active: boolean
  is_system: boolean
  trigger_count: number
  last_triggered_at: string | null
}

const RULE_TYPES = [
  { value: 'budget_limit', label: 'Limite de Orçamento', icon: DollarSign },
  { value: 'approval_required', label: 'Aprovação Obrigatória', icon: CheckCircle },
  { value: 'time_restriction', label: 'Restrição de Horário', icon: Clock },
  { value: 'objective_allowed', label: 'Objetivos Permitidos', icon: Target },
  { value: 'creative_rules', label: 'Regras de Criativos', icon: Image },
  { value: 'audience_rules', label: 'Regras de Audiência', icon: Users },
  { value: 'daily_spend_limit', label: 'Limite de Gasto Diário', icon: DollarSign },
  { value: 'cpa_threshold', label: 'Limite de CPA', icon: AlertTriangle },
]

const SCOPES = [
  { value: 'campaign', label: 'Campanha' },
  { value: 'adset', label: 'Conjunto de Anúncios' },
  { value: 'ad', label: 'Anúncio' },
  { value: 'account', label: 'Conta' },
  { value: 'all', label: 'Todos' },
]

const ACTION_TYPES = [
  { value: 'block', label: 'Bloquear', icon: Ban, color: 'text-red-600 bg-red-50' },
  { value: 'require_approval', label: 'Requer Aprovação', icon: CheckCircle, color: 'text-yellow-600 bg-yellow-50' },
  { value: 'warn', label: 'Avisar', icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
  { value: 'notify', label: 'Notificar', icon: Bell, color: 'text-blue-600 bg-blue-50' },
]

const CONDITION_OPERATORS = [
  { value: '_gt', label: 'Maior que', symbol: '>' },
  { value: '_gte', label: 'Maior ou igual', symbol: '>=' },
  { value: '_lt', label: 'Menor que', symbol: '<' },
  { value: '_lte', label: 'Menor ou igual', symbol: '<=' },
  { value: '', label: 'Igual a', symbol: '=' },
  { value: '_in', label: 'Está em', symbol: 'IN' },
  { value: '_not_in', label: 'Não está em', symbol: 'NOT IN' },
]

export default function AdsGuardrails() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [selectedGuardrail, setSelectedGuardrail] = useState<Guardrail | null>(null)
  const [testData, setTestData] = useState('{\n  "daily_budget": 100,\n  "objective": "OUTCOME_SALES"\n}')
  const [testResult, setTestResult] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: 'budget_limit',
    scope: 'campaign',
    conditions: {} as Record<string, any>,
    action: {
      type: 'warn',
      message: '',
    },
    priority: 50,
  })
  
  // Condição simples para o formulário
  const [conditionField, setConditionField] = useState('daily_budget')
  const [conditionOperator, setConditionOperator] = useState('_gt')
  const [conditionValue, setConditionValue] = useState('')

  // Busca guardrails
  const { data: guardrailsData, isLoading } = useQuery({
    queryKey: ['ads-guardrails'],
    queryFn: async () => {
      const response = await api.get('/ads/guardrails')
      return response.data
    },
  })

  // Criar guardrail
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/ads/guardrails', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Guardrail criado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['ads-guardrails'] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: () => {
      toast.error('Erro ao criar guardrail')
    },
  })

  // Atualizar guardrail
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.put(`/ads/guardrails/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Guardrail atualizado!')
      queryClient.invalidateQueries({ queryKey: ['ads-guardrails'] })
      setIsModalOpen(false)
      setSelectedGuardrail(null)
      resetForm()
    },
    onError: () => {
      toast.error('Erro ao atualizar guardrail')
    },
  })

  // Toggle ativo/inativo
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/ads/guardrails/${id}/toggle`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Status alterado!')
      queryClient.invalidateQueries({ queryKey: ['ads-guardrails'] })
    },
    onError: () => {
      toast.error('Erro ao alterar status')
    },
  })

  // Excluir guardrail
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ads/guardrails/${id}`)
    },
    onSuccess: () => {
      toast.success('Guardrail removido')
      queryClient.invalidateQueries({ queryKey: ['ads-guardrails'] })
    },
    onError: () => {
      toast.error('Erro ao remover guardrail')
    },
  })

  // Testar guardrail
  const testMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.post(`/ads/guardrails/${id}/test`, { test_data: data })
      return response.data
    },
    onSuccess: (data) => {
      setTestResult(data)
    },
    onError: () => {
      toast.error('Erro ao testar guardrail')
    },
  })

  // Criar regras padrão
  const createDefaultsMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/ads/guardrails/defaults')
      return response.data
    },
    onSuccess: () => {
      toast.success('Guardrails padrão criados!')
      queryClient.invalidateQueries({ queryKey: ['ads-guardrails'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar guardrails padrão')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      rule_type: 'budget_limit',
      scope: 'campaign',
      conditions: {},
      action: { type: 'warn', message: '' },
      priority: 50,
    })
    setConditionField('daily_budget')
    setConditionOperator('_gt')
    setConditionValue('')
  }

  const handleEdit = (guardrail: Guardrail) => {
    setSelectedGuardrail(guardrail)
    setFormData({
      name: guardrail.name,
      description: guardrail.description || '',
      rule_type: guardrail.rule_type,
      scope: guardrail.scope,
      conditions: guardrail.conditions,
      action: guardrail.action,
      priority: guardrail.priority,
    })
    
    // Parse conditions for form
    const condKeys = Object.keys(guardrail.conditions)
    if (condKeys.length > 0) {
      const key = condKeys[0]
      for (const op of CONDITION_OPERATORS) {
        if (key.endsWith(op.value) && op.value !== '') {
          setConditionField(key.replace(op.value, ''))
          setConditionOperator(op.value)
          setConditionValue(String(guardrail.conditions[key]))
          break
        }
      }
      if (conditionField === key) {
        setConditionField(key)
        setConditionOperator('')
        setConditionValue(String(guardrail.conditions[key]))
      }
    }
    
    setIsModalOpen(true)
  }

  const handleTest = (guardrail: Guardrail) => {
    setSelectedGuardrail(guardrail)
    setTestResult(null)
    setIsTestModalOpen(true)
  }

  const handleSubmit = () => {
    // Monta conditions a partir dos campos
    const conditions: Record<string, any> = {}
    if (conditionValue) {
      const fieldKey = conditionField + conditionOperator
      const value = conditionOperator.includes('in') 
        ? conditionValue.split(',').map(v => v.trim())
        : isNaN(Number(conditionValue)) ? conditionValue : Number(conditionValue)
      conditions[fieldKey] = value
    }
    
    const payload = {
      ...formData,
      conditions,
    }
    
    if (selectedGuardrail) {
      updateMutation.mutate({ id: selectedGuardrail.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const runTest = () => {
    if (!selectedGuardrail) return
    try {
      const data = JSON.parse(testData)
      testMutation.mutate({ id: selectedGuardrail.id, data })
    } catch {
      toast.error('JSON inválido')
    }
  }

  const getRuleTypeInfo = (type: string) => {
    return RULE_TYPES.find(r => r.value === type) || RULE_TYPES[0]
  }

  const getActionInfo = (type: string) => {
    return ACTION_TYPES.find(a => a.value === type) || ACTION_TYPES[0]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            Guardrails
          </h1>
          <p className="text-gray-500 mt-1">
            Configure regras de segurança para controlar as ações do agente de Ads
          </p>
        </div>
        <div className="flex gap-2">
          {(!guardrailsData?.data || guardrailsData.data.length === 0) && (
            <Button variant="outline" onClick={() => createDefaultsMutation.mutate()}>
              Criar Padrões
            </Button>
          )}
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Guardrail
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{guardrailsData?.data?.length || 0}</p>
                <p className="text-xs text-gray-500">Total de Guardrails</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {guardrailsData?.data?.filter((g: Guardrail) => g.is_active).length || 0}
                </p>
                <p className="text-xs text-gray-500">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {guardrailsData?.data?.filter((g: Guardrail) => g.action.type === 'block').length || 0}
                </p>
                <p className="text-xs text-gray-500">Bloqueios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {guardrailsData?.data?.reduce((acc: number, g: Guardrail) => acc + g.trigger_count, 0) || 0}
                </p>
                <p className="text-xs text-gray-500">Acionamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Guardrails */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Carregando...
            </CardContent>
          </Card>
        ) : guardrailsData?.data?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum guardrail configurado</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button variant="outline" onClick={() => createDefaultsMutation.mutate()}>
                  Criar Padrões
                </Button>
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Personalizado
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          guardrailsData?.data?.map((guardrail: Guardrail) => {
            const ruleInfo = getRuleTypeInfo(guardrail.rule_type)
            const actionInfo = getActionInfo(guardrail.action.type)
            const RuleIcon = ruleInfo.icon
            const ActionIcon = actionInfo.icon
            
            return (
              <Card key={guardrail.id} className={`transition-all ${!guardrail.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                        <RuleIcon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{guardrail.name}</h3>
                          {guardrail.is_system && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 text-xs">Sistema</Badge>
                          )}
                          <Badge variant="outline" className={`text-xs ${actionInfo.color}`}>
                            <ActionIcon className="w-3 h-3 mr-1" />
                            {actionInfo.label}
                          </Badge>
                        </div>
                        {guardrail.description && (
                          <p className="text-sm text-gray-500 line-clamp-1">{guardrail.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Escopo: {SCOPES.find(s => s.value === guardrail.scope)?.label}</span>
                          <span>Prioridade: {guardrail.priority}</span>
                          <span>Acionado: {guardrail.trigger_count}x</span>
                          {guardrail.last_triggered_at && (
                            <span>Último: {new Date(guardrail.last_triggered_at).toLocaleDateString('pt-BR')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4">
                      <button
                        onClick={() => toggleMutation.mutate(guardrail.id)}
                        className="focus:outline-none"
                      >
                        {guardrail.is_active ? (
                          <ToggleRight className="w-8 h-8 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        )}
                      </button>
                      
                      <Button variant="ghost" size="sm" onClick={() => handleTest(guardrail)}>
                        <Play className="w-4 h-4" />
                      </Button>
                      
                      {!guardrail.is_system && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(guardrail)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('Remover este guardrail?')) {
                                deleteMutation.mutate(guardrail.id)
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) {
          setSelectedGuardrail(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedGuardrail ? 'Editar Guardrail' : 'Novo Guardrail'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Limite de orçamento alto"
                />
              </div>
              <div>
                <Label>Prioridade (0-200)</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional do guardrail"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Regra</Label>
                <Select 
                  value={formData.rule_type} 
                  onValueChange={(v) => setFormData({ ...formData, rule_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Escopo</Label>
                <Select 
                  value={formData.scope} 
                  onValueChange={(v) => setFormData({ ...formData, scope: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPES.map(scope => (
                      <SelectItem key={scope.value} value={scope.value}>{scope.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Condição */}
            <div>
              <Label>Condição</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={conditionField}
                  onChange={(e) => setConditionField(e.target.value)}
                  placeholder="Campo (ex: daily_budget)"
                  className="w-1/3"
                />
                <Select value={conditionOperator} onValueChange={setConditionOperator}>
                  <SelectTrigger className="w-1/3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label} ({op.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="Valor"
                  className="w-1/3"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Para listas, separe por vírgula. Ex: OUTCOME_SALES, OUTCOME_LEADS
              </p>
            </div>
            
            {/* Ação */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ação</Label>
                <Select 
                  value={formData.action.type} 
                  onValueChange={(v) => setFormData({ 
                    ...formData, 
                    action: { ...formData.action, type: v } 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map(action => (
                      <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Mensagem</Label>
                <Input
                  value={formData.action.message}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    action: { ...formData.action, message: e.target.value } 
                  })}
                  placeholder="Mensagem exibida quando acionado"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {selectedGuardrail ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Testar */}
      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Testar Guardrail</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Dados de Teste (JSON)</Label>
              <textarea
                className="w-full h-32 p-3 border rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500"
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
              />
            </div>
            
            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.triggered ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.triggered ? (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">Guardrail Acionado!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Guardrail Não Acionado</span>
                    </>
                  )}
                </div>
                <p className="text-sm">{testResult.message}</p>
                {testResult.action_type && (
                  <Badge className="mt-2">{testResult.action_type}</Badge>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={runTest} disabled={testMutation.isPending}>
              <Play className="w-4 h-4 mr-2" />
              Testar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
