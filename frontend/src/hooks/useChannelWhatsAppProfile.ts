import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

// Types
export interface WhatsAppProfile {
  about: string | null
  address: string | null
  description: string | null
  email: string | null
  profile_picture_url: string | null
  websites: string[]
  vertical: string | null
}

export interface ProfileCategory {
  [key: string]: string
}

export interface UpdateProfileData {
  about?: string
  address?: string
  description?: string
  email?: string
  websites?: string[]
  vertical?: string
}

// API endpoints
const channelProfileApi = {
  getProfile: (channelId: string) =>
    api.get<{ success: boolean; data: WhatsAppProfile }>(
      `/channels/${channelId}/whatsapp-profile`
    ),

  updateProfile: (channelId: string, data: UpdateProfileData) =>
    api.put<{ success: boolean; message: string; data: WhatsAppProfile }>(
      `/channels/${channelId}/whatsapp-profile`,
      data
    ),

  uploadPhoto: (channelId: string, formData: FormData) =>
    api.post<{ success: boolean; message: string; data: WhatsAppProfile }>(
      `/channels/${channelId}/whatsapp-profile/photo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    ),

  getCategories: () =>
    api.get<{ success: boolean; data: ProfileCategory }>(
      '/whatsapp-profile/categories'
    ),
}

/**
 * Busca o perfil de um canal WhatsApp
 */
export function useChannelWhatsAppProfile(channelId: string) {
  return useQuery({
    queryKey: ['channels', channelId, 'whatsapp-profile'],
    queryFn: async () => {
      const response = await channelProfileApi.getProfile(channelId)
      return response.data.data
    },
    enabled: !!channelId,
  })
}

/**
 * Atualiza o perfil de um canal WhatsApp
 */
export function useUpdateChannelWhatsAppProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      channelId,
      data,
    }: {
      channelId: string
      data: UpdateProfileData
    }) => {
      const response = await channelProfileApi.updateProfile(channelId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['channels', variables.channelId, 'whatsapp-profile'],
      })
    },
  })
}

/**
 * Faz upload de foto de perfil usando arquivo
 */
export function useUploadChannelWhatsAppProfilePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      channelId,
      file,
    }: {
      channelId: string
      file: File
    }) => {
      const formData = new FormData()
      formData.append('photo', file)
      const response = await channelProfileApi.uploadPhoto(channelId, formData)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['channels', variables.channelId, 'whatsapp-profile'],
      })
    },
  })
}

/**
 * Busca as categorias de negócio disponíveis
 */
export function useWhatsAppProfileCategories() {
  return useQuery({
    queryKey: ['whatsapp-profile', 'categories'],
    queryFn: async () => {
      const response = await channelProfileApi.getCategories()
      return response.data.data
    },
    staleTime: 1000 * 60 * 60, // 1 hora - raramente muda
  })
}
