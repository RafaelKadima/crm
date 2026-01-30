import { useState } from 'react'
import { X, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2, Activity } from 'lucide-react'
import { useIntegrationLogs, useRetryIntegrationLog } from '@/hooks/useIntegrations'
import type { ExternalIntegrationLog } from '@/types'
import { toast } from 'sonner'

interface IntegrationLogsDrawerProps {
  isOpen: boolean
  onClose: () => void
  integrationId: string
  integrationName: string
}

export function IntegrationLogsDrawer({ isOpen, onClose, integrationId, integrationName }: IntegrationLogsDrawerProps) {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const { data: logsData, isLoading, refetch } = useIntegrationLogs(integrationId, {
    page,
    status: statusFilter || undefined,
  })
  const retryMutation = useRetryIntegrationLog()

  const handleRetry = async (logId: string) => {
    try {
      await retryMutation.mutateAsync({ integrationId, logId })
      toast.success('Reenvio realizado com sucesso!')
      refetch()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao reenviar')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  const logs = logsData?.data || []
  const totalPages = logsData?.last_page || 1

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-[500px] bg-muted h-full overflow-hidden flex flex-col shadow-2xl border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-muted/80">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Logs - {integrationName}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/50">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-sm bg-accent border border-border rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Todos os status</option>
            <option value="success">Sucesso</option>
            <option value="error">Erro</option>
          </select>
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-white"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Logs list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mb-2 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {logs.map((log: ExternalIntegrationLog) => (
                <div key={log.id} className="p-4 hover:bg-accent/30 transition-colors">
                  {/* Log header */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-3">
                      {log.status === 'success' ? (
                        <div className="p-1 bg-green-500/20 rounded-full">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                      ) : (
                        <div className="p-1 bg-red-500/20 rounded-full">
                          <XCircle className="w-4 h-4 text-red-400" />
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-gray-200">{formatDate(log.executed_at)}</span>
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          log.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {log.status === 'success' ? 'Sucesso' : 'Erro'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.status === 'error' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRetry(log.id); }}
                          disabled={retryMutation.isPending}
                          className="px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
                        >
                          {retryMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Reenviar'
                          )}
                        </button>
                      )}
                      {expandedLog === log.id ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Log details (expandable) */}
                  {expandedLog === log.id && (
                    <div className="mt-4 space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-muted-foreground mb-2">Request:</p>
                        <pre className="p-3 bg-background rounded-lg text-xs text-muted-foreground overflow-x-auto border border-border">
                          {JSON.stringify(log.request_payload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground mb-2">Response:</p>
                        <pre className={`p-3 rounded-lg text-xs overflow-x-auto border ${
                          log.status === 'success'
                            ? 'bg-green-900/20 border-green-700/50 text-green-300'
                            : 'bg-red-900/20 border-red-700/50 text-red-300'
                        }`}>
                          {JSON.stringify(log.response_payload, null, 2)}
                        </pre>
                      </div>
                      {log.http_status_code && (
                        <p className="text-xs text-muted-foreground">
                          HTTP Status: <span className={log.http_status_code >= 400 ? 'text-red-400' : 'text-green-400'}>
                            {log.http_status_code}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/80">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm bg-accent border border-border rounded-lg text-gray-200 hover:bg-muted-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm bg-accent border border-border rounded-lg text-gray-200 hover:bg-muted-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default IntegrationLogsDrawer
