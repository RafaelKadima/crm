import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { useGroups, useGroupDashboard, useGroupMetricsPerTenant } from '@/hooks/useGroups'

export function GroupsPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Visão de Grupo</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie múltiplas lojas em um só lugar
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          Você não possui grupos. Crie um grupo para gerenciar múltiplas lojas.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Visão de Grupo</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie múltiplas lojas em um só lugar
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

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
                    <h2 className="text-2xl font-bold">{selectedGroup.name}</h2>
                    <p className="text-muted-foreground">{selectedGroup.description || 'Sem descrição'}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {selectedGroup.tenants?.length || 0} lojas
                </Badge>
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
