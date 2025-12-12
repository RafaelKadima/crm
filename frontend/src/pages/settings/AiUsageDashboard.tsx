import { motion } from 'framer-motion'
import {
  Zap,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle,
  FileText,
  Mic,
  Image,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  useAiUsageSummary,
  useAiDailyUsage,
  useAvailablePackages,
  usePackagePurchases,
  usePurchasePackage,
  useConfirmPayment,
  usePlans,
} from '@/hooks/useAiUsage'
import { useState } from 'react'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// Componente de barra de progresso circular
function CircularProgress({ percentage, size = 120, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference

  const getColor = () => {
    if (percentage >= 100) return '#ef4444' // red
    if (percentage >= 80) return '#f59e0b' // amber
    return '#22c55e' // green
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
        <span className="text-xs text-muted-foreground">usado</span>
      </div>
    </div>
  )
}

// Componente de barra de progresso linear
function LinearProgress({ used, limit, label, icon: Icon }: { used: number; limit: number; label: string; icon: any }) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0

  const getColor = () => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <span className="font-medium">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export function AiUsageDashboard() {
  const { data: summary, isLoading: summaryLoading } = useAiUsageSummary()
  const { data: dailyUsage, isLoading: dailyLoading } = useAiDailyUsage(30)
  const { data: packages } = useAvailablePackages()
  const { data: purchases } = usePackagePurchases('paid')
  const { data: plansData } = usePlans()
  const purchaseMutation = usePurchasePackage()
  const confirmMutation = useConfirmPayment()

  const [selectedPackage, setSelectedPackage] = useState<{ type: string; id: string } | null>(null)

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Erro ao carregar dados de uso</p>
      </div>
    )
  }

  const handlePurchase = async (type: string, id: string) => {
    try {
      const result = await purchaseMutation.mutateAsync({ packageType: type, packageId: id })
      // Em produção, redirecionar para checkout
      // Por enquanto, confirmamos direto (simulação)
      await confirmMutation.mutateAsync({ purchaseId: result.purchase.id })
      setSelectedPackage(null)
    } catch (error) {
      console.error('Erro ao comprar pacote:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Uso de IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitore seu consumo de Unidades de IA e recursos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={summary.plan === 'growth' ? 'default' : 'secondary'}>
            Plano {summary.plan_label}
          </Badge>
          <span className="text-sm text-muted-foreground">{summary.period}</span>
        </div>
      </div>

      {/* Alertas */}
      {summary.ai_units.percentage >= 80 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-center gap-3 ${
            summary.ai_units.percentage >= 100
              ? 'bg-red-500/10 border border-red-500/20'
              : 'bg-amber-500/10 border border-amber-500/20'
          }`}
        >
          <AlertTriangle className={summary.ai_units.percentage >= 100 ? 'text-red-500' : 'text-amber-500'} />
          <div className="flex-1">
            <p className={`font-medium ${summary.ai_units.percentage >= 100 ? 'text-red-500' : 'text-amber-500'}`}>
              {summary.ai_units.percentage >= 100
                ? 'Limite de Unidades de IA atingido!'
                : 'Você está próximo do limite de Unidades de IA'}
            </p>
            <p className="text-sm text-muted-foreground">
              {summary.ai_units.percentage >= 100
                ? 'Compre um pacote adicional para continuar usando a IA.'
                : `${summary.ai_units.remaining.toLocaleString()} Unidades restantes este mês.`}
            </p>
          </div>
          <Button size="sm" onClick={() => document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' })}>
            Comprar Pacote
          </Button>
        </motion.div>
      )}

      {/* Cards principais */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Card de Unidades de IA */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Unidades de IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <CircularProgress percentage={summary.ai_units.percentage} size={140} />
                
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Usado</p>
                      <p className="text-2xl font-bold">{summary.ai_units.used.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Disponível</p>
                      <p className="text-2xl font-bold">{summary.ai_units.total_available.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Franquia do Plano</p>
                      <p className="text-lg font-semibold">{summary.ai_units.limit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bônus (Pacotes)</p>
                      <p className="text-lg font-semibold text-green-500">+{summary.ai_units.bonus.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Breakdown por modelo */}
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Consumo por Modelo</p>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm">
                          GPT-4o-mini: {summary.ai_units.breakdown['4o_mini'].toLocaleString()} Un
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="text-sm">
                          GPT-4o: {summary.ai_units.breakdown['4o'].toLocaleString()} Un
                        </span>
                        {!summary.ai_units.gpt4o_enabled && (
                          <Badge variant="outline" className="text-xs">Bloqueado</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card de custo */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Custo Real
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Este mês</p>
                <p className="text-3xl font-bold">
                  R$ {summary.ai_cost.cost_brl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-muted-foreground">
                  ≈ US$ {summary.ai_cost.cost_usd.toFixed(2)}
                </p>
              </div>
              
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mensagens IA</span>
                  <span className="font-medium">{summary.ai_cost.messages_sent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tokens usados</span>
                  <span className="font-medium">{summary.ai_cost.tokens_used.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recursos adicionais */}
      <motion.div variants={item} initial="hidden" animate="show">
        <Card>
          <CardHeader>
            <CardTitle>Recursos do Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <LinearProgress
                used={summary.rag.used}
                limit={summary.rag.limit}
                label="Documentos RAG"
                icon={FileText}
              />
              <LinearProgress
                used={summary.audio.used}
                limit={summary.audio.limit}
                label="Minutos de Áudio"
                icon={Mic}
              />
              <LinearProgress
                used={summary.image.used}
                limit={summary.image.limit}
                label="Análises de Imagem"
                icon={Image}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pacotes disponíveis */}
      <div id="packages">
        <motion.div variants={item} initial="hidden" animate="show">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Pacotes Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages?.packages.ai_units && Object.entries(packages.packages.ai_units).map(([id, pkg]) => (
                  <div
                    key={id}
                    className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => setSelectedPackage({ type: 'ai_units', id })}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{pkg.label}</span>
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        R$ {pkg.price.toLocaleString('pt-BR')}
                      </span>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePurchase('ai_units', id)
                        }}
                        disabled={purchaseMutation.isPending}
                      >
                        {purchaseMutation.isPending ? <Spinner className="h-4 w-4" /> : 'Comprar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Outros pacotes */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium mb-4">Pacotes de Recursos</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages?.packages.rag && Object.entries(packages.packages.rag).map(([id, pkg]) => (
                    <div key={id} className="border rounded-lg p-4 hover:border-primary transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{pkg.label}</span>
                      </div>
                      <span className="text-lg font-bold">R$ {pkg.price.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                  {packages?.packages.audio && Object.entries(packages.packages.audio).map(([id, pkg]) => (
                    <div key={id} className="border rounded-lg p-4 hover:border-primary transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Mic className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{pkg.label}</span>
                      </div>
                      <span className="text-lg font-bold">R$ {pkg.price.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                  {packages?.packages.image && Object.entries(packages.packages.image).map(([id, pkg]) => (
                    <div key={id} className="border rounded-lg p-4 hover:border-primary transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{pkg.label}</span>
                      </div>
                      <span className="text-lg font-bold">R$ {pkg.price.toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Compras ativas */}
      {purchases && purchases.length > 0 && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Pacotes Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        purchase.package_type === 'ai_units' ? 'bg-yellow-500/10' :
                        purchase.package_type === 'rag' ? 'bg-blue-500/10' :
                        purchase.package_type === 'audio' ? 'bg-green-500/10' : 'bg-purple-500/10'
                      }`}>
                        {purchase.package_type === 'ai_units' && <Zap className="h-5 w-5 text-yellow-500" />}
                        {purchase.package_type === 'rag' && <FileText className="h-5 w-5 text-blue-500" />}
                        {purchase.package_type === 'audio' && <Mic className="h-5 w-5 text-green-500" />}
                        {purchase.package_type === 'image' && <Image className="h-5 w-5 text-purple-500" />}
                      </div>
                      <div>
                        <p className="font-medium">{purchase.package_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {purchase.remaining.toLocaleString()} / {purchase.quantity.toLocaleString()} restantes
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={purchase.is_active ? 'default' : 'secondary'}>
                        {purchase.is_active ? 'Ativo' : 'Expirado'}
                      </Badge>
                      {purchase.expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expira em {new Date(purchase.expires_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Upgrade de plano */}
      {plansData && summary.plan !== 'growth' && (
        <motion.div variants={item} initial="hidden" animate="show">
          <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Quer mais Unidades de IA?</h3>
                  <p className="text-muted-foreground">
                    Faça upgrade para o plano {summary.plan === 'essencial' ? 'Performance' : 'Growth'} e tenha mais recursos.
                  </p>
                </div>
                <Button className="gap-2">
                  Ver Planos
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default AiUsageDashboard

