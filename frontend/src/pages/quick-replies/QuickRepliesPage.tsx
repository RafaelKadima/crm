import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  MessageSquareText,
  Edit,
  Trash2,
  Loader2,
  GripVertical,
  Hash,
  Eye,
  EyeOff,
  Copy,
  Sparkles,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  useQuickReplies,
  useCreateQuickReply,
  useUpdateQuickReply,
  useDeleteQuickReply,
  useQuickReplyVariables,
} from '@/hooks/useQuickReplies'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { QuickReply } from '@/types'
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react'

export function QuickRepliesPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedReply, setSelectedReply] = useState<QuickReply | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [replyToDelete, setReplyToDelete] = useState<QuickReply | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const { data: replies, isLoading } = useQuickReplies({ active_only: false })
  const { data: variables } = useQuickReplyVariables()
  const createMutation = useCreateQuickReply()
  const updateMutation = useUpdateQuickReply()
  const deleteMutation = useDeleteQuickReply()

  const filteredReplies = useMemo(() => {
    if (!replies) return []
    if (!searchQuery) return replies

    const search = searchQuery.toLowerCase()
    return replies.filter(
      (r) =>
        r.title.toLowerCase().includes(search) ||
        r.shortcut.toLowerCase().includes(search) ||
        r.content.toLowerCase().includes(search)
    )
  }, [replies, searchQuery])

  const handleCreate = () => {
    setSelectedReply(null)
    setIsModalOpen(true)
  }

  const handleEdit = (reply: QuickReply) => {
    setSelectedReply(reply)
    setIsModalOpen(true)
  }

  const handleDelete = (reply: QuickReply) => {
    setReplyToDelete(reply)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (replyToDelete) {
      await deleteMutation.mutateAsync(replyToDelete.id)
      toast.success(t('quickReplies.replyRemoved'))
      setIsDeleteModalOpen(false)
      setReplyToDelete(null)
    }
  }

  const handleCopyShortcut = (shortcut: string) => {
    navigator.clipboard.writeText(shortcut)
    toast.success(t('quickReplies.shortcutCopied'))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('quickReplies.title')}
        subtitle={t('quickReplies.subtitle')}
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('quickReplies.newReply')}
          </Button>
        }
      />

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-400 mb-1">{t('quickReplies.howToUse')}</p>
              <p className="text-muted-foreground">
                {t('quickReplies.howToUseDescription')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('quickReplies.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredReplies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquareText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? t('quickReplies.noReplyFound') : t('quickReplies.noQuickReply')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? t('quickReplies.tryAnotherSearch')
                : t('quickReplies.createFirstReply')}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                {t('quickReplies.createReply')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredReplies.map((reply) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <Card
                className={cn(
                  'hover:border-primary/50 transition-colors',
                  !reply.is_active && 'opacity-60'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Drag Handle (visual only for now) */}
                    <div className="pt-1 cursor-grab text-muted-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium truncate">{reply.title}</h3>
                        <Badge
                          variant="secondary"
                          className="shrink-0 cursor-pointer hover:bg-primary/20"
                          onClick={() => handleCopyShortcut(reply.shortcut)}
                          title={t('quickReplies.clickToCopy')}
                        >
                          <Hash className="h-3 w-3 mr-1" />
                          {reply.shortcut}
                        </Badge>
                        {!reply.is_active && (
                          <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                            <EyeOff className="h-3 w-3 mr-1" />
                            {t('quickReplies.inactiveLabel')}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                        {reply.content}
                      </p>

                      {reply.variables && reply.variables.length > 0 && (
                        <div className="flex items-center gap-1 mt-2">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-xs text-purple-400">
                            {t('quickReplies.variablesLabel')}: {reply.variables.join(', ')}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {t('quickReplies.usedTimes', { count: reply.use_count })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(reply)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleDelete(reply)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <QuickReplyModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        reply={selectedReply}
        variables={variables || {}}
        onSave={async (data) => {
          if (selectedReply) {
            await updateMutation.mutateAsync({ id: selectedReply.id, data })
            toast.success(t('quickReplies.replyUpdated'))
          } else {
            await createMutation.mutateAsync(data)
            toast.success(t('quickReplies.replyCreated'))
          }
          setIsModalOpen(false)
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('quickReplies.deleteTitle')}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-muted-foreground">
              {t('quickReplies.deleteConfirm')}{' '}
              <strong>"{replyToDelete?.title}"</strong>?
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Modal Component
interface QuickReplyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reply: QuickReply | null
  variables: Record<string, string>
  onSave: (data: { title: string; content: string; is_active?: boolean }) => Promise<void>
  isLoading: boolean
}

function QuickReplyModal({
  open,
  onOpenChange,
  reply,
  variables,
  onSave,
  isLoading,
}: QuickReplyModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showVariables, setShowVariables] = useState(false)

  // Reset form when modal opens
  useState(() => {
    if (open) {
      if (reply) {
        setTitle(reply.title)
        setContent(reply.content)
        setIsActive(reply.is_active)
      } else {
        setTitle('')
        setContent('')
        setIsActive(true)
      }
    }
  })

  // Update form when reply changes
  if (open && reply && title !== reply.title && content !== reply.content) {
    setTitle(reply.title)
    setContent(reply.content)
    setIsActive(reply.is_active)
  } else if (open && !reply && (title || content)) {
    // Keep form state on create
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave({ title, content, is_active: isActive })
    setTitle('')
    setContent('')
    setIsActive(true)
  }

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setContent((prev) => prev + emojiData.emoji)
    setShowEmojiPicker(false)
  }

  const insertVariable = (variable: string) => {
    setContent((prev) => prev + variable)
    setShowVariables(false)
  }

  const generatedShortcut = title ? `/${title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}` : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reply ? t('quickReplies.edit') : t('quickReplies.new')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('quickReplies.titleLabel')} *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Saudação inicial"
                required
              />
              {generatedShortcut && (
                <p className="text-xs text-muted-foreground">
                  Atalho: <code className="px-1 bg-muted rounded">{generatedShortcut}</code>
                </p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('quickReplies.messageLabel')} *</label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVariables(!showVariables)}
                    className="h-7 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('quickReplies.variablesLabel')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="h-7 text-xs"
                  >
                    😊 {t('quickReplies.emojiLabel')}
                  </Button>
                </div>
              </div>

              {/* Variables Dropdown */}
              <AnimatePresence>
                {showVariables && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-muted rounded-lg space-y-2 mb-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t('quickReplies.clickToInsert')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(variables).map(([key, desc]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => insertVariable(key)}
                            className="px-2 py-1 text-xs bg-background rounded border hover:border-primary transition-colors"
                            title={desc}
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute z-50"
                  >
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={Theme.DARK}
                      width={350}
                      height={400}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite sua mensagem... Use variáveis como {nome_cliente} para personalizar."
                required
                rows={5}
                className="w-full px-3 py-2 bg-background border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Active Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">{t('quickReplies.activeLabel')}</span>
            </label>

            {/* Preview */}
            {content && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{t('quickReplies.previewLabel')}:</label>
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{content}</p>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !title || !content}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageSquareText className="h-4 w-4 mr-2" />
              )}
              {reply ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default QuickRepliesPage
