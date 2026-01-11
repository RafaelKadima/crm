import { useState, useRef, useEffect, useCallback } from 'react'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Phone,
  Mail,
  MessageSquare,
  Instagram,
  Clock,
  User,
  DollarSign,
  Tag,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Smile,
  ArrowRight,
  CheckCheck,
  Check,
  Loader2,
  CheckCircle,
  FileText,
  Edit,
  ArrowRightLeft,
  ListChecks,
  MessageSquareOff,
  RotateCcw,
  Bot,
  UserRound,
  MessageSquareText,
  X,
  Sparkles,
  UserCheck,
  Package,
  ExternalLink,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { CustomerDataForm } from '@/components/forms/CustomerDataForm'
import { LeadEditForm } from '@/components/forms/LeadEditForm'
import { MessageFeedback } from '@/components/chat/MessageFeedback'
import { StageActivityChecklist } from '@/components/stage-activities/StageActivityChecklist'
import { TransferModal } from '@/components/chat/TransferModal'
import { CloseConversationModal } from '@/components/chat/CloseConversationModal'
import { TemplateSelector } from '@/components/chat/TemplateSelector'
import { QuickReplySelector } from '@/components/chat/QuickReplySelector'
import { ProductSelector, type ProductSentData } from '@/components/chat/ProductSelector'
import { FileUploadButton } from '@/components/chat/FileUploadButton'
import { AudioRecorder } from '@/components/chat/AudioRecorder'
import { MessageAttachment } from '@/components/chat/MessageAttachment'
import { MessageContextMenu } from '@/components/chat/MessageContextMenu'
import { extractDataFromText } from '@/lib/dataExtractor'
import { cn, formatCurrency, formatPhone } from '@/lib/utils'
import { useLeadMessages } from '@/hooks/useWebSocket'
import { useReopenTicket } from '@/hooks/useTicketActions'
import { notify } from '@/components/ui/FuturisticNotification'
import { useAuth } from '@/hooks/useAuth'
import { useHasFeature } from '@/hooks/useFeatures'
import type { Lead, PipelineStage } from '@/types'
import api from '@/api/axios'

interface LeadChatModalProps {
  lead: Lead | null
  stages?: PipelineStage[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onStageChange?: (leadId: string, stageId: string) => void
  forceClosingForm?: boolean // Força abrir o formulário de fechamento
  onLeadDeleted?: (leadId: string) => void // Callback quando lead é excluído
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

export function LeadChatModal({ lead, stages = [], open, onOpenChange, onStageChange, forceClosingForm = false, onLeadDeleted }: LeadChatModalProps) {
  const queryClient = useQueryClient()
  const { user, tenant } = useAuth()
  const { hasAccess: hasIaFeature } = useHasFeature('sdr_ia')
  // Verificar se tenant tem Linx habilitado
  const hasLinxIntegration = tenant?.linx_enabled === true
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isMovingStage, setIsMovingStage] = useState(false)
  const [showStageSelector, setShowStageSelector] = useState(false)
  const [currentStage, setCurrentStage] = useState<PipelineStage | null>(null)
  const [activeView, setActiveView] = useState<'chat' | 'closing' | 'edit' | 'activities'>('chat')
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [ticketStatus, setTicketStatus] = useState<'open' | 'closed'>('open')
  const [iaEnabled, setIaEnabled] = useState(true)
  const [isTogglingIa, setIsTogglingIa] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  // Estado para menu contextual de extração de dados
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    messageContent: string
    position: { x: number; y: number }
  } | null>(null)
  // Estado para envio ao Linx
  const [isSendingToLinx, setIsSendingToLinx] = useState(false)
  const [suggestion, setSuggestion] = useState<{
    action: string
    explanation: string
    confidence?: number
  } | null>(null)
  // 🔥 Estado para efeito de transferência em tempo real
  const [transferEffect, setTransferEffect] = useState<{
    show: boolean
    newOwnerName?: string
    isMyLead?: boolean
  }>({ show: false })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const sidebarContentRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const reopenTicket = useReopenTicket()

  // Query para buscar o Lead Score via MCP - só executa se tenant tem feature de IA
  const { data: leadScore, isLoading: isLoadingScore } = useQuery({
    queryKey: ['lead-score', lead?.id],
    queryFn: async () => {
      const response = await api.get(`/leads/${lead?.id}/score`)
      return response.data
    },
    enabled: !!lead?.id && open && hasIaFeature,
    staleTime: 60000, // Cache por 1 minuto
    retry: 1,
  })

