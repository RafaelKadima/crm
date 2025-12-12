import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bot,
  Send,
  User,
  Loader2,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertCircle,
  Wrench,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import api from '@/api/axios'

interface ToolStep {
  tool: string
  input: Record<string, any>
  output: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: ToolStep[]
  timestamp: Date
}

const QUICK_COMMANDS = [
  'Listar criativos disponíveis',
  'Listar copies aprovadas',
  'Ver configurações da conta',
  'Criar campanha de conversão',
]

export default function AdsAgentChat() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [showSteps, setShowSteps] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mutation para enviar comando
  const chatMutation = useMutation({
    mutationFn: async (command: string) => {
      // AI Service usa rota /ai/ direta, não /api/
      const response = await api.post('/ai/orchestrator/chat', {
        message: command,
        tenant_id: user?.tenant_id,
        ad_account_id: null, // Pode vir de um selector
      }, { baseURL: '' }) // Remove o prefixo /api para AI Service
      return response.data
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message || data.output,
        steps: data.steps,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])
    },
    onError: (error: any) => {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Erro: ${error.response?.data?.detail || error.message}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    },
  })

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    chatMutation.mutate(input.trim())
    setInput('')
  }

  const handleQuickCommand = (command: string) => {
    setInput(command)
    inputRef.current?.focus()
  }

  const clearChat = async () => {
    try {
      await api.post(`/ai/orchestrator/clear-history?tenant_id=${user?.tenant_id}`, {}, { baseURL: '' })
      setMessages([])
      toast.success('Histórico limpo')
    } catch {
      toast.error('Erro ao limpar histórico')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-purple-500" />
            Agente de Campanhas
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Converse com a IA para criar e gerenciar campanhas
          </p>
        </div>
        
        <Button variant="outline" size="sm" onClick={clearChat}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Limpar Chat
        </Button>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Olá! Sou seu assistente de campanhas.
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                Posso ajudar você a criar campanhas, gerenciar criativos, 
                verificar status e muito mais. O que você precisa?
              </p>
              
              {/* Quick Commands */}
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_COMMANDS.map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => handleQuickCommand(cmd)}
                    className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition text-gray-700 dark:text-gray-300"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-blue-500'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  )}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  {/* Message */}
                  <div className={cn(
                    'flex-1 max-w-[80%]',
                    message.role === 'user' && 'flex flex-col items-end'
                  )}>
                    <div className={cn(
                      'rounded-2xl px-4 py-2',
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    )}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {/* Steps (para mensagens do assistant) */}
                    {message.role === 'assistant' && message.steps && message.steps.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() => setShowSteps(showSteps === message.id ? null : message.id)}
                          className="text-xs text-gray-500 hover:text-purple-500 flex items-center gap-1"
                        >
                          <Wrench className="w-3 h-3" />
                          {message.steps.length} ação(ões) executada(s)
                          <ChevronRight className={cn(
                            'w-3 h-3 transition-transform',
                            showSteps === message.id && 'rotate-90'
                          )} />
                        </button>
                        
                        {showSteps === message.id && (
                          <div className="mt-2 space-y-2">
                            {message.steps.map((step, i) => (
                              <div
                                key={i}
                                className="text-xs bg-gray-50 dark:bg-gray-900 rounded-lg p-2 border border-gray-200 dark:border-gray-700"
                              >
                                <div className="flex items-center gap-1 font-medium text-purple-600">
                                  <CheckCircle className="w-3 h-3" />
                                  {step.tool}
                                </div>
                                <div className="mt-1 text-gray-600 dark:text-gray-400 truncate">
                                  {step.output}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    {message.role === 'assistant' && (
                      <div className="mt-1 flex gap-2">
                        <button
                          onClick={() => copyToClipboard(message.content)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-400 mt-1">
                      {message.timestamp.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {chatMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pensando...
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Quick suggestions */}
        {messages.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {QUICK_COMMANDS.slice(0, 3).map(cmd => (
                <button
                  key={cmd}
                  onClick={() => handleQuickCommand(cmd)}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full whitespace-nowrap hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Input */}
        <CardContent className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite um comando ou pergunta..."
              disabled={chatMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!input.trim() || chatMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

