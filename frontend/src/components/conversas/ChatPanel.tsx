import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Phone,
  Mail,
  MessageSquare,
  Instagram,
  Loader2,
  Bot,
  UserRound,
  ArrowRightLeft,
  MessageSquareOff,
  RotateCcw,
  ListChecks,
  Sparkles,
  ExternalLink,
  PanelRightOpen,
  PanelRightClose,
  CheckCheck,
  Check,
  ChevronDown,
  Layers,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { TransferModal } from '@/components/chat/TransferModal'
import { CloseConversationModal } from '@/components/chat/CloseConversationModal'
import { TemplateSelector } from '@/components/chat/TemplateSelector'
import { QuickReplySelector } from '@/components/chat/QuickReplySelector'
import { ProductSelector } from '@/components/chat/ProductSelector'
import { FileUploadButton } from '@/components/chat/FileUploadButton'
import { AudioRecorder } from '@/components/chat/AudioRecorder'
import { MessageAttachment } from '@/components/chat/MessageAttachment'
import { MessageContextMenu } from '@/components/chat/MessageContextMenu'
import { extractDataFromText } from '@/lib/dataExtractor'
import { cn, formatPhone } from '@/lib/utils'
import { useLeadMessages } from '@/hooks/useWebSocket'
import { useReopenTicket } from '@/hooks/useTicketActions'
import { useUpdateLeadStage } from '@/hooks/useLeads'
import { usePipelines, type PipelineStage } from '@/hooks/usePipelines'
import { notify } from '@/components/ui/FuturisticNotification'
import { useAuth } from '@/hooks/useAuth'
import { useHasFeature } from '@/hooks/useFeatures'
import type { Lead } from '@/types'
import api from '@/api/axios'

interface ChatPanelProps {
  lead: Lead
  onToggleInfo: () => void
  isInfoOpen: boolean
}

interface MessageMetadata {
  attachment_id?: string
  media_type?: string
  media_url?: string
  file_name?: string
  file_size?: number
  mime_type?: string
  image_url?: string
  audio_url?: string
  video_url?: string
  document_url?: string
}

interface Message {
  id: string
  content: string
  sender_type: 'user' | 'contact' | 'ia'
  direction: 'inbound' | 'outbound'
  created_at: string
  status?: 'sending' | 'sent' | 'delivered' | 'read'
  metadata?: MessageMetadata
}

const channelIcons: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  telefone: Phone,
  email: Mail,
}

/**
 * Check if message content is just a media placeholder or filename that shouldn't be displayed
 * This handles messages imported from Z-PRO where the body contains the filename
 */
function isMediaPlaceholder(content: string, metadata?: MessageMetadata): boolean {
  if (!metadata) return false

  // If there's no media_url or audio_url, show the content
  const hasMedia = metadata.media_url || metadata.audio_url || metadata.image_url || metadata.video_url || metadata.sticker_url
  if (!hasMedia) return false

  // Standard placeholders from WhatsApp webhook processing
  const placeholders = ['[Áudio]', '[Imagem]', '[Vídeo]', '[Documento]', '[Sticker]']
  if (placeholders.some(p => content.startsWith(p))) {
    // Show caption if there's more text after the placeholder
    const placeholder = placeholders.find(p => content.startsWith(p))
    if (placeholder && content.length > placeholder.length + 1) {
      return false // Has caption, show it
    }
    return true // Just placeholder, hide it
  }

  // Check if content looks like a filename (for migrated Z-PRO messages)
  // Pattern: ends with media extension
  const mediaExtensions = /\.(ogg|mp3|mp4|m4a|wav|webm|opus|aac|amr|jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx)$/i
  if (mediaExtensions.test(content.trim())) {
    return true
  }

  // Check if content is just a media ID (long alphanumeric string)
  // Z-PRO sometimes stores media IDs as the body
  if (/^[a-zA-Z0-9_-]{20,}$/.test(content.trim())) {
    return true
  }

  return false
}

