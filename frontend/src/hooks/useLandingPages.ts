import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import type { LandingPage, LandingPageStats } from '@/types'

interface LandingPagesResponse {
  landing_pages: LandingPage[]
  limit: number
  used: number
  can_create: boolean
}

export const useLandingPages = () => {
  return useQuery({
    queryKey: ['landing-pages'],
    queryFn: async () => {
      const response = await api.get<LandingPagesResponse>('/landing-pages')
      return response.data
    },
  })
}

export const useLandingPage = (id: string) => {
  return useQuery({
    queryKey: ['landing-page', id],
    queryFn: async () => {
      const response = await api.get<LandingPage>(`/landing-pages/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export const useCreateLandingPage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<LandingPage> & { products?: string[] }) => {
      const response = await api.post<{ landing_page: LandingPage }>('/landing-pages', data)
      return response.data.landing_page
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
    },
  })
}

export const useUpdateLandingPage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LandingPage> & { products?: string[] } }) => {
      const response = await api.put<{ landing_page: LandingPage }>(`/landing-pages/${id}`, data)
      return response.data.landing_page
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
      queryClient.invalidateQueries({ queryKey: ['landing-page', variables.id] })
    },
  })
}

export const useDeleteLandingPage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/landing-pages/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
    },
  })
}

export const usePublishLandingPage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ landing_page: LandingPage }>(`/landing-pages/${id}/publish`)
      return response.data.landing_page
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
      queryClient.invalidateQueries({ queryKey: ['landing-page', id] })
    },
  })
}

export const useUnpublishLandingPage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ landing_page: LandingPage }>(`/landing-pages/${id}/unpublish`)
      return response.data.landing_page
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
      queryClient.invalidateQueries({ queryKey: ['landing-page', id] })
    },
  })
}

export const useDuplicateLandingPage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ landing_page: LandingPage }>(`/landing-pages/${id}/duplicate`)
      return response.data.landing_page
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] })
    },
  })
}

export const useLandingPageStats = (id: string, days?: number) => {
  return useQuery({
    queryKey: ['landing-page-stats', id, days],
    queryFn: async () => {
      const response = await api.get<LandingPageStats>(`/landing-pages/${id}/stats`, {
        params: { days },
      })
      return response.data
    },
    enabled: !!id,
  })
}

export const useUploadLandingPageImage = () => {
  return useMutation({
    mutationFn: async ({ id, file, type }: { id: string; file: File; type: 'logo' | 'background' | 'block' }) => {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', type)
      
      const response = await api.post<{ url: string; path: string }>(`/landing-pages/${id}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    },
  })
}

