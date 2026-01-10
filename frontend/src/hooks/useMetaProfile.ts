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
const profileApi = {
  getProfile: (integrationId: string) =>
    api.get<{ success: boolean; data: WhatsAppProfile }>(
      `/meta/integrations/${integrationId}/profile`
    ),

  updateProfile: (integrationId: string, data: UpdateProfileData) =>
    api.put<{ success: boolean; message: string; data: WhatsAppProfile }>(
      `/meta/integrations/${integrationId}/profile`,
      data
    ),

  uploadPhoto: (integrationId: string, formData: FormData) =>
    api.post<{ success: boolean; message: string; data: WhatsAppProfile }>(
      `/meta/integrations/${integrationId}/profile/photo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    ),

  uploadPhotoBase64: (
    integrationId: string,
    base64: string,
    mimeType: string = 'image/jpeg'
  ) =>
    api.post<{ success: boolean; message: string; data: WhatsAppProfile }>(
      `/meta/integrations/${integrationId}/profile/photo`,
      {
        photo_base64: base64,
        mime_type: mimeType,
      }
    ),

  getCategories: () =>
    api.get<{ success: boolean; data: ProfileCategory }>(
      '/meta/profile/categories'
    ),
}

/**
 * Busca o perfil de uma integração WhatsApp
 */
export function useMetaProfile(integrationId: string) {
  return useQuery({
    queryKey: ['meta', 'integrations', integrationId, 'profile'],
    queryFn: async () => {
      const response = await profileApi.getProfile(integrationId)
      return response.data.data
    },
    enabled: !!integrationId,
  })
}

/**
 * Atualiza o perfil de uma integração WhatsApp
 */
export function useUpdateMetaProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      integrationId,
      data,
    }: {
      integrationId: string
      data: UpdateProfileData
    }) => {
      const response = await profileApi.updateProfile(integrationId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['meta', 'integrations', variables.integrationId, 'profile'],
      })
    },
  })
}

/**
 * Faz upload de foto de perfil usando arquivo
 */
export function useUploadMetaProfilePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      integrationId,
      file,
    }: {
      integrationId: string
      file: File
    }) => {
      const formData = new FormData()
      formData.append('photo', file)
      const response = await profileApi.uploadPhoto(integrationId, formData)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['meta', 'integrations', variables.integrationId, 'profile'],
      })
    },
  })
}

/**
 * Faz upload de foto de perfil usando base64
 */
export function useUploadMetaProfilePhotoBase64() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      integrationId,
      base64,
      mimeType,
    }: {
      integrationId: string
      base64: string
      mimeType?: string
    }) => {
      const response = await profileApi.uploadPhotoBase64(
        integrationId,
        base64,
        mimeType
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['meta', 'integrations', variables.integrationId, 'profile'],
      })
    },
  })
}

/**
 * Busca as categorias de negócio disponíveis
 */
export function useMetaProfileCategories() {
  return useQuery({
    queryKey: ['meta', 'profile', 'categories'],
    queryFn: async () => {
      const response = await profileApi.getCategories()
      return response.data.data
    },
    staleTime: 1000 * 60 * 60, // 1 hora - raramente muda
  })
}
