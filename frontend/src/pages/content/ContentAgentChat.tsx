import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Bot,
  User,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  FileText,
  Users,
  Lightbulb,
  CheckCircle,
  Clock,
  MessageSquare,
  Palette,
  Package,
  ChevronDown,
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover'
import { Label } from '@/components/ui/Label'
import { cn } from '@/lib/utils'
import { contentApi } from '@/api/content'
import { brandLayersApi } from '@/api/brandLayers'
import ReactMarkdown from 'react-markdown'

interface ChatResponse {
  message: string
  session_id: string
  current_step: string
  requires_action: boolean
  action_type?: string
  options?: any[]
  final_content?: string
  metadata?: Record<string, any>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  step?: string
  options?: any[]
  action_type?: string
  final_content?: string
  timestamp: Date
}

const stepLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  idle: { label: 'Aguardando', icon: Clock, color: 'bg-gray-500' },
  research: { label: 'Pesquisa', icon: Lightbulb, color: 'bg-blue-500' },
  select_creator: { label: 'Selecionando Criador', icon: Users, color: 'bg-purple-500' },
  generate_hooks: { label: 'Gerando Hooks', icon: Sparkles, color: 'bg-orange-500' },
  write_reel: { label: 'Escrevendo Roteiro', icon: FileText, color: 'bg-green-500' },
  completed: { label: 'Concluído', icon: CheckCircle, color: 'bg-emerald-500' },
}

export function ContentAgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState('idle')
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Brand layers state
  const [selectedBrandProfile, setSelectedBrandProfile] = useState<string>('')
  const [selectedAudienceProfile, setSelectedAudienceProfile] = useState<string>('')
  const [selectedProductPositioning, setSelectedProductPositioning] = useState<string>('')

  // Fetch available layers
  const { data: layersData } = useQuery({
    queryKey: ['brand-layers-all'],
    queryFn: () => brandLayersApi.getAllLayers(),
  })

  const brandProfiles = layersData?.data?.brand_profiles || []
  const audienceProfiles = layersData?.data?.audience_profiles || []
  const productPositionings = layersData?.data?.product_positionings || []

  const hasLayers = brandProfiles.length > 0 || audienceProfiles.length > 0 || productPositionings.length > 0
  const selectedLayersCount = [selectedBrandProfile, selectedAudienceProfile, selectedProductPositioning].filter(Boolean).length

  // Auto scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mutation para enviar mensagem
  const chatMutation = useMutation({
    mutationFn: (message: string) => contentApi.chat({
      message,
      sessionId: sessionId || undefined,
      brandProfileId: selectedBrandProfile || undefined,
      audienceProfileId: selectedAudienceProfile || undefined,
      productPositioningId: selectedProductPositioning || undefined,
    }),
    onSuccess: (response) => {
      const data = response.data

      // Atualiza session ID
      if (data.session_id) {
        setSessionId(data.session_id)
      }

      // Atualiza step atual
      setCurrentStep(data.current_step)

      // Adiciona resposta do assistente
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        step: data.current_step,
        options: data.options,
        action_type: data.action_type,
        final_content: data.final_content,
        timestamp: new Date()
      }])
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        timestamp: new Date()
      }])
    }
  })

  // Enviar mensagem
  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return

    const userMessage = input.trim()
    setInput('')

    // Adiciona mensagem do usuário
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }])

    // Envia para API
    chatMutation.mutate(userMessage)
  }

  // Atalho Enter para enviar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Copiar conteúdo final
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Nova conversa
  const handleNewChat = () => {
    setMessages([])
    setSessionId(null)
    setCurrentStep('idle')
  }

  // Selecionar opção (hook, criador, etc)
  const handleSelectOption = (option: any) => {
    const text = option.text || option.name || String(option.index + 1)
    setInput(text)
    // Auto-envia
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'user',
        content: text,
        timestamp: new Date()
      }])
      chatMutation.mutate(text)
      setInput('')
    }, 100)
  }

  const stepInfo = stepLabels[currentStep] || stepLabels.idle

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Agente de Conteúdo</h1>
            <p className="text-sm text-muted-foreground">
              Crie roteiros virais com IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Layer Selector */}
          {hasLayers && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Contexto
                  {selectedLayersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {selectedLayersCount}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Camadas de Contexto
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Selecione perfis para gerar conteudo alinhado com sua marca
                    </p>
                  </div>

                  {brandProfiles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Palette className="h-3 w-3" />
                        DNA da Marca
                      </Label>
                      <Select
                        value={selectedBrandProfile}
                        onValueChange={setSelectedBrandProfile}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar perfil..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {brandProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {audienceProfiles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Users className="h-3 w-3" />
                        Publico-Alvo
                      </Label>
                      <Select
                        value={selectedAudienceProfile}
                        onValueChange={setSelectedAudienceProfile}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar perfil..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {audienceProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {productPositionings.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <Package className="h-3 w-3" />
                        Produto
                      </Label>
                      <Select
                        value={selectedProductPositioning}
                        onValueChange={setSelectedProductPositioning}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar posicionamento..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {productPositionings.map((positioning) => (
                            <SelectItem key={positioning.id} value={positioning.id}>
                              {positioning.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedLayersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedBrandProfile('')
                        setSelectedAudienceProfile('')
                        setSelectedProductPositioning('')
                      }}
                    >
                      Limpar selecoes
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Step Indicator */}
          <Badge className={cn("gap-1", stepInfo.color, "text-white")}>
            <stepInfo.icon className="h-3 w-3" />
            {stepInfo.label}
          </Badge>

          <Button variant="outline" size="sm" onClick={handleNewChat}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Nova Conversa
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-purple-500/10 mb-4">
              <Sparkles className="h-12 w-12 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Vamos criar conteúdo viral!</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Me diga sobre o que você quer criar um Reel. Por exemplo:
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {[
                'Crie um Reel sobre produtividade',
                'Quero um roteiro sobre finanças pessoais',
                'Faça um conteúdo viral sobre marketing digital',
              ].map((suggestion, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInput(suggestion)
                    setTimeout(() => {
                      setMessages([{
                        role: 'user',
                        content: suggestion,
                        timestamp: new Date()
                      }])
                      chatMutation.mutate(suggestion)
                      setInput('')
                    }, 100)
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
              )}>
                {message.role === 'user' ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={cn(
                "flex-1 max-w-[80%]",
                message.role === 'user' ? 'text-right' : ''
              )}>
                <Card className={cn(
                  "inline-block",
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-muted'
                )}>
                  <CardContent className="p-3">
                    <div className={cn(
                      "prose prose-sm max-w-none",
                      message.role === 'user' && 'prose-invert'
                    )}>
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>

                    {/* Final Content (Roteiro) */}
                    {message.final_content && (
                      <div className="mt-4 p-4 bg-background rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">Roteiro Final</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopy(message.final_content!)}
                          >
                            {copied ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="text-sm text-foreground whitespace-pre-wrap">
                          {message.final_content}
                        </div>
                      </div>
                    )}

                    {/* Options (Hooks, Criadores) */}
                    {message.options && message.options.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {message.options.map((option, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-left h-auto py-2 px-3"
                            onClick={() => handleSelectOption(option)}
                          >
                            <span className="font-medium mr-2">{i + 1}.</span>
                            <span className="truncate">
                              {option.text || option.name || `Opção ${i + 1}`}
                            </span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground mt-1 px-1">
                  {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading */}
        {chatMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <Card className="bg-muted">
              <CardContent className="p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Pensando...</span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="min-h-[50px] max-h-[150px] resize-none"
            disabled={chatMutation.isPending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  )
}
