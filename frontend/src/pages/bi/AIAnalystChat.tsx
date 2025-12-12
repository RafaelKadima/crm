import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Send,
  Sparkles,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCcw,
  Loader2,
  ChevronRight,
  CheckCircle,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { toast } from 'sonner'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  data?: any
  actions?: any[]
  timestamp: Date
}

export function AIAnalystChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Busca perguntas sugeridas
  const { data: suggestions } = useQuery({
    queryKey: ['bi-suggestions'],
    queryFn: async () => {
      const response = await api.get('/bi/analyst/suggestions')
      return response.data
    },
  })

  // Busca insights proativos
  const { data: insights } = useQuery({
    queryKey: ['bi-proactive-insights'],
    queryFn: async () => {
      const response = await api.get('/bi/analyst/insights')
      return response.data
    },
  })

  // Mutation para enviar pergunta
  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await api.post('/bi/analyst/ask', { question })
      return response.data
    },
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.answer,
        data: data.supporting_data,
        actions: data.suggested_actions,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    },
    onError: () => {
      toast.error('Erro ao processar pergunta')
    },
  })

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || askMutation.isPending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    askMutation.mutate(input)
    setInput('')
  }

  const handleSuggestionClick = (question: string) => {
    setInput(question)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-100px)]">
      {/* Sidebar com sugestões */}
      <div className="w-80 border-r p-4 overflow-y-auto">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Perguntas Sugeridas
        </h2>
        
        {suggestions?.questions?.map((category: any, i: number) => (
          <div key={i} className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground uppercase mb-2">
              {category.category === 'sales' && '📈 Vendas'}
              {category.category === 'marketing' && '📢 Marketing'}
              {category.category === 'support' && '💬 Suporte'}
              {category.category === 'predictions' && '🔮 Previsões'}
            </h3>
            <div className="space-y-1">
              {category.questions.map((q: string, j: number) => (
                <button
                  key={j}
                  onClick={() => handleSuggestionClick(q)}
                  className="w-full text-left p-2 text-sm rounded-lg hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Insights Proativos */}
        {insights?.insights?.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Insights Recentes
            </h2>
            <div className="space-y-2">
              {insights.insights.slice(0, 5).map((insight: any) => (
                <div
                  key={insight.id}
                  className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20"
                >
                  <p className="text-xs font-medium text-purple-500">
                    {insight.type === 'insight' && '💡'}
                    {insight.type === 'warning' && '⚠️'}
                    {insight.type === 'anomaly' && '🔴'}
                    {' '}{insight.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {insight.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Área do Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">Analista de BI</h1>
              <p className="text-xs text-muted-foreground">
                Pergunte sobre seus dados e receba insights
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
            Online
          </Badge>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-full bg-purple-500/10 mb-4">
                <Bot className="h-12 w-12 text-purple-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Olá! Sou seu Analista de BI
              </h2>
              <p className="text-muted-foreground max-w-md">
                Faça perguntas sobre seu negócio e eu vou analisar os dados para
                fornecer insights acionáveis. Você pode perguntar sobre vendas,
                marketing, atendimento, ou pedir previsões.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {[
                  'Por que a conversão caiu essa semana?',
                  'Qual campanha tem melhor ROAS?',
                  'Previsão de receita para o próximo mês',
                ].map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' && "flex-row-reverse"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    message.role === 'assistant'
                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                      : "bg-primary"
                  )}>
                    {message.role === 'assistant' ? (
                      <Bot className="h-5 w-5 text-white" />
                    ) : (
                      <User className="h-5 w-5 text-primary-foreground" />
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className={cn(
                    "max-w-[70%] rounded-2xl p-4",
                    message.role === 'assistant'
                      ? "bg-muted"
                      : "bg-primary text-primary-foreground"
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Dados de Suporte */}
                    {message.data && Object.keys(message.data).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          Dados de Suporte
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(message.data).slice(0, 4).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="text-muted-foreground">{key}: </span>
                              <span className="font-medium">
                                {typeof value === 'number' 
                                  ? value.toLocaleString('pt-BR')
                                  : String(value)
                                }
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ações Sugeridas */}
                    {message.actions && message.actions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs font-medium mb-2 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Ações Sugeridas
                        </p>
                        <div className="space-y-1">
                          {message.actions.map((action: any, i: number) => (
                            <Button
                              key={i}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-1"
                            >
                              <ChevronRight className="h-3 w-3 mr-1" />
                              {action.title || action}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      {message.timestamp.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Loading */}
          {askMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="bg-muted rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analisando dados...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Faça uma pergunta sobre seus dados..."
              className="flex-1"
              disabled={askMutation.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || askMutation.isPending}
            >
              {askMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Pressione Enter para enviar • O analista tem acesso a todos os seus dados
          </p>
        </div>
      </div>
    </div>
  )
}

