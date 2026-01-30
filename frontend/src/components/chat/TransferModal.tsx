import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  Users,
  ArrowRightLeft,
  User,
  Building,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  useTransferOptions,
  useTransferToUser,
  useTransferToQueue,
} from '@/hooks/useTicketActions'

interface TransferModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string | null
  onSuccess?: () => void
}

type TransferMode = 'user' | 'queue'

export function TransferModal({
  isOpen,
  onClose,
  ticketId,
  onSuccess,
}: TransferModalProps) {
  const [mode, setMode] = useState<TransferMode>('user')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null)

  const { data: options, isLoading } = useTransferOptions(isOpen ? ticketId : null)
  const transferToUser = useTransferToUser()
  const transferToQueue = useTransferToQueue()

  // Reseta seleções quando modal fecha
  const handleClose = () => {
    setMode('user')
    setSelectedUserId(null)
    setSelectedQueueId(null)
    onClose()
  }

  const handleTransfer = async () => {
    if (!ticketId) return

    try {
      if (mode === 'user' && selectedUserId) {
        await transferToUser.mutateAsync({ ticketId, userId: selectedUserId })
      } else if (mode === 'queue' && selectedQueueId) {
        await transferToQueue.mutateAsync({ ticketId, queueId: selectedQueueId })
      }
      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Erro ao transferir:', error)
    }
  }

  const isPending = transferToUser.isPending || transferToQueue.isPending
  const canTransfer =
    (mode === 'user' && selectedUserId) || (mode === 'queue' && selectedQueueId)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md border border-border">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
                    <ArrowRightLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Transferir Conversa</h2>
                    <p className="text-xs text-muted-foreground">
                      Escolha para quem transferir
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Mode Selector */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => {
                          setMode('user')
                          setSelectedQueueId(null) // Limpa seleção de fila ao mudar para usuário
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          mode === 'user'
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span className="font-medium">Usuário</span>
                      </button>
                      <button
                        onClick={() => {
                          setMode('queue')
                          setSelectedUserId(null) // Limpa seleção de usuário ao mudar para fila
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          mode === 'queue'
                            ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <Building className="h-4 w-4" />
                        <span className="font-medium">Outra Fila</span>
                      </button>
                    </div>

                    {/* Current Queue Info */}
                    {options?.current_queue && (
                      <div className="mb-4 p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Fila atual</p>
                        <p className="font-medium">{options.current_queue.name}</p>
                      </div>
                    )}

                    {/* User Selection */}
                    {mode === 'user' && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <p className="text-sm text-muted-foreground mb-2">
                          Transferir para usuário da mesma fila:
                        </p>
                        {options?.same_queue_users && options.same_queue_users.length > 0 ? (
                          options.same_queue_users.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => setSelectedUserId(user.id)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                selectedUserId === user.id
                                  ? 'bg-blue-600/20 border-blue-500'
                                  : 'border-border hover:bg-muted'
                              }`}
                            >
                              <div className="p-2 rounded-full bg-accent">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                              {selectedUserId === user.id && (
                                <CheckCircle className="h-5 w-5 text-blue-400" />
                              )}
                            </button>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            Nenhum outro usuário disponível na fila
                          </p>
                        )}
                      </div>
                    )}

                    {/* Queue Selection */}
                    {mode === 'queue' && (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <p className="text-sm text-muted-foreground mb-2">
                          Transferir para outra fila:
                        </p>
                        {options?.other_queues && options.other_queues.length > 0 ? (
                          options.other_queues.map((queue) => {
                            const hasOwner = options.existing_ownerships?.find(
                              (o) => o.queue_id === queue.id
                            )
                            return (
                              <button
                                key={queue.id}
                                onClick={() => setSelectedQueueId(queue.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                  selectedQueueId === queue.id
                                    ? 'bg-purple-600/20 border-purple-500'
                                    : 'border-border hover:bg-muted'
                                }`}
                              >
                                <div className="p-2 rounded-full bg-accent">
                                  <Building className="h-4 w-4" />
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="font-medium">{queue.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Pipeline: {queue.pipeline}
                                  </p>
                                  <div className="flex gap-2 mt-1 flex-wrap">
                                    <Badge variant="secondary" className="text-xs">
                                      <Users className="h-3 w-3 mr-1" />
                                      {queue.users_count}
                                    </Badge>
                                    {queue.auto_distribute && (
                                      <Badge variant="success" className="text-xs">
                                        Auto
                                      </Badge>
                                    )}
                                    {hasOwner && (
                                      <Badge variant="outline" className="text-xs text-blue-400">
                                        → {hasOwner.user_name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {selectedQueueId === queue.id && (
                                  <CheckCircle className="h-5 w-5 text-purple-400" />
                                )}
                              </button>
                            )
                          })
                        ) : (
                          <p className="text-center text-muted-foreground py-4">
                            Nenhuma outra fila disponível
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-border">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleTransfer}
                  disabled={!canTransfer || isPending}
                  className="flex-1"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                  )}
                  Transferir
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

