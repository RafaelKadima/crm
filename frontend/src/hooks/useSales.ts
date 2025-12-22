import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '@/api/sales'
import type { CreateSaleData, UpdateSaleData, SaleItemInput } from '@/api/sales'

// =====================
// QUERY HOOKS
// =====================

export function useSales(params?: { start_date?: string; end_date?: string; user_id?: string }) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: async () => {
      const response = await salesApi.list(params)
      return response.data
    },
  })
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sale', id],
    queryFn: async () => {
      const response = await salesApi.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useSaleByLead(leadId: string) {
  return useQuery({
    queryKey: ['sale-by-lead', leadId],
    queryFn: async () => {
      const response = await salesApi.byLead(leadId)
      return response.data
    },
    enabled: !!leadId,
    retry: false, // Don't retry if sale not found
  })
}

export function useMySalesStats(period?: 'today' | 'week' | 'month' | 'year') {
  return useQuery({
    queryKey: ['my-sales-stats', period],
    queryFn: async () => {
      const response = await salesApi.myStats(period)
      return response.data
    },
  })
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ['search-products', query],
    queryFn: async () => {
      const response = await salesApi.searchProducts(query)
      return response.data.products
    },
    enabled: query.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  })
}

// =====================
// MUTATION HOOKS
// =====================

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSaleData) => salesApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sale-by-lead', variables.lead_id] })
      queryClient.invalidateQueries({ queryKey: ['my-sales-stats'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead', variables.lead_id] })
      // Invalidate KPR related queries
      queryClient.invalidateQueries({ queryKey: ['kpr-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['my-kpr-progress'] })
    },
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSaleData }) => salesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['sale', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['my-sales-stats'] })
      queryClient.invalidateQueries({ queryKey: ['kpr-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['my-kpr-progress'] })
    },
  })
}

export function useAddSaleItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ saleId, item }: { saleId: string; item: SaleItemInput }) =>
      salesApi.addItem(saleId, item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['my-sales-stats'] })
    },
  })
}

export function useRemoveSaleItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ saleId, itemId }: { saleId: string; itemId: string }) =>
      salesApi.removeItem(saleId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sale', variables.saleId] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['my-sales-stats'] })
    },
  })
}
