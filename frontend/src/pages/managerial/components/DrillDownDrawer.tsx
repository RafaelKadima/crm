import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { useDrillDown, type FunnelCategory, type ManagerialFilters } from '@/hooks/useManagerialFunnel'
import { formatCurrency } from '@/lib/utils'

export function DrillDownDrawer({
  category,
  filters,
  onClose,
}: {
  category: FunnelCategory | null
  filters: ManagerialFilters
  onClose: () => void
}) {
  const { data, isLoading } = useDrillDown(category, filters)
  const open = !!category

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-background border-l border-border z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">
                  Leads em: <span className="text-primary">{data?.category_label ?? '...'}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  {data?.count ?? 0} lead{(data?.count ?? 0) === 1 ? '' : 's'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading &&
                data?.leads?.map((lead: any) => (
                  <a
                    key={lead.id}
                    href={`/leads?lead=${lead.id}`}
                    className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {lead.contact?.name ?? 'Sem contato'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.contact?.phone ?? lead.contact?.email ?? '—'}
                        </p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-semibold">{formatCurrency(lead.value ?? 0)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {lead.owner?.name ?? 'Sem dono'}
                        </p>
                      </div>
                    </div>
                    {lead.stage?.name && (
                      <p className="text-xs text-muted-foreground mt-2 capitalize">
                        Estágio atual: {lead.stage.name}
                      </p>
                    )}
                  </a>
                ))}
              {!isLoading && (!data?.leads || data.leads.length === 0) && (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhum lead nesta célula no período selecionado.
                </p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
