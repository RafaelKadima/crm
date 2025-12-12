import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Bot,
  Loader2,
  Calendar,
  FileSpreadsheet,
  File,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { toast } from 'sonner'

interface Report {
  type: string
  name: string
  description: string
  formats: string[]
  icon: React.ElementType
  color: string
}

const reports: Report[] = [
  {
    type: 'executive',
    name: 'Relatório Executivo',
    description: 'Visão geral com KPIs principais, tendências e alertas',
    formats: ['json', 'pdf', 'excel'],
    icon: BarChart3,
    color: 'bg-blue-500',
  },
  {
    type: 'sales',
    name: 'Relatório de Vendas',
    description: 'Análise completa do funil de vendas e conversões',
    formats: ['json', 'pdf', 'excel'],
    icon: TrendingUp,
    color: 'bg-green-500',
  },
  {
    type: 'marketing',
    name: 'Relatório de Marketing',
    description: 'Performance de campanhas, ROAS, CPL e atribuição',
    formats: ['json', 'pdf', 'excel'],
    icon: DollarSign,
    color: 'bg-purple-500',
  },
  {
    type: 'support',
    name: 'Relatório de Atendimento',
    description: 'Métricas de suporte, SLA e satisfação',
    formats: ['json', 'pdf', 'excel'],
    icon: Users,
    color: 'bg-orange-500',
  },
  {
    type: 'ai_performance',
    name: 'Performance da IA',
    description: 'Análise de performance dos agentes IA',
    formats: ['json', 'pdf'],
    icon: Bot,
    color: 'bg-pink-500',
  },
]

export function ReportsPage() {
  const [period, setPeriod] = useState('30d')
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [reportData, setReportData] = useState<any>(null)

  // Gerar relatório
  const generateMutation = useMutation({
    mutationFn: async ({ type, period }: { type: string; period: string }) => {
      const response = await api.get(`/bi/reports/${type}`, { params: { period } })
      return response.data
    },
    onSuccess: (data) => {
      setReportData(data)
      toast.success('Relatório gerado!')
    },
    onError: () => {
      toast.error('Erro ao gerar relatório')
    },
  })

  // Exportar PDF
  const exportPdfMutation = useMutation({
    mutationFn: async ({ type, period }: { type: string; period: string }) => {
      const response = await api.post('/bi/reports/export/pdf', {
        report_type: type,
        period,
      })
      return response.data
    },
    onSuccess: (data) => {
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank')
      }
      toast.success('PDF gerado!')
    },
    onError: () => {
      toast.error('Erro ao exportar PDF')
    },
  })

  // Exportar Excel
  const exportExcelMutation = useMutation({
    mutationFn: async ({ dataType, period }: { dataType: string; period: string }) => {
      const response = await api.post('/bi/reports/export/excel', {
        data_type: dataType,
        period,
      })
      return response.data
    },
    onSuccess: (data) => {
      if (data.excel_url) {
        window.open(data.excel_url, '_blank')
      }
      toast.success('Excel gerado!')
    },
    onError: () => {
      toast.error('Erro ao exportar Excel')
    },
  })

  const handleGenerateReport = (type: string) => {
    setSelectedReport(type)
    generateMutation.mutate({ type, period })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Gere relatórios detalhados em PDF, Excel ou JSON
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 rounded-lg border bg-background"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Grid de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report, index) => {
          const Icon = report.icon
          const isSelected = selectedReport === report.type
          const isLoading = generateMutation.isPending && isSelected

          return (
            <motion.div
              key={report.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                isSelected && "ring-2 ring-primary"
              )}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "p-3 rounded-xl",
                      report.color
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex gap-1">
                      {report.formats.includes('pdf') && (
                        <Badge variant="outline" className="text-xs">PDF</Badge>
                      )}
                      {report.formats.includes('excel') && (
                        <Badge variant="outline" className="text-xs">Excel</Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-3">{report.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {report.description}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleGenerateReport(report.type)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <BarChart3 className="h-4 w-4 mr-2" />
                      )}
                      Gerar
                    </Button>
                    {report.formats.includes('pdf') && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => exportPdfMutation.mutate({ type: report.type, period })}
                        disabled={exportPdfMutation.isPending}
                      >
                        {exportPdfMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <File className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {report.formats.includes('excel') && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => exportExcelMutation.mutate({ 
                          dataType: report.type === 'sales' ? 'leads' : 'campaigns',
                          period 
                        })}
                        disabled={exportExcelMutation.isPending}
                      >
                        {exportExcelMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Visualização do Relatório */}
      {reportData && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {reports.find(r => r.type === selectedReport)?.name}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportPdfMutation.mutate({ type: selectedReport!, period })}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportExcelMutation.mutate({ 
                  dataType: selectedReport === 'sales' ? 'leads' : 'campaigns',
                  period 
                })}
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Summary */}
              {reportData.data?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(reportData.data.summary).map(([key, value]) => (
                    <div key={key} className="p-4 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-2xl font-bold">
                        {typeof value === 'number' 
                          ? key.includes('rate') 
                            ? `${(value * 100).toFixed(1)}%`
                            : key.includes('value') || key.includes('revenue')
                              ? `R$ ${value.toLocaleString('pt-BR')}`
                              : value.toLocaleString('pt-BR')
                          : String(value)
                        }
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {reportData.data?.recommendations && (
                <div>
                  <h3 className="font-semibold mb-3">Recomendações</h3>
                  <div className="space-y-2">
                    {reportData.data.recommendations.map((rec: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-3 rounded-lg bg-muted/50"
                      >
                        <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                        <p className="text-sm">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Data */}
              <div>
                <h3 className="font-semibold mb-3">Dados Brutos (JSON)</h3>
                <pre className="p-4 rounded-lg bg-muted overflow-auto max-h-96 text-xs">
                  {JSON.stringify(reportData.data, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