  // Mutation para sugerir ação via MCP
  const suggestActionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/leads/${lead?.id}/suggest-action`)
      return response.data
    },
    onSuccess: (data) => {
      setSuggestion(data)
    },
  })

  // Função auxiliar para formatar nome da ação
  const formatAction = (action: string) => {
    const actions: Record<string, string> = {
      'RESPOND_NORMAL': 'Responder normalmente',
      'QUALIFY': 'Qualificar lead',
      'SCHEDULE': 'Agendar reunião',
      'ESCALATE': 'Escalar para humano',
      'SEND_CONTENT': 'Enviar conteúdo',
      'WAIT': 'Aguardar resposta',
    }
    return actions[action] || action
  }

  const ChannelIcon = channelIcons[lead?.channel?.type || ''] || MessageSquare
  
  // Track processed message IDs to prevent duplicates from multiple WebSocket events
  const processedMessageIds = useRef<Set<string>>(new Set())

  // 🔥 WebSocket: callback para receber mensagens em tempo real
  const handleNewMessage = useCallback((data: any) => {
    const messageId = data.message.id

    // Prevent processing same message twice (WebSocket can fire multiple times)
    if (processedMessageIds.current.has(messageId)) {
      console.log('📩 Mensagem já processada, ignorando:', messageId)
      return
    }
    processedMessageIds.current.add(messageId)

    console.log('📩 Nova mensagem para o lead:', data)

    // Ignora mensagens enviadas pelo próprio usuário (já foram adicionadas localmente)
    // EXCETO mensagens de mídia (que não têm mensagem temporária)
    const hasMedia = data.message.metadata && (
      data.message.metadata.media_url ||
      data.message.metadata.image_url ||
      data.message.metadata.audio_url ||
      data.message.metadata.video_url ||
      data.message.metadata.document_url
    )

    if (data.message.direction === 'outbound' && data.message.sender_type === 'user' && !hasMedia) {
      // Apenas atualiza o status da mensagem temporária para 'delivered'
      setMessages((prev) => {
        const tempMsg = prev.find(m => m.id.startsWith('temp-') && m.content === data.message.content)
        if (tempMsg) {
          return prev.map(m =>
            m.id === tempMsg.id
              ? { ...m, id: data.message.id, status: 'delivered' as const }
              : m
          )
        }
        // Se não encontrou mensagem temporária, verifica duplicata por ID
        if (prev.some(m => m.id === data.message.id)) return prev
        return prev
      })
      return
    }

    // Mensagens recebidas (inbound) ou de mídia - adiciona normalmente
    const newMsg: Message = {
      id: data.message.id,
      content: data.message.content,
      sender_type: data.message.sender_type,
      direction: data.message.direction,
      created_at: data.message.sent_at || data.message.created_at,
      status: 'delivered',
      metadata: data.message.metadata, // Include media metadata
    }
    setMessages((prev) => {
      // Evita duplicatas por ID
      if (prev.some(m => m.id === newMsg.id)) return prev
      return [...prev, newMsg]
    })

    // Scroll para a última mensagem quando recebe mídia
    if (hasMedia) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 100)
    }
  }, [])

  // 🔥 WebSocket: callback para reagir à transferência do lead em tempo real
  const handleLeadUpdated = useCallback((data: any) => {
    if (data.action === 'transferred') {
      const newOwner = data.lead?.owner
      const newOwnerId = data.lead?.owner_id
      const isMyLead = newOwnerId === user?.id
      
      // Atualiza o lead local com os novos dados
      setCurrentLead((prev) => prev ? { ...prev, ...data.lead } : null)
      
      // Mostra efeito visual de transferência
      setTransferEffect({
        show: true,
        newOwnerName: newOwner?.name || 'outro usuário',
        isMyLead,
      })
      
      // Notificação toast
      if (isMyLead) {
        notify('success', {
          title: '🎯 Lead recebido!',
          description: `${data.lead?.contact?.name || 'Lead'} foi transferido para você`,
          duration: 5000,
        })
      } else {
        notify('info', {
          title: '↗️ Lead transferido',
          description: `${data.lead?.contact?.name || 'Lead'} foi transferido para ${newOwner?.name || 'outro usuário'}`,
          duration: 5000,
        })
      }
      
      // Esconde o efeito após 3 segundos
      setTimeout(() => {
        setTransferEffect({ show: false })
      }, 3000)
    }
  }, [user?.id])

  // 🔥 WebSocket: escuta mensagens e atualizações do lead em tempo real
  useLeadMessages(open ? lead?.id || null : null, handleNewMessage, handleLeadUpdated)

  // Check if lead is in final/closing stage
  const isInClosingStage = currentStage?.is_final || currentStage?.is_won || 
    currentStage?.name?.toLowerCase().includes('fechamento') ||
    currentStage?.name?.toLowerCase().includes('ganho')

  // Se forceClosingForm está ativo, mostra o formulário
  useEffect(() => {
    if (forceClosingForm && open) {
      setActiveView('closing')
    } else if (open && !forceClosingForm) {
      setActiveView('chat')
    }
  }, [forceClosingForm, open])

  // Update current stage when lead changes
  useEffect(() => {
    if (lead && stages.length > 0) {
      const stage = lead.stage || stages.find(s => s.id === lead.stage_id)
      setCurrentStage(stage || null)
    }
  }, [lead, stages])

  // Update currentLead when lead changes
  useEffect(() => {
    setCurrentLead(lead)
  }, [lead])

  // Load messages when modal opens - reset pagination and input
  useEffect(() => {
    if (open && lead) {
      setCurrentPage(1)
      setHasMoreMessages(true)
      setMessages([])
      setMessage('') // Limpa o input ao abrir nova conversa
      setTicketId(null) // ⚠️ IMPORTANTE: Reseta ticketId para forçar busca do ticket correto
      loadMessages(1, false)

      // Reset sidebar scroll to top - com múltiplas tentativas para garantir
      const resetSidebarScroll = () => {
        if (sidebarContentRef.current) {
          sidebarContentRef.current.scrollTop = 0
        }
      }
      // Tentativas imediata + com delays para garantir que o DOM renderizou
      resetSidebarScroll()
      requestAnimationFrame(resetSidebarScroll)
      setTimeout(resetSidebarScroll, 50)
      setTimeout(resetSidebarScroll, 150)
    }
  }, [open, lead])

  // Scroll das mensagens para o final - apenas quando usuário envia mensagem
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [])

  // Scroll to bottom after initial messages load (instant, no animation)
  useEffect(() => {
    if (!isLoading && messages.length > 0 && currentPage === 1) {
      const scrollToEnd = () => {
        const container = messagesContainerRef.current
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      }
      // Multiple attempts to ensure scroll happens after DOM is fully ready
      scrollToEnd()
      requestAnimationFrame(scrollToEnd)
      // Extra delay for any animations/layout shifts
      setTimeout(scrollToEnd, 50)
      setTimeout(scrollToEnd, 150)
    }
  }, [isLoading, messages.length, currentPage])

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Get next stage
  const getNextStage = (): PipelineStage | null => {
    if (!currentStage || stages.length === 0) return stages[0] || null
    const currentIndex = stages.findIndex(s => s.id === currentStage.id)
    if (currentIndex === -1 || currentIndex >= stages.length - 1) return null
    return stages[currentIndex + 1]
  }

  const nextStage = getNextStage()

  // Carrega mensagens com paginação (lazy load)
  const loadMessages = async (page: number = 1, append: boolean = false) => {
    if (!lead) return
    
    if (page === 1) {
      setIsLoading(true)
    } else {
      setIsLoadingMore(true)
    }

    try {
      let currentTicketId = ticketId

      // SEMPRE busca o ticket na página 1 para garantir que é o ticket correto do lead atual
      // Isso evita usar o ticketId de um lead anterior quando trocamos de conversa
      if (!currentTicketId || page === 1) {
        const leadResponse = await api.get(`/leads/${lead.id}`)
        const leadData = leadResponse.data
        
        if (leadData.tickets && leadData.tickets.length > 0) {
          const ticket = leadData.tickets[0]
          currentTicketId = ticket.id
          setTicketId(currentTicketId)
          setTicketStatus(ticket.status === 'closed' ? 'closed' : 'open')
          // Carrega status da IA
          setIaEnabled(ticket.ia_enabled !== false) // Default true se não definido
        } else {
          setTicketId(null)
          setMessages([])
          setHasMoreMessages(false)
          return
        }
      }
      
      // Busca mensagens paginadas do ticket
      const messagesResponse = await api.get(`/tickets/${currentTicketId}/messages`, {
        params: { page, per_page: 30 }
      })
      
      const { data: ticketMessages, has_more } = messagesResponse.data
      
      const formattedMessages = ticketMessages.map((m: any) => ({
        id: m.id,
        content: m.message,
        sender_type: m.sender_type,
        direction: m.direction,
        created_at: m.sent_at || m.created_at,
        status: 'delivered',
        metadata: m.metadata, // Include media metadata
      })).reverse() // Reverte para ordem cronológica
      
      if (append) {
        // Adiciona mensagens antigas no início
        setMessages(prev => [...formattedMessages, ...prev])
      } else {
        setMessages(formattedMessages)
      }
      
      setHasMoreMessages(has_more)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error loading messages:', error)
      if (!append) {
        setTicketId(null)
        setMessages([])
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  // Carrega mais mensagens ao rolar para cima
  const loadMoreMessages = useCallback(() => {
    if (!isLoadingMore && hasMoreMessages && ticketId) {
      loadMessages(currentPage + 1, true)
    }
  }, [isLoadingMore, hasMoreMessages, currentPage, ticketId])

  // Handler de scroll para lazy load
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    // Se rolou até o topo, carrega mais mensagens
    if (target.scrollTop < 50 && hasMoreMessages && !isLoadingMore) {
      const scrollHeightBefore = target.scrollHeight
      loadMoreMessages()
      // Mantém posição do scroll após carregar mais mensagens
      requestAnimationFrame(() => {
        const scrollHeightAfter = target.scrollHeight
        target.scrollTop = scrollHeightAfter - scrollHeightBefore
      })
    }
  }, [loadMoreMessages, hasMoreMessages, isLoadingMore])

  const handleMoveToNextStage = async () => {
    if (!lead || !nextStage || !onStageChange) return

    setIsMovingStage(true)
    try {
      onStageChange(lead.id, nextStage.id)
      setCurrentStage(nextStage)
      setShowStageSelector(false)
    } finally {
      setIsMovingStage(false)
    }
  }

  const handleMoveToStage = async (stage: PipelineStage) => {
    if (!lead || !onStageChange) return

    setIsMovingStage(true)
    try {
      onStageChange(lead.id, stage.id)
      setCurrentStage(stage)
      setShowStageSelector(false)
    } finally {
      setIsMovingStage(false)
    }
  }

  // Toggle IA on/off para este ticket
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

  // Enviar lead para o Linx
  const handleSendToLinx = async () => {
    if (!lead) return

    setIsSendingToLinx(true)
    try {
      const response = await api.post(`/leads/${lead.id}/send-to-linx`)

      if (response.data.success) {
        notify('success', {
          title: 'Enviado para o Linx!',
          description: response.data.linx_codigo_cliente
            ? `Código do cliente: ${response.data.linx_codigo_cliente}`
            : 'Lead enviado com sucesso',
          duration: 5000,
        })
        // Atualiza o lead no cache
        queryClient.invalidateQueries({ queryKey: ['leads'] })
      } else {
        notify('error', {
          title: 'Erro ao enviar',
          description: response.data.message || 'Tente novamente',
          duration: 5000,
        })
      }
    } catch (error: any) {
      console.error('Error sending to Linx:', error)
      notify('error', {
        title: 'Erro ao enviar para o Linx',
        description: error?.response?.data?.message || 'Tente novamente',
        duration: 5000,
      })
    } finally {
      setIsSendingToLinx(false)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || !lead || !ticketId) {
      console.error('Não é possível enviar: lead ou ticket não encontrado')
      return
    }

    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      content: message,
      sender_type: 'user',
      direction: 'outbound',
      created_at: new Date().toISOString(),
      status: 'sending',
    }

    setMessages((prev) => [...prev, newMessage])
    setMessage('')
    setIsSending(true)
    
    // Scroll para a última mensagem
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
      }
    }, 50)

    try {
      // Determine which API to use based on channel type
      const channelType = lead.channel?.type?.toLowerCase()
      
      const sendMessage = async () => {
        if (channelType === 'whatsapp' && lead.contact?.phone) {
          // Send via WhatsApp API
          return api.post(`/whatsapp/tickets/${ticketId}/send`, {
            message: newMessage.content,
          })
        } else if (channelType === 'instagram') {
          // Send via Instagram API - com fallback para genérico
          try {
            return await api.post(`/instagram/tickets/${ticketId}/send`, {
              message: newMessage.content,
            })
          } catch (igError: any) {
            // Se Instagram falhar (sem instagram_id), usa endpoint genérico
            if (igError?.response?.status === 400) {
              console.warn('Instagram API failed, using generic endpoint')
              return api.post(`/tickets/${ticketId}/messages`, {
                message: newMessage.content,
              })
            }
            throw igError
          }
        } else {
          // Generic ticket message
          return api.post(`/tickets/${ticketId}/messages`, {
            message: newMessage.content,
          })
        }
      }

      await sendMessage()

      // Update message status to sent
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMessage.id ? { ...m, status: 'sent' as const } : m
        )
      )

      // Simulate delivered status after a delay
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === newMessage.id ? { ...m, status: 'delivered' as const } : m
          )
        )
      }, 1000)

      // Invalida cache para atualizar listas (leads, tickets)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })

    } catch (error) {
      console.error('Error sending message:', error)
      // Mark as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMessage.id ? { ...m, status: 'sent' as const } : m
        )
      )
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReopenTicket = async () => {
    if (!ticketId) return
    try {
      await reopenTicket.mutateAsync(ticketId)
      setTicketStatus('open')
    } catch (error) {
      console.error('Error reopening ticket:', error)
    }
  }

  const handleTransferSuccess = async () => {
    // Recarrega o lead para atualizar as informações (owner, etc)
    if (lead?.id) {
      try {
        const response = await api.get(`/leads/${lead.id}`)
        if (response.data) {
          const newLead = response.data
          setCurrentLead(newLead)
          
          // Mostra efeito visual de sucesso na transferência
          const newOwnerName = newLead.owner?.name || 'outro usuário'
          setTransferEffect({
            show: true,
            newOwnerName,
            isMyLead: false, // Eu transferi, então não é mais meu
          })
          
          // Notificação de sucesso
          notify('success', {
            title: '✅ Transferência concluída!',
            description: `Lead transferido para ${newOwnerName}`,
            duration: 4000,
          })
          
          // Esconde o efeito e fecha o modal após um tempo
          setTimeout(() => {
            setTransferEffect({ show: false })
            // Fecha o modal após mostrar o feedback
            setTimeout(() => {
              onOpenChange(false)
            }, 500)
          }, 2000)
        }
      } catch (error) {
        console.error('Erro ao recarregar lead:', error)
      }
      // Também recarrega as mensagens
      loadMessages(1, false)
    }
  }

  const handleCloseSuccess = () => {
    setTicketStatus('closed')
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="p-0 flex !h-[80vh] relative overflow-hidden chat-container-premium border-primary/20 shadow-2xl shadow-primary/10">
        {/* 🔥 Efeito visual de transferência em tempo real */}
        <AnimatePresence>
          {transferEffect.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className={cn(
                  "p-8 rounded-2xl border shadow-2xl text-center max-w-sm mx-4",
                  transferEffect.isMyLead 
                    ? "bg-gradient-to-br from-emerald-950 to-green-900/80 border-emerald-500/50" 
                    : "bg-gradient-to-br from-blue-950 to-indigo-900/80 border-blue-500/50"
                )}
              >
                {/* Ícone animado */}
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1, damping: 15 }}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
                    transferEffect.isMyLead 
                      ? "bg-emerald-500/20 text-emerald-400" 
                      : "bg-blue-500/20 text-blue-400"
                  )}
                >
                  <UserCheck className="w-10 h-10" />
                </motion.div>

                {/* Texto */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className={cn(
                    "text-xl font-bold mb-2",
                    transferEffect.isMyLead ? "text-emerald-300" : "text-blue-300"
                  )}>
                    {transferEffect.isMyLead ? '🎯 Lead Recebido!' : '↗️ Lead Transferido'}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {transferEffect.isMyLead 
                      ? 'Este lead foi transferido para você'
                      : `Transferido para ${transferEffect.newOwnerName}`
                    }
                  </p>
                </motion.div>

                {/* Efeito de brilho pulsante */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "absolute inset-0 rounded-2xl opacity-20",
                    transferEffect.isMyLead 
                      ? "bg-gradient-to-r from-emerald-500 to-green-500" 
                      : "bg-gradient-to-r from-blue-500 to-indigo-500"
                  )}
                  style={{ filter: 'blur(20px)', zIndex: -1 }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Panel - Lead Info (Collapsible) */}
        <motion.div
          className={cn(
            "border-r bg-muted/30 flex flex-col relative transition-all duration-300",
            isSidebarCollapsed ? "w-16" : "w-80"
          )}
          animate={{ width: isSidebarCollapsed ? 64 : 320 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* Toggle Button - positioned at top right of sidebar */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "absolute z-10 p-1 rounded-md bg-muted/80 hover:bg-muted transition-colors",
              isSidebarCollapsed ? "top-2 right-2" : "top-3 right-3"
            )}
            title={isSidebarCollapsed ? "Expandir painel" : "Recolher painel"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* Contact Header */}
          <div className={cn(
            "border-b bg-gradient-to-br from-primary/10 to-transparent transition-all",
            isSidebarCollapsed ? "p-3" : "p-6"
          )}>
            <div className={cn(
              "flex items-center",
              isSidebarCollapsed ? "justify-center" : "gap-4"
            )}>
              <Avatar
                src={null}
                fallback={lead.contact?.name || 'Lead'}
                size={isSidebarCollapsed ? "md" : "lg"}
                className={cn(
                  "ring-4 ring-background",
                  isSidebarCollapsed ? "h-10 w-10 text-sm" : "h-16 w-16 text-xl"
                )}
              />
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {lead.contact?.name || 'Sem nome'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      <ChannelIcon className="h-3 w-3 mr-1" />
                      {lead.channel?.name || 'Direto'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info - Hidden when collapsed */}
          {!isSidebarCollapsed ? (
            <div ref={sidebarContentRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Phone */}
              {lead.contact?.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-muted transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="font-medium truncate">{formatPhone(lead.contact.phone)}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

            {/* Email */}
            {lead.contact?.email && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background hover:bg-muted transition-colors cursor-pointer">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{lead.contact.email}</p>
                </div>
              </div>
            )}

            {/* Value */}
            {lead.value && lead.value > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold text-emerald-600">{formatCurrency(lead.value)}</p>
                </div>
              </div>
            )}

            {/* Owner */}
            {lead.owner && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2">
                  <Avatar
                    src={lead.owner.avatar}
                    fallback={lead.owner.name}
                    size="sm"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Responsável</p>
                    <p className="font-medium text-sm">{lead.owner.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stage */}
            {currentStage && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estágio</p>
                  <Badge 
                    variant="secondary"
                    style={{ 
                      backgroundColor: currentStage.color + '20',
                      color: currentStage.color,
                    }}
                  >
                    {currentStage.name}
                  </Badge>
                </div>
              </div>
            )}

            {/* Last Interaction */}
            {lead.last_interaction_at && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                <div className="p-2 rounded-lg bg-gray-500/10 text-gray-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última interação</p>
                  <p className="font-medium text-sm">
                    {new Date(lead.last_interaction_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}

              {/* Notes */}
              {lead.title && (
                <div className="p-3 rounded-lg bg-background">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{lead.title}</p>
                </div>
              )}
            </div>
          ) : (
            /* Collapsed state - show only icons */
            <div className="flex-1 flex flex-col items-center py-4 space-y-3">
              {lead.contact?.phone && (
                <div className="p-2 rounded-lg bg-green-500/10 text-green-600" title={formatPhone(lead.contact.phone)}>
                  <Phone className="h-4 w-4" />
                </div>
              )}
              {lead.contact?.email && (
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600" title={lead.contact.email}>
                  <Mail className="h-4 w-4" />
                </div>
              )}
              {lead.value && lead.value > 0 && (
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600" title={formatCurrency(lead.value)}>
                  <DollarSign className="h-4 w-4" />
                </div>
              )}
              {lead.owner && (
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600" title={lead.owner.name}>
                  <User className="h-4 w-4" />
                </div>
              )}
              {currentStage && (
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: currentStage.color + '20', color: currentStage.color }}
                  title={currentStage.name}
                >
                  <Tag className="h-4 w-4" />
                </div>
              )}
            </div>
          )}

          {/* Quick Actions - Hidden when collapsed */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t space-y-2">
              {/* Move to next stage button */}
              {nextStage ? (
                <Button
                  className="w-full"
                  variant="default"
                  size="sm"
                  onClick={handleMoveToNextStage}
                  disabled={isMovingStage}
                >
                  {isMovingStage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Mover para {nextStage.name}
                </Button>
              ) : (
                <Button className="w-full" variant="default" size="sm" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Estágio final
                </Button>
              )}

              {/* Stage selector dropdown */}
              <div className="relative">
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStageSelector(!showStageSelector)}
                >
                  <Tag className="h-4 w-4 mr-2" />
                  Escolher estágio
                  <ChevronDown className={cn(
                    "h-4 w-4 ml-auto transition-transform",
                    showStageSelector && "rotate-180"
                  )} />
                </Button>

                {/* Dropdown */}
                {showStageSelector && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg overflow-hidden z-50"
                  >
                    {stages.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => handleMoveToStage(stage)}
                        disabled={stage.id === currentStage?.id}
                        className={cn(
                          "w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-muted transition-colors",
                          stage.id === currentStage?.id && "bg-muted opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span>{stage.name}</span>
                        {stage.id === currentStage?.id && (
                          <Check className="h-4 w-4 ml-auto text-green-500" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Edit Lead Button */}
              <Button
                className="w-full"
                variant="outline"
                size="sm"
                onClick={() => setActiveView('edit')}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Lead
              </Button>
            </div>
          )}
        </motion.div>

        {/* Right Panel - Chat / Closing */}
        <div className="flex-1 flex flex-col bg-[#0A0C10]">
          {/* Header - Futuristic Glass */}
          <div className="px-4 py-2 border-b border-[#00D4FF]/10 glass relative overflow-hidden">
            {/* Scan line effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00D4FF]/5 to-transparent opacity-50" />

            {/* Channel Info and Actions */}
            {activeView === 'chat' && (
              <div className="flex items-center justify-end relative z-10">
                {/* Action Buttons */}
                <div className="flex items-center gap-1.5">
                  {ticketStatus === 'open' ? (
                    <>
                      {/* Atividades Button */}
                      <button
                        onClick={() => setActiveView('activities')}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border border-[#00D4FF]/20 hover:border-[#00D4FF]/40 text-[#C0C8D4] hover:bg-[#00D4FF]/10 hover:text-[#00D4FF]"
                      >
                        <ListChecks className="h-3.5 w-3.5" />
                        Atividades
                      </button>
                      {/* Transferir Button */}
                      <button
                        onClick={() => setIsTransferModalOpen(true)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border border-blue-500/20 text-[#C0C8D4] hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/40"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        Transferir
                      </button>
                      {/* Encerrar Button */}
                      <button
                        onClick={() => setIsCloseModalOpen(true)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border border-red-500/20 text-[#C0C8D4] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40"
                      >
                        <MessageSquareOff className="h-3.5 w-3.5" />
                        Encerrar
                      </button>
                      {/* Templates Button - only for WhatsApp */}
                      {lead?.channel?.type?.toLowerCase() === 'whatsapp' && (
                        <button
                          onClick={() => setIsTemplateModalOpen(true)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border border-green-500/20 text-[#C0C8D4] hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/40"
                          title="Enviar Template WhatsApp"
                        >
                          <MessageSquareText className="h-3.5 w-3.5" />
                          Templates
                        </button>
                      )}
                      {/* Catálogos Button */}
                      <button
                        onClick={() => setIsProductSelectorOpen(true)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border border-primary/20 text-[#C0C8D4] hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                        title="Enviar Produto do Catálogo"
                      >
                        <Package className="h-3.5 w-3.5" />
                        Catálogos
                      </button>
                      {/* Separador visual */}
                      <div className="w-px h-5 bg-[#1E2330] mx-1" />
                      {/* Toggle IA Button - só aparece se tenant tem feature de IA */}
                      {hasIaFeature && (
                        <button
                          onClick={handleToggleIa}
                          disabled={isTogglingIa}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border disabled:opacity-50",
                            iaEnabled
                              ? "border-purple-500/20 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/40"
                              : "border-orange-500/20 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/40"
                          )}
                          title={iaEnabled ? "Desativar IA e assumir atendimento" : "Reativar IA"}
                        >
                          {isTogglingIa ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : iaEnabled ? (
                            <Bot className="h-3.5 w-3.5" />
                          ) : (
                            <UserRound className="h-3.5 w-3.5" />
                          )}
                          {iaEnabled ? 'IA' : 'Você'}
                        </button>
                      )}
                      {/* Botão Enviar para Linx - só aparece se tenant tem integração */}
                      {hasLinxIntegration && (
                        <button
                          onClick={handleSendToLinx}
                          disabled={isSendingToLinx}
                          className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border border-orange-500/20 text-[#C0C8D4] hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/40 disabled:opacity-50"
                          title="Enviar lead para o Linx Smart"
                        >
                          {isSendingToLinx ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          Linx
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleReopenTicket}
                      disabled={reopenTicket.isPending}
                      className="px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/10 hover:border-[#10B981]/40 disabled:opacity-50"
                    >
                      {reopenTicket.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ticket Status Badge */}
            {ticketStatus === 'closed' && activeView === 'chat' && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-xs text-amber-400 text-center">
                  Esta conversa foi encerrada. O lead passará pelo menu de filas se enviar nova mensagem.
                </p>
              </div>
            )}

            {/* Activities Header */}
            {activeView === 'activities' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">Atividades da Etapa</h4>
                    <p className="text-xs text-muted-foreground">
                      Complete as atividades para avançar o lead
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView('chat')}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar ao Chat
                </Button>
              </div>
            )}

            {/* Edit Header */}
            {activeView === 'edit' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <Edit className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">Editar Lead</h4>
                    <p className="text-xs text-muted-foreground">
                      Atualize os dados do lead
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView('chat')}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar ao Chat
                </Button>
              </div>
            )}

            {/* Closing Header */}
            {activeView === 'closing' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">Dados para Fechamento</h4>
                    <p className="text-xs text-muted-foreground">
                      Preencha os dados do cliente para finalizar a venda
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView('chat')}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar ao Chat
                </Button>
              </div>
            )}
          </div>

          {/* Content Area */}
          {activeView === 'closing' ? (
            <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
              <CustomerDataForm
                lead={currentLead || lead}
                onSave={() => {
                  setActiveView('chat')
                }}
                isRequired={forceClosingForm}
              />
            </div>
          ) : activeView === 'activities' ? (
            <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
              <div className="max-w-2xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-1">Atividades da Etapa</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete as atividades obrigatórias para avançar o lead no funil.
                    Cada atividade concluída vale pontos!
                  </p>
                </div>
                <StageActivityChecklist
                  leadId={lead.id}
                  onActivityComplete={(activity, points) => {
                    if (points > 0) {
                      notify('success', {
                        title: `+${points} pontos!`,
                        description: `Atividade "${activity.template?.title || 'Atividade'}" concluída`,
                        duration: 3000,
                      })
                    }
                  }}
                  defaultExpanded={true}
                />
              </div>
            </div>
          ) : activeView === 'edit' ? (
            <div className="flex-1 overflow-y-auto bg-muted/20">
              <LeadEditForm 
                lead={currentLead || lead} 
                onSave={(updatedLead) => {
                  setCurrentLead(updatedLead)
                }}
                onCancel={() => setActiveView('chat')}
                onDelete={() => {
                  if (lead?.id && onLeadDeleted) {
                    onLeadDeleted(lead.id)
                  } else {
                    onOpenChange(false)
                  }
                }}
              />
            </div>
          ) : (
            <>
              {/* Messages Area - Futuristic Grid Pattern */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin relative"
                style={{
                  scrollBehavior: 'auto',
                  backgroundColor: '#0A0C10',
                  backgroundImage: `
                    linear-gradient(rgba(0, 212, 255, 0.02) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 212, 255, 0.02) 1px, transparent 1px),
                    radial-gradient(ellipse at 0% 100%, rgba(0, 212, 255, 0.05) 0%, transparent 50%),
                    radial-gradient(ellipse at 100% 0%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)
                  `,
                  backgroundSize: '40px 40px, 40px 40px, 100% 100%, 100% 100%'
                }}
                onScroll={handleScroll}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-sm">Envie a primeira mensagem para iniciar a conversa</p>
                  </div>
                ) : (
                  <>
                    {/* Loading mais mensagens antigas */}
                    {isLoadingMore && (
                      <div className="flex justify-center py-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {/* Indicador de mais mensagens */}
                    {hasMoreMessages && !isLoadingMore && (
                      <div className="flex justify-center py-2">
                        <button 
                          onClick={loadMoreMessages}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          ↑ Carregar mensagens anteriores
                        </button>
                      </div>
                    )}
                    {messages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'flex',
                          msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div className="group flex flex-col gap-1">
                          <div
                            onClick={(e) => {
                              // Só abre menu contextual para mensagens inbound (do contato)
                              if (msg.direction === 'inbound') {
                                const extractedData = extractDataFromText(msg.content)
                                if (extractedData.length > 0) {
                                  // Calcula posição do menu
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
                              'max-w-[75%] rounded-xl px-4 py-2.5 relative',
                              msg.direction === 'outbound'
                                ? 'bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 text-[#E8ECF2] rounded-br-sm border border-[#00D4FF]/30 shadow-lg shadow-[#00D4FF]/10'
                                : 'bg-[#12151C] text-[#C0C8D4] rounded-bl-sm border border-[#1E2330] cursor-pointer hover:border-[#00D4FF]/30 transition-all'
                            )}
                          >
                            {/* Media attachment if present */}
                            {msg.metadata && (msg.metadata.media_url || msg.metadata.image_url || msg.metadata.audio_url || msg.metadata.video_url || msg.metadata.document_url) && (
                              <MessageAttachment 
                                metadata={msg.metadata} 
                                direction={msg.direction}
                                ticketId={ticketId}
                              />
                            )}
                            {/* Only show text content if not just a media placeholder */}
                            {(() => {
                              // Regex para detectar placeholders de mídia (PT e EN)
                              const mediaPlaceholderRegex = /^\[(imagem|vídeo|áudio|image|video|audio|document)(:\s*.+?)?\](\s+(.*))?$/i
                              const match = msg.content.match(mediaPlaceholderRegex)
                              const hasMedia = msg.metadata && (msg.metadata.media_url || msg.metadata.image_url || msg.metadata.audio_url || msg.metadata.video_url || msg.metadata.document_url)
                              
                              // Se tem mídia e o conteúdo é só placeholder, não mostra o texto
                              if (hasMedia && match) {
                                // Se tem caption (texto após o placeholder), mostra só a caption
                                const caption = match[4]?.trim()
                                if (caption) {
                                  return <p className="text-sm whitespace-pre-wrap">{caption}</p>
                                }
                                return null
                              }
                              
                              // Se não tem mídia ou não é placeholder, mostra o conteúdo normal
                              return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            })()}
                            <div
                              className={cn(
                                'flex items-center gap-1 mt-1',
                                msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                              )}
                            >
                              <span className={cn(
                                'text-[10px]',
                                msg.direction === 'outbound' 
                                  ? 'text-primary-foreground/70' 
                                  : 'text-muted-foreground'
                              )}>
                                {formatMessageTime(msg.created_at)}
                              </span>
                              {msg.direction === 'outbound' && (
                                <span className="text-primary-foreground/70">
                                  {msg.status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
                                  {msg.status === 'sent' && <Check className="h-3 w-3" />}
                                  {msg.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                                  {msg.status === 'read' && <CheckCheck className="h-3 w-3 text-blue-400" />}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Feedback buttons for IA messages */}
                          {msg.sender_type === 'ia' && msg.direction === 'outbound' && (
                            <div className="flex justify-end">
                              <MessageFeedback
                                messageId={msg.id}
                                originalMessage={msg.content}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input - Futuristic */}
              <div className="p-3 border-t border-[#00D4FF]/10 bg-[#0D1117] relative">
                <div className="flex items-center gap-2">
                  {/* File upload button */}
                  <FileUploadButton
                    ticketId={ticketId}
                    channelType={lead?.channel?.type}
                    onMediaSent={() => {
                      queryClient.invalidateQueries({ queryKey: ['leads'] })
                    }}
                  />
                  <div className="flex-1 relative">
                    {/* Quick Reply Selector */}
                    <QuickReplySelector
                      inputValue={message}
                      leadId={lead?.id}
                      isVisible={showQuickReplies}
                      onSelect={(content) => {
                        setMessage(content)
                        setShowQuickReplies(false)
                        inputRef.current?.focus()
                      }}
                      onClose={() => setShowQuickReplies(false)}
                    />
                    <Input
                      ref={inputRef}
                      placeholder="Digite sua mensagem... (use / para atalhos)"
                      value={message}
                      onChange={(e) => {
                        const value = e.target.value
                        setMessage(value)
                        // Mostra dropdown de respostas rápidas quando digita "/"
                        if (value.startsWith('/') && value.length >= 1) {
                          setShowQuickReplies(true)
                        } else {
                          setShowQuickReplies(false)
                        }
                      }}
                      onKeyPress={handleKeyPress}
                      onBlur={() => {
                        // Delay para permitir clique no dropdown
                        setTimeout(() => setShowQuickReplies(false), 200)
                      }}
                      className="pr-12"
                      spellCheck={true}
                      lang="pt-BR"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                    >
                      <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                  
                  {/* Audio recorder - only for WhatsApp */}
                  <AudioRecorder
                    ticketId={ticketId}
                    channelType={lead?.channel?.type}
                    onAudioSent={(audioMessage) => {
                      // Adiciona mensagem localmente para exibição em tempo real
                      setMessages((prev) => [...prev, audioMessage as Message])
                      // Scroll para a última mensagem
                      setTimeout(() => {
                        if (messagesContainerRef.current) {
                          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
                        }
                      }, 50)
                      queryClient.invalidateQueries({ queryKey: ['leads'] })
                    }}
                    disabled={isSending}
                  />
                  
                  <Button
                    onClick={handleSend}
                    disabled={!message.trim() || isSending}
                    className="shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Transfer Modal */}
        <TransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          ticketId={ticketId}
          onSuccess={handleTransferSuccess}
        />

        {/* Close Conversation Modal */}
        <CloseConversationModal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          ticketId={ticketId}
          onCloseSuccess={handleCloseSuccess}
        />

        {/* Template Selector Modal - only for WhatsApp */}
        <TemplateSelector
          channelId={lead?.channel?.id}
          ticketId={ticketId}
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onSent={() => {
            // Refresh messages after sending template
            loadMessages(1, false)
            scrollToBottom()
            queryClient.invalidateQueries({ queryKey: ['leads'] })
          }}
        />

        {/* Product Selector Modal */}
        <ProductSelector
          ticketId={ticketId}
          isOpen={isProductSelectorOpen}
          onClose={() => setIsProductSelectorOpen(false)}
          onSent={(data: ProductSentData) => {
            // Adiciona mensagem do produto ao estado local (sem recarregar tudo)
            const productMessage: Message = {
              id: data.message.id,
              content: data.message.content,
              sender_type: 'user',
              direction: 'outbound',
              created_at: data.message.sent_at,
              status: 'delivered',
              metadata: {
                media_type: 'product_catalog',
              },
            }
            setMessages(prev => [...prev, productMessage])

            // Adiciona cada imagem como mensagem separada
            data.images.forEach((img, index) => {
              const imageMessage: Message = {
                id: `${data.message.id}-img-${index}`,
                content: index === 0 ? `📷 ${data.product.name}` : '',
                sender_type: 'user',
                direction: 'outbound',
                created_at: data.message.sent_at,
                status: 'delivered',
                metadata: {
                  media_type: 'image',
                  image_url: img.url,
                  media_url: img.url,
                },
              }
              setMessages(prev => [...prev, imageMessage])
            })

            // Scroll para o final após adicionar mensagens
            setTimeout(() => scrollToBottom(), 100)
            queryClient.invalidateQueries({ queryKey: ['leads'] })
          }}
        />

        {/* Message Context Menu for Data Extraction */}
        {contextMenu?.show && lead && (
          <MessageContextMenu
            messageContent={contextMenu.messageContent}
            leadId={lead.id}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
            onDataAdded={() => {
              // Invalida cache para atualizar dados do lead
              queryClient.invalidateQueries({ queryKey: ['leads'] })
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
