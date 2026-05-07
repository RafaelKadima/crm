import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Loader2, Search, ChevronRight } from 'lucide-react'
import api from '@/api/axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

interface AuditLog {
  id: string
  tenant_id: string | null
  actor_id: string | null
  actor_email: string | null
  actor_is_super_admin: boolean
  action: string
  model_type: string
  model_id: string
  before: Record<string, any> | null
  after: Record<string, any> | null
  changes: string[] | null
  ip: string | null
  user_agent: string | null
  metadata: Record<string, any> | null
  created_at: string
}

interface AuditLogsResponse {
  data: AuditLog[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export function AuditLogsPage() {
  const [filters, setFilters] = useState({
    model_type: '',
    actor_id: '',
    action: '',
    from: '',
    to: '',
  })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const { data, isLoading, refetch } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', filters, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), per_page: '50' }
      if (filters.model_type) params.model_type = filters.model_type
      if (filters.actor_id) params.actor_id = filters.actor_id
      if (filters.action) params.action = filters.action
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      return (await api.get('/audit-logs', { params })).data
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-muted-foreground" />
          Auditoria
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Trilha imutável de mudanças em entidades críticas (User, Tenant,
          Lead, Channel, MetaIntegration, Broadcast, WhatsAppTemplate, etc).
          Append-only — registros não podem ser editados ou deletados.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tipo de model</Label>
            <Select
              value={filters.model_type || 'all'}
              onValueChange={(v) => setFilters((f) => ({ ...f, model_type: v === 'all' ? '' : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="App\Models\User">User</SelectItem>
                <SelectItem value="App\Models\Tenant">Tenant</SelectItem>
                <SelectItem value="App\Models\Lead">Lead</SelectItem>
                <SelectItem value="App\Models\Channel">Channel</SelectItem>
                <SelectItem value="App\Models\MetaIntegration">MetaIntegration</SelectItem>
                <SelectItem value="App\Models\WhatsAppTemplate">WhatsAppTemplate</SelectItem>
                <SelectItem value="App\Models\Broadcast">Broadcast</SelectItem>
                <SelectItem value="App\Models\CustomProfile">CustomProfile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ação</Label>
            <Select
              value={filters.action || 'all'}
              onValueChange={(v) => setFilters((f) => ({ ...f, action: v === 'all' ? '' : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="created">Criado</SelectItem>
                <SelectItem value="updated">Atualizado</SelectItem>
                <SelectItem value="deleted">Excluído</SelectItem>
                <SelectItem value="restored">Restaurado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>
          <div className="space-y-1 flex items-end">
            <Button onClick={() => { setPage(1); refetch() }} className="w-full">
              <Search className="h-3.5 w-3.5 mr-1" />
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted/30" />
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum log encontrado pros filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Quando</th>
                  <th className="text-left px-4 py-2 font-medium">Ator</th>
                  <th className="text-left px-4 py-2 font-medium">Ação</th>
                  <th className="text-left px-4 py-2 font-medium">Entidade</th>
                  <th className="text-left px-4 py-2 font-medium">Mudanças</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => setSelected(log)}>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      {log.actor_email ?? '—'}
                      {log.actor_is_super_admin && <Badge variant="secondary" className="ml-1">SA</Badge>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Badge variant={badgeVariantForAction(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      <span className="font-mono">{shortModelType(log.model_type)}</span>
                      <span className="text-muted-foreground">/{log.model_id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-xs">
                      {log.changes?.slice(0, 3).join(', ')}
                      {log.changes && log.changes.length > 3 && ` +${log.changes.length - 3}`}
                    </td>
                    <td className="px-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.last_page > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {data.total} registros · página {data.current_page} de {data.last_page}
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.last_page, p + 1))} disabled={page >= data.last_page}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      {selected && (
        <Dialog open onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhe do log</DialogTitle>
            </DialogHeader>
            <LogDetail log={selected} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function LogDetail({ log }: { log: AuditLog }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <KV k="ID" v={log.id} mono />
        <KV k="Quando" v={new Date(log.created_at).toLocaleString('pt-BR')} />
        <KV k="Ator" v={log.actor_email ?? '—'} />
        <KV k="Ação" v={log.action} />
        <KV k="Model" v={log.model_type} mono />
        <KV k="Model ID" v={log.model_id} mono />
        <KV k="IP" v={log.ip ?? '—'} />
        <KV k="User Agent" v={log.user_agent ?? '—'} small />
      </div>

      {log.changes && log.changes.length > 0 && (
        <div>
          <p className="font-medium mb-1">Campos alterados</p>
          <div className="flex flex-wrap gap-1">
            {log.changes.map((c) => (
              <Badge key={c} variant="outline" className="font-mono text-xs">{c}</Badge>
            ))}
          </div>
        </div>
      )}

      {log.before && (
        <details>
          <summary className="cursor-pointer font-medium">Estado anterior (before)</summary>
          <pre className="text-xs bg-muted/50 rounded p-3 mt-2 overflow-x-auto">
            {JSON.stringify(log.before, null, 2)}
          </pre>
        </details>
      )}

      {log.after && (
        <details>
          <summary className="cursor-pointer font-medium">Estado novo (after)</summary>
          <pre className="text-xs bg-muted/50 rounded p-3 mt-2 overflow-x-auto">
            {JSON.stringify(log.after, null, 2)}
          </pre>
        </details>
      )}

      {log.metadata && (
        <details>
          <summary className="cursor-pointer font-medium">Metadata</summary>
          <pre className="text-xs bg-muted/50 rounded p-3 mt-2 overflow-x-auto">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

function KV({ k, v, mono, small }: { k: string; v: string; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{k}</p>
      <p className={`${mono ? 'font-mono' : ''} ${small ? 'text-xs' : ''} break-all`}>{v}</p>
    </div>
  )
}

function badgeVariantForAction(action: string): 'default' | 'success' | 'secondary' | 'destructive' | 'outline' {
  return (
    action === 'created' ? 'success' :
    action === 'deleted' ? 'destructive' :
    action === 'updated' ? 'default' :
    'outline'
  )
}

function shortModelType(s: string): string {
  return s.replace('App\\Models\\', '')
}
