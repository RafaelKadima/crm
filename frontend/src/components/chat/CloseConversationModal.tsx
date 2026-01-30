import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, CheckCircle, MessageSquareOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useCloseTicket } from '@/hooks/useTicketActions'

interface CloseConversationModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string | null
  onSuccess?: () => void
}

export function CloseConversationModal({
  isOpen,
  onClose,
  ticketId,
  onSuccess,
}: CloseConversationModalProps) {
  const [reason, setReason] = useState('')

  const closeTicket = useCloseTicket()

  const handleClose = async () => {
    if (!ticketId) return

    try {
      await closeTicket.mutateAsync({
        ticketId,
        reason: reason.trim() || undefined,
      })
      onSuccess?.()
      onClose()
      setReason('')
    } catch (error) {
      console.error('Erro ao encerrar conversa:', error)
    }
  }

  const isPending = closeTicket.isPending

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                  <div className="p-2 rounded-lg bg-red-600/20 text-red-400">
                    <MessageSquareOff className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Encerrar Conversa</h2>
                    <p className="text-xs text-muted-foreground">
                      A conversa será finalizada
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400">
                    <strong>O que acontece:</strong> O lead permanece carteirizado com você. 
                    Se ele enviar uma nova mensagem dentro do timeout configurado, 
                    a conversa será reaberta automaticamente.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Motivo do encerramento (opcional)
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Cliente atendido, Venda realizada..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 p-4 border-t border-border">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleClose}
                  disabled={isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Encerrar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}





