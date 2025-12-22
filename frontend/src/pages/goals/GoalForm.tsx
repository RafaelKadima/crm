import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import {
  ArrowLeft,
  Target,
  DollarSign,
  Activity,
  Users,
  Save,
  Trash2,
  Calculator,
  User,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCreateKpr, useUpdateKpr, useKpr } from '@/hooks/useGoals'
import { usePipelines } from '@/hooks/usePipelines'
import { useUsers } from '@/hooks/useUsers'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/utils'

interface Distribution {
  type: 'user'
  id: string
  name: string
  percentage: number
}

export function GoalForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id

  const { data: kprData, isLoading: loadingKpr } = useKpr(id || '')
  const { data: pipelinesData } = usePipelines()
  const { data: usersData } = useUsers()
  const { data: productsData } = useProducts()

  const createMutation = useCreateKpr()
  const updateMutation = useUpdateKpr()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'revenue' as 'revenue' | 'deals' | 'activities' | 'custom',
    target_value: 0,
    period_start: '',
    period_end: '',
    pipeline_id: '',
    product_id: '',
    status: 'draft' as 'draft' | 'active',
  })

  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [activeTab, setActiveTab] = useState('basic')

  const pipelines = pipelinesData || []
  const allUsers = usersData?.data || []
  const products = productsData?.data || []
  // Filtra apenas vendedores
  const users = allUsers.filter((u: any) => u.role === 'vendedor')

  // Carrega dados do KPR se estiver editando
  useEffect(() => {
    if (kprData?.kpr) {
      const kpr = kprData.kpr
      setFormData({
        name: kpr.name || '',
        description: kpr.description || '',
        type: kpr.type || 'revenue',
        target_value: kpr.target_value || 0,
        period_start: kpr.period_start?.split('T')[0] || '',
        period_end: kpr.period_end?.split('T')[0] || '',
        pipeline_id: kpr.pipeline_id || '',
        product_id: kpr.product_id || '',
        status: kpr.status || 'draft',
      })

      // Carrega distribuições existentes (weight = percentage)
      if (kpr.assignments) {
        const existingDistributions = kpr.assignments
          .filter((a: any) => a.assignable_type?.includes('User'))
          .map((a: any) => ({
            type: 'user' as const,
            id: a.assignable_id,
            name: a.assignee_name || a.assignable?.name || 'N/A',
            percentage: Number(a.weight) || 0,
          }))
        setDistributions(existingDistributions)
      }
    }
  }, [kprData])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addUserDistribution = (userId: string) => {
    const user = allUsers.find((u: any) => u.id === userId)
    if (!user) return

    if (distributions.some((d) => d.id === userId)) {
      toast.error('Este usuário já foi adicionado')
      return
    }

    const remainingPercentage = getRemainingPercentage()
    setDistributions((prev) => [
      ...prev,
      {
        type: 'user',
        id: userId,
        name: user.name,
        percentage: remainingPercentage,
      },
    ])
  }

  const removeDistribution = (index: number) => {
    setDistributions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateDistribution = (index: number, percentage: number) => {
    setDistributions((prev) =>
      prev.map((d, i) => (i === index ? { ...d, percentage } : d))
    )
  }

  const distributeEqually = () => {
    if (distributions.length === 0) return

    const equalPercentage = 100 / distributions.length

    setDistributions((prev) =>
      prev.map((d) => ({
        ...d,
        percentage: Math.round(equalPercentage * 10) / 10,
      }))
    )
  }

  const getTotalPercentage = (): number => {
    return distributions.reduce((sum, d) => sum + (Number(d.percentage) || 0), 0)
  }

  const getRemainingPercentage = () => {
    return Math.max(0, 100 - getTotalPercentage())
  }

  const getCalculatedValue = (percentage: number) => {
    return (percentage / 100) * formData.target_value
  }

  const getTotalDistributedValue = () => {
    return (getTotalPercentage() / 100) * formData.target_value
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'revenue':
        return 'Faturamento'
      case 'deals':
        return 'Negócios Fechados'
      case 'activities':
        return 'Atividades'
      case 'custom':
        return 'Personalizado'
      default:
        return type
    }
  }

  const handleSubmit = async (asDraft = true) => {
    if (!formData.name || !formData.target_value || !formData.period_start || !formData.period_end) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (!asDraft && Math.abs(getTotalPercentage() - 100) > 0.1) {
      toast.error('A distribuição deve totalizar 100%')
      return
    }

    try {
      const payload = {
        ...formData,
        status: asDraft ? 'draft' : 'active',
        target_value: Number(formData.target_value),
        pipeline_id: formData.pipeline_id || undefined,
        product_id: formData.product_id || undefined,
        distributions: distributions.map((d) => ({
          type: d.type,
          id: d.id,
          percentage: d.percentage,
        })),
      }

      if (isEditing) {
        await updateMutation.mutateAsync({ id, data: payload })
        toast.success('Meta atualizada com sucesso!')
      } else {
        await createMutation.mutateAsync(payload as any)
        toast.success('Meta criada com sucesso!')
      }

      navigate('/goals')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar meta')
    }
  }

  if (isEditing && loadingKpr) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/goals')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Meta' : 'Nova Meta'}
          </h1>
          <p className="text-muted-foreground">
            Configure a meta e distribua entre vendedores
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
        </TabsList>

        {/* Basic Info Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Meta</CardTitle>
              <CardDescription>
                Defina o tipo, valor e período da meta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Meta *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Faturamento Q1 2025"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Faturamento
                        </div>
                      </SelectItem>
                      <SelectItem value="deals">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Negócios Fechados
                        </div>
                      </SelectItem>
                      <SelectItem value="activities">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Atividades
                        </div>
                      </SelectItem>
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Personalizado
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva os objetivos e critérios desta meta..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="target_value">
                    {formData.type === 'revenue' ? 'Valor da Meta (R$) *' : 'Quantidade *'}
                  </Label>
                  <Input
                    id="target_value"
                    type="number"
                    min="0"
                    step={formData.type === 'revenue' ? '0.01' : '1'}
                    placeholder={formData.type === 'revenue' ? '100000.00' : '50'}
                    value={formData.target_value}
                    onChange={(e) => handleInputChange('target_value', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period_start">Data Início *</Label>
                  <Input
                    id="period_start"
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => handleInputChange('period_start', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period_end">Data Fim *</Label>
                  <Input
                    id="period_end"
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => handleInputChange('period_end', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pipeline">Pipeline (Opcional)</Label>
                  <Select
                    value={formData.pipeline_id}
                    onValueChange={(value) => handleInputChange('pipeline_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os pipelines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os pipelines</SelectItem>
                      {pipelines.map((pipeline: any) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Se selecionado, apenas leads deste pipeline contarão para a meta
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product">Produto (Opcional)</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => handleInputChange('product_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os produtos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os produtos</SelectItem>
                      {products.map((product: any) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {product.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Para ações promocionais ou metas específicas de um produto
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/goals')}>
              Cancelar
            </Button>
            <Button onClick={() => setActiveTab('distribution')}>
              Próximo: Distribuição
            </Button>
          </div>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Distribuição da Meta</span>
                <Badge variant="outline" className="text-lg">
                  {formData.type === 'revenue'
                    ? formatCurrency(formData.target_value)
                    : `${formData.target_value} ${getTypeLabel(formData.type).toLowerCase()}`}
                </Badge>
              </CardTitle>
              <CardDescription>
                Distribua a meta entre os vendedores por porcentagem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add User */}
              <div className="space-y-2">
                <Label>Adicionar Vendedor</Label>
                <Select onValueChange={addUserDistribution}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                    {users.length === 0 && (
                      <SelectItem value="" disabled>
                        Nenhum vendedor encontrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Distribution List */}
              {distributions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Distribuições</h4>
                    <Button variant="outline" size="sm" onClick={distributeEqually}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Distribuir Igualmente
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {distributions.map((dist, index) => (
                      <div
                        key={`${dist.type}-${dist.id}`}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-[150px]">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{dist.name}</p>
                            <p className="text-xs text-muted-foreground">Vendedor</p>
                          </div>
                        </div>

                        <div className="flex-1 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={dist.percentage}
                              onChange={(e) =>
                                updateDistribution(index, parseFloat(e.target.value) || 0)
                              }
                              className="w-24"
                            />
                            <span className="text-sm font-medium">%</span>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            = {formData.type === 'revenue'
                              ? formatCurrency(getCalculatedValue(dist.percentage))
                              : `${Math.round(getCalculatedValue(dist.percentage))} ${getTypeLabel(formData.type).toLowerCase()}`}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDistribution(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Distribuído</p>
                      <p className="text-lg font-bold">
                        {formData.type === 'revenue'
                          ? formatCurrency(getTotalDistributedValue())
                          : Math.round(getTotalDistributedValue())}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Restante</p>
                      <p
                        className={`text-lg font-bold ${
                          getRemainingPercentage() > 0 ? 'text-yellow-600' : 'text-green-600'
                        }`}
                      >
                        {formData.type === 'revenue'
                          ? formatCurrency((getRemainingPercentage() / 100) * formData.target_value)
                          : Math.round((getRemainingPercentage() / 100) * formData.target_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cobertura</p>
                      <p className={`text-lg font-bold ${
                        Math.abs(getTotalPercentage() - 100) < 0.1 ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {getTotalPercentage().toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {Math.abs(getTotalPercentage() - 100) > 0.1 && (
                    <p className="text-sm text-yellow-600">
                      A distribuição deve totalizar 100% para ativar a meta
                    </p>
                  )}
                </div>
              )}

              {distributions.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold">Nenhuma distribuição</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione vendedores para distribuir a meta
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab('basic')}>
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleSubmit(true)}>
                <Save className="h-4 w-4 mr-2" />
                Salvar como Rascunho
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={distributions.length === 0 || Math.abs(getTotalPercentage() - 100) > 0.1}
              >
                <Target className="h-4 w-4 mr-2" />
                Ativar Meta
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default GoalForm
