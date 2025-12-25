import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import type { QuickReply } from '@/types'

interface QuickRepliesParams {
  search?: string
  active_only?: boolean
}

interface CreateQuickReplyData {
  title: string
  shortcut?: string
  content: string
  is_active?: boolean
}

interface UpdateQuickReplyData {
  title?: string
  shortcut?: string
  content?: string
  is_active?: boolean
  order?: number
}

interface RenderQuickReplyData {
  id: string
  lead_id?: string
}

interface ReorderItem {
  id: string
  order: number
}

// Lista respostas rápidas do usuário
export function useQuickReplies(params?: QuickRepliesParams) {
  return useQuery({
    queryKey: ['quick-replies', params],
    queryFn: async () => {
      const response = await api.get('/quick-replies', { params })
      return response.data.quick_replies as QuickReply[]
    },
  })
}

// Busca uma resposta rápida específica
export function useQuickReply(id: string | null) {
  return useQuery({
    queryKey: ['quick-reply', id],
    queryFn: async () => {
      const response = await api.get(`/quick-replies/${id}`)
      return response.data as QuickReply
    },
    enabled: !!id,
  })
}

// Lista variáveis disponíveis
export function useQuickReplyVariables() {
  return useQuery({
    queryKey: ['quick-reply-variables'],
    queryFn: async () => {
      const response = await api.get('/quick-replies/variables')
      return response.data.variables as Record<string, string>
    },
    staleTime: Infinity, // Variáveis não mudam
  })
}

// Cria nova resposta rápida
export function useCreateQuickReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateQuickReplyData) => {
      const response = await api.post('/quick-replies', data)
      return response.data.quick_reply as QuickReply
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] })
    },
  })
}

// Atualiza resposta rápida
export function useUpdateQuickReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateQuickReplyData }) => {
      const response = await api.put(`/quick-replies/${id}`, data)
      return response.data.quick_reply as QuickReply
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] })
    },
  })
}

// Remove resposta rápida
export function useDeleteQuickReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/quick-replies/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] })
    },
  })
}

// Renderiza resposta rápida com variáveis substituídas
export function useRenderQuickReply() {
  return useMutation({
    mutationFn: async ({ id, lead_id }: RenderQuickReplyData) => {
      const response = await api.post(`/quick-replies/${id}/render`, { lead_id })
      return response.data as {
        rendered_content: string
        original_content: string
        variables_used: string[]
      }
    },
  })
}

// Reordena respostas rápidas
export function useReorderQuickReplies() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: ReorderItem[]) => {
      await api.post('/quick-replies/reorder', { items })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-replies'] })
    },
  })
}
