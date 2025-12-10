import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import type { Product, ProductCategory, ProductImage, PaginatedResponse } from '@/types'

// ============ Products ============

export const useProducts = (params?: {
  category_id?: string
  is_active?: boolean
  search?: string
  page?: number
  per_page?: number
}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Product>>('/products', { params })
      return response.data
    },
  })
}

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await api.get<Product>(`/products/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const response = await api.post<{ product: Product }>('/products', data)
      return response.data.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const response = await api.put<{ product: Product }>(`/products/${id}`, data)
      return response.data.product
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] })
    },
  })
}

export const useDeleteProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export const useDuplicateProduct = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ product: Product }>(`/products/${id}/duplicate`)
      return response.data.product
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ============ Product Images ============

export const useUploadProductImage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      file,
      isPrimary = false,
    }: {
      productId: string
      file: File
      isPrimary?: boolean
    }) => {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('is_primary', isPrimary ? '1' : '0')

      const response = await api.post<{ image: ProductImage }>(
        `/products/${productId}/images`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )
      return response.data.image
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] })
    },
  })
}

export const useDeleteProductImage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ productId, imageId }: { productId: string; imageId: string }) => {
      await api.delete(`/products/${productId}/images/${imageId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] })
    },
  })
}

export const useSetPrimaryImage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ productId, imageId }: { productId: string; imageId: string }) => {
      const response = await api.put<{ image: ProductImage }>(
        `/products/${productId}/images/${imageId}/primary`
      )
      return response.data.image
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] })
    },
  })
}

// ============ Categories ============

export const useProductCategories = () => {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const response = await api.get<ProductCategory[]>('/product-categories')
      return response.data
    },
  })
}

export const useCreateProductCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<ProductCategory>) => {
      const response = await api.post<{ category: ProductCategory }>('/product-categories', data)
      return response.data.category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export const useUpdateProductCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductCategory> }) => {
      const response = await api.put<{ category: ProductCategory }>(`/product-categories/${id}`, data)
      return response.data.category
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

export const useDeleteProductCategory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/product-categories/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
    },
  })
}

