import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leadImportsApi } from '@/api/endpoints'
import type { LeadImport } from '@/types'

export function useLeadImports() {
  return useQuery({
    queryKey: ['leadImports'],
    queryFn: async () => {
      const response = await leadImportsApi.list()
      return response.data
    },
  })
}

export function useLeadImport(id: string) {
  return useQuery({
    queryKey: ['leadImport', id],
    queryFn: async () => {
      const response = await leadImportsApi.get(id)
      return response.data
    },
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll every 1 second while pending or processing
      const data = query.state.data as { import: LeadImport; progress: number } | undefined
      const status = data?.import?.status
      if (status === 'pending' || status === 'processing') {
        return 1000 // Poll every 1 second
      }
      return false
    },
  })
}

export function useUploadLeadImport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      pipelineId,
      options,
    }: {
      file: File
      pipelineId?: string
      options?: { 
        distributeLeads?: boolean
        skipDuplicates?: boolean
        ownerId?: string 
      }
    }) => {
      const response = await leadImportsApi.upload(file, pipelineId, options)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadImports'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useDownloadLeadTemplate() {
  return useMutation({
    mutationFn: async () => {
      const response = await leadImportsApi.downloadTemplate()
      
      // Criar blob e fazer download
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'template_importacao_leads.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
  })
}

