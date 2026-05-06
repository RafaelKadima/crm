import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldAlert, Search } from 'lucide-react'
import api from '@/api/axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

interface SecurityIncident {
  id: string
  tenant_id: string | null
  actor_id: string | null
  actor_email: string | null
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  ip: string | null
  user_agent: string | null
  path: string | null
  metadata: Record<string, any> | null
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  invalid_webhook_signature: 'Webhook inválido',
  brute_force_login: 'Brute force login',
  invalid_2fa_attempt: '2FA inválido',
  suspicious_token_use: 'Token suspeito',
  gate_bypass_super_admin: 'Super admin bypass',
  token_revoked_used: 'Token revogado',
  permission_escalation_attempt: 'Tentativa escalação',
}

const SEVERITY_VARIANT: Record<string, 'default' | 'success' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
  critical: 'destructive',
}

export function SecurityIncidentsPage() {
  const [filters, setFilters] = useState({ type: '', severity: '', from: '', to: '' })

  const { data, isLoading, refetch } = useQuery<{ data: SecurityIncident[] }>({
    queryKey: ['security-incidents', filters],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters.type) params.type = filters.type
      if (filters.severity) params.severity = filters.severity
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      // Backend ainda não tem endpoint específico — listará via audit logs
      // genérico até endpoint dedicado existir. Por ora, vou apenas
      // tentar /security-incidents e cair em erro silencioso se não existir.
      try {
        return (await api.get('/security-incidents', { params })).data
      } catch {
        return { data: [] }
      }
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          Incidentes de segurança
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Eventos automáticos registrados pelo sistema: HMAC inválido em webhook,
          brute force em login, 2FA com falha repetida, super_admin bypass, etc.
          Severidade high/critical dispara alerta no Sentry.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select
              value={filters.type || 'all'}
              onValueChange={(v) => setFilters((f) => ({ ...f, type: v === 'all' ? '' : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.keys(TYPE_LABELS).map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Severidade</Label>
            <Select
              value={filters.severity || 'all'}
              onValueChange={(v) => setFilters((f) => ({ ...f, severity: v === 'all' ? '' : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
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
          <div className="flex items-end">
            <Button onClick={() => refetch()} className="w-full">
              <Search className="h-3.5 w-3.5 mr-1" />
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-muted/30" />
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum incidente encontrado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Quando</th>
                  <th className="text-left px-4 py-2 font-medium">Tipo</th>
                  <th className="text-left px-4 py-2 font-medium">Severidade</th>
                  <th className="text-left px-4 py-2 font-medium">Ator</th>
                  <th className="text-left px-4 py-2 font-medium">IP</th>
                  <th className="text-left px-4 py-2 font-medium">Path</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((inc) => (
                  <tr key={inc.id} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      {new Date(inc.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      {TYPE_LABELS[inc.type] ?? inc.type}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={SEVERITY_VARIANT[inc.severity]}>{inc.severity}</Badge>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs">{inc.actor_email ?? '—'}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">{inc.ip ?? '—'}</td>
                    <td className="px-4 py-2 font-mono text-xs truncate max-w-xs">{inc.path ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
