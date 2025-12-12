import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiUsageApi, packagesApi, plansApi } from '@/api/endpoints'

// =====================
// USAGE HOOKS
// =====================

export function useAiUsageSummary() {
  return useQuery({
    queryKey: ['ai-usage-summary'],
    queryFn: async () => {
      const { data } = await aiUsageApi.getSummary()
      return data
    },
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  })
}

export function useAiDailyUsage(days = 30) {
  return useQuery({
    queryKey: ['ai-daily-usage', days],
    queryFn: async () => {
      const { data } = await aiUsageApi.getDailyUsage(days)
      return data.usage
    },
  })
}

export function useAiUsageByModel(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['ai-usage-by-model', startDate, endDate],
    queryFn: async () => {
      const { data } = await aiUsageApi.getUsageByModel(startDate, endDate)
      return data.usage_by_model
    },
  })
}

export function useAiLimitsCheck() {
  return useQuery({
    queryKey: ['ai-limits-check'],
    queryFn: async () => {
      const { data } = await aiUsageApi.checkLimits()
      return data
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  })
}

export function useAiOverageCost() {
  return useQuery({
    queryKey: ['ai-overage-cost'],
    queryFn: async () => {
      const { data } = await aiUsageApi.getOverageCost()
      return data
    },
  })
}

export function useAiUsageEstimate() {
  return useMutation({
    mutationFn: async (params: { leads_per_month: number; messages_per_lead?: number; premium_percentage?: number }) => {
      const { data } = await aiUsageApi.estimate(params)
      return data
    },
  })
}

// =====================
// PACKAGES HOOKS
// =====================

export function useAvailablePackages() {
  return useQuery({
    queryKey: ['available-packages'],
    queryFn: async () => {
      const { data } = await packagesApi.getAvailable()
      return data
    },
  })
}

export function usePackagePurchases(status?: string) {
  return useQuery({
    queryKey: ['package-purchases', status],
    queryFn: async () => {
      const { data } = await packagesApi.getPurchases(status)
      return data.purchases
    },
  })
}

export function usePurchasePackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ packageType, packageId }: { packageType: string; packageId: string }) => {
      const { data } = await packagesApi.purchase(packageType, packageId)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['ai-usage-summary'] })
    },
  })
}

export function useConfirmPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ purchaseId, paymentReference }: { purchaseId: string; paymentReference?: string }) => {
      const { data } = await packagesApi.confirmPayment(purchaseId, paymentReference)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['package-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['ai-usage-summary'] })
    },
  })
}

// =====================
// PLANS HOOKS
// =====================

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await plansApi.getPlans()
      return data
    },
  })
}

