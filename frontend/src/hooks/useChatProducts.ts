import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface ChatProduct {
  id: string
  name: string
  sku: string | null
  price: number
  promotional_price: number | null
  short_description: string | null
  description: string | null
  primary_image: string | null
  images: {
    id: string
    url: string
    alt: string
  }[]
}

interface ChatProductsResponse {
  products: ChatProduct[]
}

interface SendProductParams {
  ticketId: string
  productId: string
  includeDescription?: boolean
  includePrice?: boolean
  includeImages?: boolean
}

interface SendProductResponse {
  message: string
  ticket_message: {
    id: string
    message: string
    sent_at: string
  }
  images_sent: {
    id: string
    url: string
  }[]
  product: {
    id: string
    name: string
  }
}

// Hook para listar produtos do catálogo para o chat
export function useChatProducts(params?: { search?: string; category_id?: string }) {
  return useQuery({
    queryKey: ['chat-products', params],
    queryFn: async () => {
      const { data } = await api.get<ChatProductsResponse>('/chat-products', { params })
      return data.products
    },
  })
}

// Hook para enviar produto no chat
export function useSendProductToChat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ticketId,
      productId,
      includeDescription = true,
      includePrice = true,
      includeImages = true,
    }: SendProductParams) => {
      const { data } = await api.post<SendProductResponse>(
        `/tickets/${ticketId}/send-product`,
        {
          product_id: productId,
          include_description: includeDescription,
          include_price: includePrice,
          include_images: includeImages,
        }
      )
      return data
    },
    onSuccess: (_, variables) => {
      // Invalida cache de mensagens do ticket
      queryClient.invalidateQueries({
        queryKey: ['ticket-messages', variables.ticketId],
      })
      queryClient.invalidateQueries({
        queryKey: ['tickets'],
      })
    },
  })
}

export default useChatProducts
