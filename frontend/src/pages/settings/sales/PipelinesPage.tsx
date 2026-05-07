import { GitBranch, Construction } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

/**
 * Placeholder — gerenciamento de pipelines hoje está dentro do Kanban
 * (ações inline). UI dedicada em Settings vai consolidar criação/edição
 * de pipelines + stages + activities templates numa única tela.
 */
export function PipelinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          Pipelines
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Funis de vendas, estágios e activities templates.
        </p>
      </div>

      <Card>
        <CardContent className="px-6 py-12 text-center">
          <Construction className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mt-3">
            Em breve. Por enquanto, pipelines são gerenciados dentro do Kanban
            (clique no nome do pipeline → menu de ações).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
