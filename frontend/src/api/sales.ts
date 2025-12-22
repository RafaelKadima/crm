import api from './axios'

// =====================
// TYPES
// =====================

export interface Sale {
  id: string
  tenant_id: string
  lead_id: string
  closed_by: string
  closed_at: string
  subtotal_products: number
  additional_value: number
  additional_description?: string
  discount_value: number
  discount_percentage?: number
  total_value: number
  payment_method?: string
  installments: number
  notes?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations
  lead?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  closed_by_user?: {
    id: string
    name: string
  }
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id?: string
  description: string
  quantity: number
  unit_price: number
  discount: number
  total: number
  notes?: string
  product?: {
    id: string
    name: string
    sku?: string
  }
}

export interface SaleItemInput {
  product_id?: string
  description?: string
  quantity: number
  unit_price: number
  discount?: number
  notes?: string
}

export interface CreateSaleData {
  lead_id: string
  items?: SaleItemInput[]
  additional_value?: number
  additional_description?: string
  discount_value?: number
  discount_percentage?: number
  total_value?: number // For simple value entry without items
  payment_method?: string
  installments?: number
  notes?: string
  metadata?: Record<string, unknown>
}

export interface UpdateSaleData {
  additional_value?: number
  additional_description?: string
  discount_value?: number
  discount_percentage?: number
  payment_method?: string
  installments?: number
  notes?: string
  metadata?: Record<string, unknown>
}

export interface SaleStats {
  items_count: number
  products_count: number
  subtotal_products: number
  additional_value: number
  discount_value: number
  total_value: number
  average_item_value: number
}

export interface MySalesStats {
  total_sales: number
  total_value: number
  average_ticket: number
  total_products_value: number
  total_additional_value: number
  total_discounts: number
}

export interface ProductSearchResult {
  id: string
  name: string
  sku?: string
  price: number
  description?: string
}

// =====================
// API
// =====================

export const salesApi = {
  // List all sales
  list: (params?: { start_date?: string; end_date?: string; user_id?: string }) =>
    api.get<{ data: Sale[]; meta: any }>('/sales', { params }),

  // Create sale (close lead)
  create: (data: CreateSaleData) =>
    api.post<{ message: string; sale: Sale }>('/sales', data),

  // Get sale
  get: (id: string) =>
    api.get<{ sale: Sale; stats: SaleStats }>(`/sales/${id}`),

  // Update sale
  update: (id: string, data: UpdateSaleData) =>
    api.put<{ message: string; sale: Sale }>(`/sales/${id}`, data),

  // Get sale by lead
  byLead: (leadId: string) =>
    api.get<{ sale: Sale; stats: SaleStats }>(`/sales/lead/${leadId}`),

  // Add item to sale
  addItem: (saleId: string, item: SaleItemInput) =>
    api.post<{ message: string; item: SaleItem; sale: Sale }>(`/sales/${saleId}/items`, item),

  // Remove item from sale
  removeItem: (saleId: string, itemId: string) =>
    api.delete<{ message: string; sale: Sale }>(`/sales/${saleId}/items/${itemId}`),

  // My stats
  myStats: (period?: 'today' | 'week' | 'month' | 'year') =>
    api.get<{ period: string; stats: MySalesStats }>('/sales/my-stats', { params: { period } }),

  // Search products
  searchProducts: (q: string) =>
    api.get<{ products: ProductSearchResult[] }>('/sales/search-products', { params: { q } }),
}

export default salesApi
