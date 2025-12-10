import { useState, useCallback } from 'react'
import { whatsAppTemplatesApi } from '@/api/endpoints'
import type { 
  WhatsAppTemplate, 
  WhatsAppTemplateCategoryOption,
  WhatsAppTemplateStatusOption,
  WhatsAppTemplateStats,
  CreateWhatsAppTemplateData 
} from '@/types'

interface UseWhatsAppTemplatesReturn {
  // Estado
  templates: WhatsAppTemplate[]
  template: WhatsAppTemplate | null
  categories: WhatsAppTemplateCategoryOption[]
  statuses: WhatsAppTemplateStatusOption[]
  stats: WhatsAppTemplateStats | null
  loading: boolean
  error: string | null
  
  // Paginação
  currentPage: number
  lastPage: number
  total: number
  
  // Ações
  fetchTemplates: (params?: { 
    channel_id?: string
    category?: string
    status?: string
    search?: string
    page?: number 
  }) => Promise<void>
  fetchTemplate: (id: string) => Promise<void>
  createTemplate: (data: CreateWhatsAppTemplateData) => Promise<WhatsAppTemplate>
  deleteTemplate: (id: string) => Promise<void>
  checkTemplateStatus: (id: string) => Promise<{ status: string; can_send: boolean }>
  syncFromMeta: (channelId: string) => Promise<{ created: number; updated: number; total: number }>
  fetchStats: (channelId: string) => Promise<void>
  fetchCategories: () => Promise<void>
  fetchStatuses: () => Promise<void>
  checkNameAvailability: (name: string, channelId: string, language?: string) => Promise<boolean>
  previewTemplate: (data: CreateWhatsAppTemplateData) => Promise<{ payload: any; variable_count: number }>
  clearError: () => void
}

export function useWhatsAppTemplates(): UseWhatsAppTemplatesReturn {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [template, setTemplate] = useState<WhatsAppTemplate | null>(null)
  const [categories, setCategories] = useState<WhatsAppTemplateCategoryOption[]>([])
  const [statuses, setStatuses] = useState<WhatsAppTemplateStatusOption[]>([])
  const [stats, setStats] = useState<WhatsAppTemplateStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  const clearError = useCallback(() => setError(null), [])

  const fetchTemplates = useCallback(async (params?: { 
    channel_id?: string
    category?: string
    status?: string
    search?: string
    page?: number 
  }) => {
    setLoading(true)
    setError(null)
    try {
      const response = await whatsAppTemplatesApi.list(params)
      setTemplates(response.data.data)
      setCurrentPage(response.data.meta.current_page)
      setLastPage(response.data.meta.last_page)
      setTotal(response.data.meta.total)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar templates')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTemplate = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await whatsAppTemplatesApi.get(id)
      setTemplate(response.data.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar template')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createTemplate = useCallback(async (data: CreateWhatsAppTemplateData): Promise<WhatsAppTemplate> => {
    setLoading(true)
    setError(null)
    try {
      const response = await whatsAppTemplatesApi.create(data)
      // Adiciona o novo template à lista
      setTemplates(prev => [response.data.data, ...prev])
      return response.data.data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erro ao criar template'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await whatsAppTemplatesApi.delete(id)
      // Remove o template da lista
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir template')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const checkTemplateStatus = useCallback(async (id: string) => {
    try {
      const response = await whatsAppTemplatesApi.checkStatus(id)
      // Atualiza o template na lista se existir
      setTemplates(prev => prev.map(t => 
        t.id === id ? { ...t, status: response.data.data.status as any } : t
      ))
      return response.data.data
    } catch (err: any) {
      throw err
    }
  }, [])

  const syncFromMeta = useCallback(async (channelId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await whatsAppTemplatesApi.sync(channelId)
      return response.data.data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao sincronizar templates')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async (channelId: string) => {
    try {
      const response = await whatsAppTemplatesApi.getStats(channelId)
      setStats(response.data.data)
    } catch (err: any) {
      console.error('Error fetching stats:', err)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await whatsAppTemplatesApi.getCategories()
      setCategories(response.data.data)
    } catch (err: any) {
      console.error('Error fetching categories:', err)
    }
  }, [])

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await whatsAppTemplatesApi.getStatuses()
      setStatuses(response.data.data)
    } catch (err: any) {
      console.error('Error fetching statuses:', err)
    }
  }, [])

  const checkNameAvailability = useCallback(async (name: string, channelId: string, language?: string): Promise<boolean> => {
    try {
      const response = await whatsAppTemplatesApi.checkName(name, channelId, language)
      return response.data.available
    } catch (err: any) {
      return false
    }
  }, [])

  const previewTemplate = useCallback(async (data: CreateWhatsAppTemplateData) => {
    try {
      const response = await whatsAppTemplatesApi.preview(data)
      return response.data.data
    } catch (err: any) {
      throw err
    }
  }, [])

  return {
    templates,
    template,
    categories,
    statuses,
    stats,
    loading,
    error,
    currentPage,
    lastPage,
    total,
    fetchTemplates,
    fetchTemplate,
    createTemplate,
    deleteTemplate,
    checkTemplateStatus,
    syncFromMeta,
    fetchStats,
    fetchCategories,
    fetchStatuses,
    checkNameAvailability,
    previewTemplate,
    clearError,
  }
}

