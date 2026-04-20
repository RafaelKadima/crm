import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Save, Info, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { usePipelines } from '@/hooks/usePipelines'
import {
  useFunnelMapping,
  useUpdateFunnelMapping,
  type FunnelCategory,
} from '@/hooks/useManagerialFunnel'
import { toast } from 'sonner'

export function PipelineFunnelMappingPage() {
  const { data: pipelines } = usePipelines()
  const [pipelineId, setPipelineId] = useState<string>('')

  useEffect(() => {
    if (!pipelineId && pipelines?.length) {
      const def = pipelines.find((p: any) => p.is_default) ?? pipelines[0]
      setPipelineId(def.id)
    }
  }, [pipelines, pipelineId])

  const { data, isLoading } = useFunnelMapping(pipelineId)
  const updateMutation = useUpdateFunnelMapping()

  const [localMapping, setLocalMapping] = useState<Record<string, FunnelCategory>>({})

  useEffect(() => {
    if (data?.stages) {
      const map: Record<string, FunnelCategory> = {}
      data.stages.forEach((s: any) => {
        map[s.id] = s.funnel_category ?? 'unmapped'
      })
      setLocalMapping(map)
    }
  }, [data])

  const handleChange = (stageId: string, category: FunnelCategory) => {
    setLocalMapping({ ...localMapping, [stageId]: category })
  }

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      pipelineId,
      stages: Object.entries(localMapping).map(([id, funnel_category]) => ({
        id,
        funnel_category,
      })),
    })
    toast.success('Mapeamento salvo', {
      description: 'Os relatórios gerenciais já estão usando o novo mapeamento.',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapeamento do Funil Gerencial"
        subtitle="Classifique seus estágios do kanban em categorias universais (Topo → Qualificado → Agendou → …) para que os relatórios gerenciais falem a mesma linguagem."
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5 min-w-[260px]">
            <label className="text-xs font-medium text-muted-foreground">Pipeline</label>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="ml-auto inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar mapeamento
          </button>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Múltiplos estágios podem mapear para a mesma categoria (ex: "Demo Marcada" e
              "Demo Confirmada" podem ambos ser <b>Agendou</b>). Estágios sem mapeamento
              ficam ocultos no relatório gerencial.
            </p>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3">Estágio do seu pipeline</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Categoria gerencial</th>
                    <th className="px-6 py-3 text-right">Probabilidade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stages.map((stage: any, i: number) => (
                    <motion.tr
                      key={stage.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color ?? '#6B7280' }}
                          />
                          <span className="font-medium">{stage.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs capitalize text-muted-foreground">
                          {stage.stage_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={localMapping[stage.id] ?? 'unmapped'}
                          onValueChange={(v: FunnelCategory) => handleChange(stage.id, v)}
                        >
                          <SelectTrigger className="w-[220px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {data.available_categories.map((c: any) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-muted-foreground">
                          {stage.probability ?? 0}%
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Mudanças só são aplicadas ao clicar em "Salvar mapeamento".</span>
          </div>
        </div>
      )}
    </div>
  )
}
