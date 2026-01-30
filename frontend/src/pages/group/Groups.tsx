import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { motion } from 'framer-motion'
import {
  Building2,
  Plus,
  Users,
  TrendingUp,
  BarChart3,
  ChevronRight,
  Store,
  Loader2,
  Settings,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { useGroups, useGroupDashboard, useGroupMetricsPerTenant } from '@/hooks/useGroups'
import { useAuthStore } from '@/store/authStore'
import { usePermissions } from '@/hooks/usePermissions'

export function GroupsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const { user } = useAuthStore()
  const { isAdmin } = usePermissions()

  // Verifica se o usuário é admin (pode gerenciar) ou gestor (apenas visualiza)
  const canManage = isAdmin || user?.role === 'admin'
  const isGestor = user?.role === 'gestor'

  const { data: groups, isLoading: groupsLoading } = useGroups()
  const { data: dashboard, isLoading: dashboardLoading } = useGroupDashboard(selectedGroupId || '')
  const { data: metricsPerTenant } = useGroupMetricsPerTenant(selectedGroupId || '')

  // Select first group by default
  const groupsList = Array.isArray(groups) ? groups : []
  const selectedGroup = groupsList.find((g: any) => g.id === selectedGroupId) || groupsList[0]

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (groupsList.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Visão de Grupo"
          subtitle={isGestor ? 'Visualize o desempenho das lojas' : 'Gerencie múltiplas lojas em um só lugar'}
          actions={
            canManage ? (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
            ) : undefined
          }
        />
        <div className="text-center py-12 text-muted-foreground">
          {isGestor
            ? 'Você ainda não foi adicionado a nenhum grupo. Entre em contato com o administrador.'
            : 'Você não possui grupos. Crie um grupo para gerenciar múltiplas lojas.'
          }
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Visão de Grupo"
        subtitle={isGestor ? 'Visualize o desempenho das lojas' : 'Gerencie múltiplas lojas em um só lugar'}
        actions={
          canManage ? (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          ) : undefined
        }
      />

      {/* Group Overview */}
      {selectedGroup && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary text-white">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedGroup.name}</h2>
                      {isGestor && (
                        <Badge variant="outline" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Visualização
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{selectedGroup.description || 'Sem descrição'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    {selectedGroup.tenants?.length || 0} lojas
                  </Badge>
                  {canManage && (
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Gerenciar
                    </Button>
                  )}
                </div>
              </div>

              {dashboard && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="bg-card rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Total de Leads</span>
                    </div>
                    <p className="text-3xl font-bold">{dashboard.total_leads || 0}</p>
                  </div>
                  <div className="bg-card rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Leads Ganhos</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {dashboard.leads_won || 0}
                    </p>
                  </div>
                  <div className="bg-card rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="text-sm">Total Tickets</span>
                    </div>
                    <p className="text-3xl font-bold">
                      {dashboard.total_tickets || 0}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stores List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Lojas do Grupo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedGroup?.tenants?.map((tenant: any, index: number) => {
            const tenantMetrics = metricsPerTenant?.find?.((m: any) => m.tenant_id === tenant.id)

            return (
              <motion.div
                key={tenant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{tenant.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {tenantMetrics?.total_leads || 0} leads ativos
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-sm text-muted-foreground">Leads Ganhos</span>
                      <span className="font-semibold text-green-600">
                        {tenantMetrics?.leads_won || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Comparative Chart Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Comparativo entre Lojas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
              Gráfico comparativo será implementado
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
