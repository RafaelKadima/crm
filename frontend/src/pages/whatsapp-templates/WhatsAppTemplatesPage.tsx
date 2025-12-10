import { useEffect, useState, useMemo } from 'react'
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates'
import { useChannels, type Channel } from '@/hooks/useChannels'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { CreateTemplateModal } from './CreateTemplateModal'
import type { WhatsAppTemplate, WhatsAppTemplateCategory, WhatsAppTemplateStatus } from '@/types'

// Ícones inline para não depender de bibliotecas externas
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
)

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
)

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
)

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
)

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
)

// Mapeamento de cores para status
const statusColors: Record<WhatsAppTemplateStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PAUSED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  DISABLED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  IN_APPEAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PENDING_DELETION: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  DELETED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LIMIT_EXCEEDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

const categoryColors: Record<WhatsAppTemplateCategory, string> = {
  MARKETING: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  AUTHENTICATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  UTILITY: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
}

export function WhatsAppTemplatesPage() {
  const {
    templates,
    stats,
    loading,
    error,
    currentPage,
    lastPage,
    total,
    fetchTemplates,
    deleteTemplate,
    checkTemplateStatus,
    syncFromMeta,
    fetchStats,
    fetchCategories,
    fetchStatuses,
    clearError,
  } = useWhatsAppTemplates()

  const { data: channelsData, isLoading: channelsLoading } = useChannels()

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Normaliza os dados dos canais (pode vir como array ou objeto com data)
  const channels = useMemo(() => {
    if (!channelsData) return []
    if (Array.isArray(channelsData)) return channelsData
    if (typeof channelsData === 'object' && 'data' in channelsData) {
      return (channelsData as { data: Channel[] }).data
    }
    return []
  }, [channelsData])

  // Filtra canais do WhatsApp
  const whatsAppChannels = useMemo(() => 
    channels.filter((c: Channel) => c.type === 'whatsapp' && c.is_active),
    [channels]
  )

  // Carrega dados iniciais
  useEffect(() => {
    fetchCategories()
    fetchStatuses()
  }, [fetchCategories, fetchStatuses])

  // Carrega templates quando canal é selecionado ou filtros mudam
  useEffect(() => {
    fetchTemplates({
      channel_id: selectedChannel || undefined,
      category: selectedCategory || undefined,
      status: selectedStatus || undefined,
      search: searchQuery || undefined,
    })
  }, [selectedChannel, selectedCategory, selectedStatus, searchQuery, fetchTemplates])

  // Carrega estatísticas quando canal é selecionado
  useEffect(() => {
    if (selectedChannel) {
      fetchStats(selectedChannel)
    }
  }, [selectedChannel, fetchStats])

  // Auto-seleciona primeiro canal se houver apenas um
  useEffect(() => {
    if (whatsAppChannels.length === 1 && !selectedChannel) {
      setSelectedChannel(whatsAppChannels[0].id)
    }
  }, [whatsAppChannels, selectedChannel])

  const handleSync = async () => {
    if (!selectedChannel) return
    setSyncing(true)
    try {
      const result = await syncFromMeta(selectedChannel)
      alert(`Sincronização concluída!\n\nCriados: ${result.created}\nAtualizados: ${result.updated}\nTotal: ${result.total}`)
      fetchTemplates({ channel_id: selectedChannel })
      fetchStats(selectedChannel)
    } catch (err) {
      // Erro já tratado pelo hook
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (template: WhatsAppTemplate) => {
    if (!confirm(`Tem certeza que deseja excluir o template "${template.name}"?`)) {
      return
    }
    setDeletingId(template.id)
    try {
      await deleteTemplate(template.id)
    } catch (err) {
      // Erro já tratado pelo hook
    } finally {
      setDeletingId(null)
    }
  }

  const handleCheckStatus = async (template: WhatsAppTemplate) => {
    try {
      const result = await checkTemplateStatus(template.id)
      alert(`Status atualizado: ${result.status}\nPode enviar: ${result.can_send ? 'Sim' : 'Não'}`)
    } catch (err) {
      alert('Erro ao verificar status')
    }
  }

  const handleTemplateCreated = () => {
    setIsCreateModalOpen(false)
    fetchTemplates({ channel_id: selectedChannel || undefined })
    if (selectedChannel) {
      fetchStats(selectedChannel)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Templates do WhatsApp
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gerencie seus templates de mensagem do WhatsApp Business
          </p>
        </div>

        {/* Alerta de erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-800 dark:text-red-400">{error}</p>
              <button onClick={clearError} className="text-red-600 hover:text-red-800">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aprovados</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Rejeitados</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </Card>
          </div>
        )}

        {/* Filtros e Ações */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Canal */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Canal do WhatsApp
              </label>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todos os canais</option>
                {whatsAppChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todas as categorias</option>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utilidade</option>
                <option value="AUTHENTICATION">Autenticação</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todos os status</option>
                <option value="APPROVED">Aprovado</option>
                <option value="PENDING">Pendente</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
            </div>

            {/* Busca */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Buscar
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Nome ou conteúdo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <SearchIcon />
                </div>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!selectedChannel}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <PlusIcon />
              <span className="ml-2">Novo Template</span>
            </Button>

            <Button
              onClick={handleSync}
              disabled={!selectedChannel || syncing}
              variant="outline"
            >
              {syncing ? <Spinner size="sm" /> : <RefreshIcon />}
              <span className="ml-2">Sincronizar do Meta</span>
            </Button>
          </div>
        </Card>

        {/* Lista de Templates */}
        {loading && templates.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhum template encontrado
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {selectedChannel 
                ? 'Crie seu primeiro template ou sincronize do Meta'
                : 'Selecione um canal do WhatsApp para começar'}
            </p>
            {selectedChannel && (
              <Button onClick={() => setIsCreateModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                <PlusIcon />
                <span className="ml-2">Criar Template</span>
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {templates.map((template) => (
              <Card key={template.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Info do template */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <Badge className={statusColors[template.status]}>
                        {template.status}
                      </Badge>
                      <Badge className={categoryColors[template.category]}>
                        {template.category}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Idioma: {template.language} • Canal: {template.channel?.name || '-'}
                    </p>

                    {/* Preview do template */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                      {template.header_text && (
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {template.header_text}
                        </p>
                      )}
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {template.body_text}
                      </p>
                      {template.footer_text && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          {template.footer_text}
                        </p>
                      )}
                      {template.buttons && template.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          {template.buttons.map((btn, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300"
                            >
                              {btn.text || btn.type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Motivo da rejeição */}
                    {template.status === 'REJECTED' && template.rejection_reason && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-400">
                          <strong>Motivo da rejeição:</strong> {template.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex lg:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCheckStatus(template)}
                      title="Verificar status"
                    >
                      <EyeIcon />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(template)}
                      disabled={deletingId === template.id}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                      title="Excluir"
                    >
                      {deletingId === template.id ? <Spinner size="sm" /> : <TrashIcon />}
                    </Button>
                  </div>
                </div>

                {/* Timestamps */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>Criado: {new Date(template.created_at).toLocaleString('pt-BR')}</span>
                  {template.submitted_at && (
                    <span>Enviado: {new Date(template.submitted_at).toLocaleString('pt-BR')}</span>
                  )}
                  {template.approved_at && (
                    <span>Aprovado: {new Date(template.approved_at).toLocaleString('pt-BR')}</span>
                  )}
                </div>
              </Card>
            ))}

            {/* Paginação */}
            {lastPage > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => fetchTemplates({ 
                    channel_id: selectedChannel || undefined,
                    page: currentPage - 1 
                  })}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-4 text-gray-600 dark:text-gray-400">
                  Página {currentPage} de {lastPage} ({total} templates)
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === lastPage}
                  onClick={() => fetchTemplates({ 
                    channel_id: selectedChannel || undefined,
                    page: currentPage + 1 
                  })}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal de criação */}
        {isCreateModalOpen && selectedChannel && (
          <CreateTemplateModal
            channelId={selectedChannel}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleTemplateCreated}
          />
        )}
      </div>
    </div>
  )
}

export default WhatsAppTemplatesPage

