import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contactsApi } from '@/api/endpoints'
import type { Contact } from '@/types'

interface ContactsParams {
  page?: number
  search?: string
}

export function useContacts(params?: ContactsParams) {
  return useQuery({
    queryKey: ['contacts', params],
    queryFn: async () => {
      const response = await contactsApi.list(params)
      return response.data
    },
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const response = await contactsApi.get(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<Contact>) => contactsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) =>
      contactsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['contact', variables.id] })
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => contactsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}

