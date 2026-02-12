import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Loader2,
  Users,
  LayoutGrid,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  Eye,
  PlayCircle,
  ChevronDown,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useQueues, useToggleAutoDistribute, useDistributeWaitingLeads, useDeleteQueue } from '@/hooks/useQueues'
import { useChannels } from '@/hooks/useChannels'
import { QueueFormModal } from './QueueFormModal'
import { QueueUsersModal } from './QueueUsersModal'
import { QueuePreviewModal } from './QueuePreviewModal'
import { QueueMenuConfig } from './QueueMenuConfig'
import type { Queue } from '@/hooks/useQueues'

export function QueuesPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [showChannelSelector, setShowChannelSelector] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null)

  const { data: queues, isLoading: queuesLoading } = useQueues(selectedChannelId || undefined)
  const { data: channels, isLoading: channelsLoading } = useChannels()
  
  const toggleAutoDistribute = useToggleAutoDistribute()
  const distributeWaiting = useDistributeWaitingLeads()
  const deleteQueue = useDeleteQueue()

  const selectedChannel = useMemo(() => {
    if (!selectedChannelId || !channels) return null
    return channels.find((c) => c.id === selectedChannelId)
  }, [selectedChannelId, channels])

  const filteredQueues = useMemo(() => {
    if (!queues) return []
    if (!searchQuery) return queues
    
    const query = searchQuery.toLowerCase()
    return queues.filter(
      (queue) =>
        queue.name.toLowerCase().includes(query) ||
        queue.menu_label.toLowerCase().includes(query)
    )
  }, [queues, searchQuery])

  const handleCreateQueue = () => {
    setSelectedQueue(null)
    setIsFormModalOpen(true)
  }

  const handleEditQueue = (queue: Queue) => {
    setSelectedQueue(queue)
    setIsFormModalOpen(true)
  }

  const handleManageUsers = (queue: Queue) => {
    setSelectedQueue(queue)
    setIsUsersModalOpen(true)
  }

  const handlePreview = (queue: Queue) => {
    setSelectedQueue(queue)
    setIsPreviewModalOpen(true)
  }

  const handleToggleAutoDistribute = async (queue: Queue) => {
    try {
      await toggleAutoDistribute.mutateAsync(queue.id)
    } catch (error) {
      console.error('Error toggling auto-distribute:', error)
    }
  }

  const handleDistributeWaiting = async (queue: Queue) => {
    try {
      const result = await distributeWaiting.mutateAsync(queue.id)
      alert(result.message)
    } catch (error: any) {
      alert(error.response?.data?.error || t('queuesPage.distributeError'))
    }
  }

  const handleDeleteQueue = async (queue: Queue) => {
    if (!confirm(t('queuesPage.confirmDelete', { name: queue.name }))) return

    try {
      await deleteQueue.mutateAsync(queue.id)
    } catch (error: any) {
      alert(error.response?.data?.error || t('queuesPage.deleteError'))
    }
  }

  const isLoading = queuesLoading || channelsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('queuesPage.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('queuesPage.subtitle')}
            </p>
          </div>

          {/* Channel Selector */}
          <div className="relative">
            <button
              onClick={() => setShowChannelSelector(!showChannelSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-accent rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">
                {selectedChannel?.name || t('queuesPage.allChannels')}
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${
                  showChannelSelector ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showChannelSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-2 w-64 bg-muted rounded-lg shadow-xl border border-border z-50 overflow-hidden"
              >
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedChannelId(null)
                      setShowChannelSelector(false)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                      !selectedChannelId ? 'bg-blue-600/20' : ''
                    }`}
                  >
                    <p className="font-medium">{t('queuesPage.allChannels')}</p>
                  </button>
                  {channels?.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => {
                        setSelectedChannelId(channel.id)
                        setShowChannelSelector(false)
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                        channel.id === selectedChannelId ? 'bg-blue-600/20' : ''
                      }`}
                    >
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-xs text-muted-foreground">{channel.type}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <Button onClick={handleCreateQueue}>
          <Plus className="h-4 w-4 mr-2" />
          {t('queuesPage.newQueue')}
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('queuesPage.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Menu Configuration - Only show when a channel is selected */}
      {selectedChannelId && selectedChannel && (
        <QueueMenuConfig
          channelId={selectedChannelId}
          channelName={selectedChannel.name}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Queues Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredQueues.map((queue) => (
              <motion.div
                key={queue.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-muted rounded-xl border border-border p-5 hover:border-muted-foreground/20 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-400">
                        {queue.menu_option}
                      </span>
                      <h3 className="text-lg font-semibold">{queue.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{queue.menu_label}</p>
                  </div>
                  <Badge variant={queue.is_active ? 'success' : 'secondary'}>
                    {queue.is_active ? t('queuesPage.active') : t('queuesPage.inactive')}
                  </Badge>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('queuesPage.channel')}:</span>
                    <span>{queue.channel?.name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('queuesPage.pipeline')}:</span>
                    <span>{queue.pipeline?.name || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('queuesPage.sdrAgent')}:</span>
                    <span className={queue.sdr_agent_id ? 'text-green-400' : 'text-muted-foreground'}>
                      {queue.sdr_agent?.name || t('queuesPage.noAgent')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('queuesPage.leads')}:</span>
                    <span>{queue.leads_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('queuesPage.users')}:</span>
                    <span>{queue.users_count || 0}</span>
                  </div>
                </div>

                {/* Auto-distribute toggle */}
                <div className="flex items-center justify-between p-3 bg-background rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{t('queuesPage.autoDistribute')}</span>
                  </div>
                  <button
                    onClick={() => handleToggleAutoDistribute(queue)}
                    disabled={toggleAutoDistribute.isPending}
                    className="transition-colors"
                  >
                    {queue.auto_distribute ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageUsers(queue)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    {t('queuesPage.users')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(queue)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {t('queuesPage.preview')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDistributeWaiting(queue)}
                    disabled={distributeWaiting.isPending}
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    {t('queuesPage.distributeNow')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditQueue(queue)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteQueue(queue)}
                    disabled={deleteQueue.isPending}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {filteredQueues.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('queuesPage.noQueuesFound')}</p>
              <Button onClick={handleCreateQueue} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                {t('queuesPage.createFirstQueue')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close channel selector */}
      {showChannelSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowChannelSelector(false)}
        />
      )}

      {/* Modals */}
      <QueueFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        queue={selectedQueue}
        defaultChannelId={selectedChannelId}
      />

      <QueueUsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        queue={selectedQueue}
      />

      <QueuePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        queue={selectedQueue}
      />
    </div>
  )
}