export function ChatPanel({ lead, onToggleInfo, isInfoOpen }: ChatPanelProps) {
  const queryClient = useQueryClient()
  const { user, tenant } = useAuth()
  const { hasAccess: hasIaFeature } = useHasFeature('sdr_ia')
  const hasLinxIntegration = tenant?.linx_enabled === true

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [ticketStatus, setTicketStatus] = useState<'open' | 'closed'>('open')
  const [iaEnabled, setIaEnabled] = useState(true)
  const [isTogglingIa, setIsTogglingIa] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [isSendingToLinx, setIsSendingToLinx] = useState(false)
  const [showStageSelector, setShowStageSelector] = useState(false)
  const [currentStage, setCurrentStage] = useState<PipelineStage | null>(lead.stage || null)
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    messageContent: string
    position: { x: number; y: number }
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const processedMessageIds = useRef<Set<string>>(new Set())
  const stageSelectorRef = useRef<HTMLDivElement>(null)

  const reopenTicket = useReopenTicket()
  const updateStageMutation = useUpdateLeadStage()
  const { data: pipelinesData } = usePipelines()
  const ChannelIcon = channelIcons[lead.channel?.type || ''] || MessageSquare

  // Get stages from pipeline
  const stages = useMemo(() => {
    if (!pipelinesData || !lead.pipeline_id) return []
    const pipelines = Array.isArray(pipelinesData) ? pipelinesData : (pipelinesData as any)?.data || []
    const pipeline = pipelines.find((p: any) => p.id === lead.pipeline_id)
    return pipeline?.stages?.sort((a: PipelineStage, b: PipelineStage) => a.order - b.order) || []
  }, [pipelinesData, lead.pipeline_id])

  // Update current stage when lead changes
  useEffect(() => {
    if (lead.stage) {
      setCurrentStage(lead.stage)
    } else if (stages.length > 0 && lead.stage_id) {
      const stage = stages.find((s: PipelineStage) => s.id === lead.stage_id)
      if (stage) setCurrentStage(stage)
    }
  }, [lead, stages])

  // Close stage selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stageSelectorRef.current && !stageSelectorRef.current.contains(e.target as Node)) {
        setShowStageSelector(false)
      }
    }
    if (showStageSelector) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStageSelector])

  // Handle stage change
  const handleMoveToStage = async (stage: PipelineStage) => {
    if (!lead) return
    try {
      await updateStageMutation.mutateAsync({ id: lead.id, stage_id: stage.id })
      setCurrentStage(stage)
      setShowStageSelector(false)
      notify('success', { title: `Movido para ${stage.name}` })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    } catch (error) {
      notify('error', { title: 'Erro ao mover lead' })
    }
  }

  // Query para Lead Score
  const { data: leadScore, isLoading: isLoadingScore } = useQuery({
    queryKey: ['lead-score', lead.id],
    queryFn: async () => {
      const response = await api.get(`/leads/${lead.id}/score`)
      return response.data
    },
    enabled: !!lead.id && hasIaFeature,
    staleTime: 60000,
    retry: 1,
  })

  // Carrega mensagens quando lead muda
  useEffect(() => {
    if (lead?.id) {
      loadMessages()
    }
  }, [lead?.id])

  const loadMessages = async () => {
    setIsLoading(true)
    try {
      const response = await api.get(`/leads/${lead.id}`)
      const leadData = response.data

      const ticket = leadData.tickets?.find((t: any) => t.status !== 'closed') || leadData.tickets?.[0]

      if (ticket) {
        setTicketId(ticket.id)
        setTicketStatus(ticket.status === 'closed' ? 'closed' : 'open')
        setIaEnabled(ticket.ia_enabled !== false)

        const messagesResponse = await api.get(`/tickets/${ticket.id}/messages?page=1`)
        const rawMessages = messagesResponse.data.data || []

        // Mapeia campos da API para o formato do frontend
        const mappedMessages: Message[] = rawMessages.map((m: any) => ({
          id: m.id,
          content: m.message || m.content || '',
          sender_type: m.sender_type,
          direction: m.direction,
          created_at: m.sent_at || m.created_at,
          status: m.status,
          metadata: m.metadata,
        }))

        setMessages(mappedMessages.reverse())
        processedMessageIds.current = new Set(mappedMessages.map((m) => m.id))
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // WebSocket para mensagens em tempo real
  const handleNewMessage = useCallback((event: any) => {
    // O evento pode vir como MessageEvent (com .message) ou como Message direta
    const rawMessage = event.message || event

    // Mapeia campos da API para o formato do frontend
    const mappedMessage: Message = {
      id: rawMessage.id,
      content: rawMessage.content || rawMessage.message || '',
      sender_type: rawMessage.sender_type as 'user' | 'contact' | 'ia',
      direction: rawMessage.direction as 'inbound' | 'outbound',
      created_at: rawMessage.sent_at || rawMessage.created_at,
      status: rawMessage.status || 'sent',
      metadata: rawMessage.metadata,
    }

    // Verifica se já processamos essa mensagem
    if (processedMessageIds.current.has(mappedMessage.id)) return

    // Para mensagens outbound, verifica se há uma mensagem temp pendente com mesmo conteúdo
    // Isso evita duplicatas quando o WebSocket chega antes da resposta da API
    if (mappedMessage.direction === 'outbound') {
      setMessages((prev) => {
        // Procura uma mensagem temp com mesmo conteúdo
        const tempIndex = prev.findIndex(
          (m) => m.id.startsWith('temp-') && m.content === mappedMessage.content && m.direction === 'outbound'
        )

        if (tempIndex !== -1) {
          // Substitui a mensagem temp pela real
          processedMessageIds.current.add(mappedMessage.id)
          const updated = [...prev]
          updated[tempIndex] = mappedMessage
          return updated
        }

        // Se não há temp, verifica se já existe uma mensagem com esse ID
        if (prev.some((m) => m.id === mappedMessage.id)) {
          return prev
        }

        // Nova mensagem outbound (provavelmente de outro usuário/IA)
        processedMessageIds.current.add(mappedMessage.id)
        return [...prev, mappedMessage]
      })
    } else {
      // Mensagem inbound - adiciona normalmente
      processedMessageIds.current.add(mappedMessage.id)
      setMessages((prev) => [...prev, mappedMessage])
    }

    scrollToBottom()
  }, [scrollToBottom])

  useLeadMessages(lead.id, handleNewMessage)

  // Enviar mensagem
  const handleSend = async () => {
    if (!message.trim() || !ticketId) return

    const tempId = `temp-${Date.now()}`
    const newMessage: Message = {
      id: tempId,
      content: message,
      sender_type: 'user',
      direction: 'outbound',
      created_at: new Date().toISOString(),
      status: 'sending',
    }

    setMessages((prev) => [...prev, newMessage])
    setMessage('')
    setIsSending(true)

    try {
      const response = await api.post(`/tickets/${ticketId}/messages`, { message: message.trim() })
      const sentMessage = response.data

      // Mapeia a resposta para o formato do frontend
      const mappedMessage: Message = {
        id: sentMessage.id,
        content: sentMessage.message || sentMessage.content || message.trim(),
        sender_type: 'user',
        direction: 'outbound',
        created_at: sentMessage.sent_at || sentMessage.created_at || new Date().toISOString(),
        status: 'sent',
        metadata: sentMessage.metadata,
      }

      // Adiciona o ID ao set ANTES de atualizar o estado
      // Isso previne o WebSocket de adicionar duplicata
      processedMessageIds.current.add(mappedMessage.id)

      setMessages((prev) => {
        // Verifica se a mensagem já foi substituída pelo WebSocket
        const existingIndex = prev.findIndex((m) => m.id === mappedMessage.id)
        if (existingIndex !== -1) {
          // WebSocket já substituiu, mantém como está
          return prev.filter((m) => m.id !== tempId)
        }
        // Substitui a temp pela real
        return prev.map((m) => (m.id === tempId ? mappedMessage : m))
      })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      notify('error', { title: 'Erro ao enviar mensagem' })
    } finally {
      setIsSending(false)
    }
  }

  // Toggle IA
  const handleToggleIa = async () => {
    if (!ticketId) return
    setIsTogglingIa(true)
    try {
      const response = await api.put(`/tickets/${ticketId}/toggle-ia`)
      setIaEnabled(response.data.ia_enabled)
    } catch (error) {
      console.error('Error toggling IA:', error)
    } finally {
      setIsTogglingIa(false)
    }
  }

  // Enviar para Linx
  const handleSendToLinx = async () => {
    setIsSendingToLinx(true)
    try {
      const response = await api.post(`/leads/${lead.id}/send-to-linx`)
      if (response.data.success) {
        notify('success', {
          title: 'Enviado para o Linx!',
          description: response.data.linx_codigo_cliente
            ? `Código do cliente: ${response.data.linx_codigo_cliente}`
            : 'Lead enviado com sucesso',
        })
        queryClient.invalidateQueries({ queryKey: ['leads'] })
      } else {
        notify('error', {
          title: 'Erro ao enviar',
          description: response.data.message || 'Tente novamente',
        })
      }
    } catch (error: any) {
      notify('error', {
        title: 'Erro ao enviar para o Linx',
        description: error?.response?.data?.message || 'Tente novamente',
      })
    } finally {
      setIsSendingToLinx(false)
    }
  }

  // Reabrir ticket
  const handleReopenTicket = async () => {
    if (!ticketId) return
    try {
      await reopenTicket.mutateAsync(ticketId)
      setTicketStatus('open')
      notify('success', { title: 'Conversa reaberta!' })
    } catch (error) {
      notify('error', { title: 'Erro ao reabrir conversa' })
    }
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Channel type for file upload and audio
  const channelType = lead.channel?.type || 'whatsapp'

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar com ícone do canal */}
          <div className="relative">
            <Avatar
              src={lead.contact?.profile_picture_url}
              name={lead.contact?.name || 'Lead'}
              size="md"
            />
            {/* Channel badge */}
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 p-1 rounded-full",
              lead.channel?.type === 'whatsapp' ? 'bg-green-500 text-white' :
              lead.channel?.type === 'instagram' ? 'bg-pink-500 text-white' :
              'bg-blue-500 text-white'
            )}>
              <ChannelIcon className="h-2.5 w-2.5" />
            </div>
          </div>
          <div>
            <h4 className="font-medium">{lead.contact?.name || 'Lead'}</h4>
            <p className="text-xs text-muted-foreground">
              {lead.contact?.phone ? formatPhone(lead.contact.phone) : 'Sem telefone'}
            </p>
          </div>

          {/* Stage Selector */}
          {currentStage && (
            <div className="relative" ref={stageSelectorRef}>
              <button
                onClick={() => setShowStageSelector(!showStageSelector)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                  "hover:opacity-80 cursor-pointer"
                )}
                style={{
                  backgroundColor: `${currentStage.color}20`,
                  color: currentStage.color,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: currentStage.color }}
                />
                {currentStage.name}
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform",
                  showStageSelector && "rotate-180"
                )} />
              </button>

              {/* Stage Dropdown */}
              <AnimatePresence>
                {showStageSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden z-50 min-w-[180px]"
                  >
                    {stages.map((stage: PipelineStage) => (
                      <button
                        key={stage.id}
                        onClick={() => handleMoveToStage(stage)}
                        disabled={stage.id === currentStage?.id || updateStageMutation.isPending}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors",
                          stage.id === currentStage?.id && "bg-muted/50 opacity-60 cursor-not-allowed"
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span>{stage.name}</span>
                        {stage.id === currentStage?.id && (
                          <Check className="h-3.5 w-3.5 ml-auto text-green-500" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Lead Score */}
          {hasIaFeature && leadScore && (
            <div className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1",
              leadScore.score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
              leadScore.score >= 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              <Sparkles className="h-3 w-3" />
              {Math.round(leadScore.score)}% conversão
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {ticketStatus === 'open' ? (
            <>
              {hasLinxIntegration && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendToLinx}
                  disabled={isSendingToLinx}
                  className="text-orange-400 border-orange-400/30 hover:bg-orange-400/10"
                >
                  {isSendingToLinx ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Linx</span>
                </Button>
              )}

              {hasIaFeature && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleIa}
                  disabled={isTogglingIa}
                  className={cn(
                    iaEnabled
                      ? "bg-green-600/20 text-green-400 border-green-500/30"
                      : "text-muted-foreground border-muted-foreground/30"
                  )}
                >
                  {isTogglingIa ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : iaEnabled ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">{iaEnabled ? 'IA Ativa' : 'Você'}</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferModalOpen(true)}
                className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Transferir</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCloseModalOpen(true)}
                className="text-red-400 border-red-400/30 hover:bg-red-400/10"
              >
                <MessageSquareOff className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Encerrar</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReopenTicket}
              disabled={reopenTicket.isPending}
            >
              {reopenTicket.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              <span className="ml-1.5">Reabrir</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleInfo}
            className="text-muted-foreground"
          >
            {isInfoOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Ticket Closed Warning */}
      {ticketStatus === 'closed' && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30">
          <p className="text-xs text-amber-400 text-center">
            Conversa encerrada. O lead passará pelo menu de filas se enviar nova mensagem.
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1 chat-messages-bg"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Nenhuma mensagem ainda</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const prevMsg = index > 0 ? messages[index - 1] : null
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null
            const isFirstInGroup = prevMsg?.direction !== msg.direction
            const isLastInGroup = nextMsg?.direction !== msg.direction

            return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                'flex',
                msg.direction === 'outbound' ? 'justify-end' : 'justify-start',
                isFirstInGroup && index > 0 && 'mt-3'
              )}
            >
              <div
                onClick={(e) => {
                  if (msg.direction === 'inbound') {
                    const extractedData = extractDataFromText(msg.content)
                    if (extractedData.length > 0) {
                      const rect = (e.target as HTMLElement).getBoundingClientRect()
                      setContextMenu({
                        show: true,
                        messageContent: msg.content,
                        position: {
                          x: Math.min(rect.left, window.innerWidth - 320),
                          y: Math.min(rect.bottom + 8, window.innerHeight - 350),
                        },
                      })
                    }
                  }
                }}
                className={cn(
                  'max-w-[85%] rounded-xl px-3.5 py-2',
                  msg.direction === 'outbound'
                    ? 'chat-bubble-outbound'
                    : 'bg-muted text-foreground border border-border cursor-pointer hover:border-primary/30 transition-colors',
                  msg.direction === 'outbound' && isLastInGroup && 'rounded-br-sm',
                  msg.direction === 'inbound' && isLastInGroup && 'rounded-bl-sm'
                )}
              >
                {/* Attachment */}
                {msg.metadata && (msg.metadata.media_url || msg.metadata.image_url || msg.metadata.audio_url || msg.metadata.sticker_url) && (
                  <MessageAttachment
                    metadata={msg.metadata}
                    direction={msg.direction}
                    ticketId={ticketId}
                  />
                )}

                {/* Text - hide if it's just a media filename or placeholder */}
                {msg.content && !isMediaPlaceholder(msg.content, msg.metadata) && (
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                )}

                {/* Time & Status */}
                <div className={cn(
                  "flex items-center gap-1 mt-1",
                  msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                )}>
                  <span className="text-[10px] opacity-60">{formatTime(msg.created_at)}</span>
                  {msg.direction === 'outbound' && (
                    <span className="opacity-60">
                      {msg.status === 'read' ? (
                        <CheckCheck className="h-3 w-3 text-blue-400" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </span>
                  )}
                  {msg.sender_type === 'ia' && (
                    <Bot className="h-3 w-3 opacity-60" />
                  )}
                </div>
                {/* Reactions */}
                {msg.metadata?.reactions && (msg.metadata.reactions as Array<{emoji: string}>).length > 0 && (
                  <div className={cn(
                    'flex gap-1 -mt-0.5',
                    msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                  )}>
                    {(msg.metadata.reactions as Array<{emoji: string; from: string}>).map((r, i) => (
                      <span
                        key={i}
                        className="text-sm bg-muted border border-border rounded-full px-1.5 py-0.5 shadow-sm"
                        title={r.from}
                      >
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )})
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {ticketStatus === 'open' && (
        <div className="p-4 border-t bg-background">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <FileUploadButton
                ticketId={ticketId}
                channelType={channelType}
                onUploadComplete={(attachment) => {
                  const newMessage: Message = {
                    id: `attachment-${Date.now()}`,
                    content: '',
                    sender_type: 'user',
                    direction: 'outbound',
                    created_at: new Date().toISOString(),
                    status: 'sent',
                    metadata: {
                      media_url: attachment.url,
                      media_type: attachment.type,
                      file_name: attachment.name,
                    },
                  }
                  setMessages((prev) => [...prev, newMessage])
                }}
                onMediaSent={() => {
                  queryClient.invalidateQueries({ queryKey: ['leads'] })
                }}
              />
              <AudioRecorder
                ticketId={ticketId}
                channelType={channelType}
                onAudioSent={(msg) => {
                  setMessages((prev) => [...prev, {
                    id: msg.id,
                    content: msg.content,
                    sender_type: msg.sender_type as 'user' | 'contact' | 'ia',
                    direction: msg.direction as 'inbound' | 'outbound',
                    created_at: msg.created_at,
                    status: msg.status,
                    metadata: msg.metadata,
                  }])
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsProductSelectorOpen(true)}
                className="text-muted-foreground hover:text-foreground h-9 w-9"
                title="Enviar produto do catálogo"
              >
                <Sparkles className="h-4 w-4" />
              </Button>

              {/* Botão de Templates WhatsApp - só aparece para canais WhatsApp */}
              {channelType === 'whatsapp' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="text-muted-foreground hover:text-foreground h-9 w-9"
                  title="Enviar template WhatsApp"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Digite sua mensagem..."
                className={cn(
                  "w-full px-4 py-2.5 rounded-full",
                  "bg-muted border border-transparent",
                  "focus:border-primary focus:outline-none",
                  "placeholder:text-muted-foreground text-sm"
                )}
              />

              {/* Quick Replies */}
              <AnimatePresence>
                {showQuickReplies && (
                  <QuickReplySelector
                    onSelect={(reply) => {
                      setMessage(reply)
                      setShowQuickReplies(false)
                      inputRef.current?.focus()
                    }}
                    onClose={() => setShowQuickReplies(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            <Button
              onClick={handleSend}
              disabled={!message.trim() || isSending}
              size="icon"
              className="rounded-full"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        ticketId={ticketId}
        leadId={lead.id}
        onTransferSuccess={() => {
          setIsTransferModalOpen(false)
          queryClient.invalidateQueries({ queryKey: ['leads'] })
        }}
      />

      <CloseConversationModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        ticketId={ticketId}
        onSuccess={() => {
          setIsCloseModalOpen(false)
          setTicketStatus('closed')
          queryClient.invalidateQueries({ queryKey: ['leads'] })
        }}
      />

      <TemplateSelector
        channelId={lead.channel?.id}
        ticketId={ticketId}
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSent={() => {
          // Recarrega mensagens após enviar template
          queryClient.invalidateQueries({ queryKey: ['leads'] })
        }}
      />

      <ProductSelector
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        ticketId={ticketId}
        onSent={(data) => {
          // Adiciona a mensagem do produto ao chat
          const newMessage: Message = {
            id: data.message.id,
            content: data.message.content,
            sender_type: 'user',
            direction: 'outbound',
            created_at: data.message.sent_at,
            status: 'sent',
          }
          setMessages((prev) => [...prev, newMessage])
          setIsProductSelectorOpen(false)
          queryClient.invalidateQueries({ queryKey: ['leads'] })
        }}
      />

      {/* Context Menu for Data Extraction */}
      {contextMenu?.show && (
        <MessageContextMenu
          messageContent={contextMenu.messageContent}
          leadId={lead.id}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onDataAdded={() => {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
          }}
        />
      )}
    </div>
  )
}
