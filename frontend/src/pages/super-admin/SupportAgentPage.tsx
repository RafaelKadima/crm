import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Shield,
  Crown,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  FileCode,
  GitBranch,
  Server,
  AlertTriangle,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import {
  useSupportSessions,
  useSupportSession,
  useCreateSession,
  useSendMessage,
  useApproveAction,
  useRejectAction,
} from '@/hooks/useSupportAgent'
import { SupportMessage, SupportAction, ToolCall } from '@/api/supportAgent'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function SupportAgentPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [inputMessage, setInputMessage] = useState('')
  const [pendingApprovals, setPendingApprovals] = useState<SupportAction[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: sessionsData, isLoading: loadingSessions } = useSupportSessions()
  const { data: currentSession, isLoading: loadingSession } = useSupportSession(selectedSessionId)
  const createSession = useCreateSession()
  const sendMessage = useSendMessage()
  const approveAction = useApproveAction()
  const rejectAction = useRejectAction()

  const sessions = sessionsData?.data || []

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentSession?.messages])

  const handleCreateSession = async () => {
    const session = await createSession.mutateAsync('Nova sessao de suporte')
    setSelectedSessionId(session.id)
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedSessionId) return

    const message = inputMessage
    setInputMessage('')

    const response = await sendMessage.mutateAsync({
      sessionId: selectedSessionId,
      message,
    })

    if (response.pending_approvals?.length > 0) {
      setPendingApprovals(response.pending_approvals)
    }
  }

  const handleApprove = async (actionId: string) => {
    await approveAction.mutateAsync(actionId)
    setPendingApprovals(prev => prev.filter(a => a.id !== actionId))
  }

  const handleReject = async (actionId: string) => {
    await rejectAction.mutateAsync(actionId)
    setPendingApprovals(prev => prev.filter(a => a.id !== actionId))
  }

  const getToolIcon = (toolName: string) => {
    if (toolName.includes('ssh') || toolName.includes('deploy')) return Server
    if (toolName.includes('git')) return GitBranch
    if (toolName.includes('file') || toolName.includes('code')) return FileCode
    return Terminal
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex">
      {/* Sidebar - Sessions */}
      <div className="w-80 border-r border-gray-700/50 bg-gray-900/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Agente de Suporte</h1>
              <p className="text-xs text-gray-400">IA para resolver problemas</p>
            </div>
          </div>

          <Button
            onClick={handleCreateSession}
            disabled={createSession.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {createSession.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Nova Sessao
          </Button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loadingSessions ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma sessao ainda</p>
              <p className="text-xs">Clique em "Nova Sessao" para comecar</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={cn(
                    'w-full p-3 rounded-lg text-left transition-all',
                    selectedSessionId === session.id
                      ? 'bg-purple-600/20 border border-purple-500/50'
                      : 'hover:bg-gray-700/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">
                      {session.title || 'Sessao de suporte'}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        session.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      )}
                    >
                      {session.status === 'active' ? 'Ativa' : 'Concluida'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <MessageSquare className="w-3 h-3" />
                    <span>{session.messages_count || 0} msgs</span>
                    {session.last_message_at && (
                      <>
                        <span>·</span>
                        <span>
                          {formatDistanceToNow(new Date(session.last_message_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700/50">
          <Link
            to="/super-admin"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Crown className="w-4 h-4" />
            Voltar ao Super Admin
          </Link>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {!selectedSessionId ? (
          // Empty State
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Agente de Suporte IA</h2>
              <p className="text-gray-400 mb-6">
                Eu posso ajudar com suporte sobre funcionalidades, identificar e corrigir bugs,
                executar comandos na VPS, fazer commits e deploy.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-800/50 rounded-lg text-left">
                  <FileCode className="w-5 h-5 text-purple-400 mb-2" />
                  <p className="font-medium">Corrigir Bugs</p>
                  <p className="text-xs text-gray-400">Analiso codigo e aplico correcoes</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg text-left">
                  <Server className="w-5 h-5 text-green-400 mb-2" />
                  <p className="font-medium">Deploy</p>
                  <p className="text-xs text-gray-400">Executo deploy na VPS</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg text-left">
                  <GitBranch className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="font-medium">Git</p>
                  <p className="text-xs text-gray-400">Commits e push automaticos</p>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg text-left">
                  <MessageSquare className="w-5 h-5 text-amber-400 mb-2" />
                  <p className="font-medium">Suporte</p>
                  <p className="text-xs text-gray-400">Respondo duvidas do sistema</p>
                </div>
              </div>
              <Button
                onClick={handleCreateSession}
                disabled={createSession.isPending}
                className="mt-6 bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Iniciar Sessao
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingSession ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {currentSession?.messages?.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}

                  {sendMessage.isPending && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Processando...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Pending Approvals */}
            <AnimatePresence>
              {pendingApprovals.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="border-t border-gray-700/50 bg-amber-900/20 p-4"
                >
                  <div className="flex items-center gap-2 text-amber-400 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Aprovacao Necessaria</span>
                  </div>
                  <div className="space-y-2">
                    {pendingApprovals.map((action) => (
                      <ApprovalCard
                        key={action.id}
                        action={action}
                        onApprove={() => handleApprove(action.id)}
                        onReject={() => handleReject(action.id)}
                        isApproving={approveAction.isPending}
                        isRejecting={rejectAction.isPending}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="border-t border-gray-700/50 p-4 bg-gray-900/50">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Descreva o problema ou faca uma pergunta..."
                  className="flex-1 bg-gray-800 border-gray-700"
                  disabled={sendMessage.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || sendMessage.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Message Bubble Component
function MessageBubble({ message }: { message: SupportMessage }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl p-4',
          isUser
            ? 'bg-purple-600 text-white'
            : 'bg-gray-800 text-gray-100'
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 text-purple-400">
            <Bot className="w-4 h-4" />
            <span className="text-xs font-medium">Agente de Suporte</span>
          </div>
        )}

        <div className="whitespace-pre-wrap text-sm">{message.content}</div>

        {/* Tool Calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.tool_calls.map((tool, index) => (
              <ToolCallCard key={index} tool={tool} />
            ))}
          </div>
        )}

        {/* Tokens */}
        {message.input_tokens && (
          <div className="mt-2 text-xs text-gray-400">
            Tokens: {message.input_tokens} in / {message.output_tokens} out
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Tool Call Card
function ToolCallCard({ tool }: { tool: ToolCall }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = tool.tool.includes('ssh') || tool.tool.includes('deploy')
    ? Server
    : tool.tool.includes('git')
    ? GitBranch
    : tool.tool.includes('file')
    ? FileCode
    : Terminal

  return (
    <div className="bg-gray-900/50 rounded-lg p-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Icon className="w-3 h-3 text-purple-400" />
        <span className="font-mono flex-1">{tool.tool}</span>
        {tool.success ? (
          <CheckCircle2 className="w-3 h-3 text-green-400" />
        ) : (
          <XCircle className="w-3 h-3 text-red-400" />
        )}
        <ChevronRight
          className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 overflow-hidden"
          >
            <pre className="text-[10px] bg-black/30 p-2 rounded overflow-x-auto">
              {JSON.stringify(tool.result || tool.arguments, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Approval Card
function ApprovalCard({
  action,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  action: SupportAction
  onApprove: () => void
  onReject: () => void
  isApproving: boolean
  isRejecting: boolean
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-amber-500/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-sm">{action.tool_name}</span>
          {action.dangerous && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
              PERIGOSO
            </span>
          )}
        </div>
      </div>

      {action.arguments && (
        <pre className="text-xs bg-black/30 p-2 rounded mb-2 overflow-x-auto">
          {JSON.stringify(action.arguments, null, 2)}
        </pre>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isApproving || isRejecting}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isApproving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Aprovar
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={isApproving || isRejecting}
          className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          {isRejecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <XCircle className="w-3 h-3 mr-1" />
              Rejeitar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default SupportAgentPage
