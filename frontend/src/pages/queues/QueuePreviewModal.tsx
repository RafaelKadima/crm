import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, Users, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Queue } from '@/hooks/useQueues'

interface QueuePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  queue: Queue | null
}

export function QueuePreviewModal({ isOpen, onClose, queue }: QueuePreviewModalProps) {
  if (!queue) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-md border border-border overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="text-xl font-semibold">Preview da Fila</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                {/* Queue Info */}
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl font-bold">
                    {queue.menu_option}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{queue.name}</h3>
                    <p className="text-sm text-muted-foreground">{queue.menu_label}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <MessageSquare className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                    <p className="text-xl font-bold">{queue.leads_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Users className="w-5 h-5 mx-auto mb-1 text-green-400" />
                    <p className="text-xl font-bold">{queue.users_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Usuários</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <LayoutGrid className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                    <p className="text-xl font-bold">{queue.leads_waiting || 0}</p>
                    <p className="text-xs text-muted-foreground">Aguardando</p>
                  </div>
                </div>

                {/* Menu Preview (simulated WhatsApp) */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Preview do Menu (como aparece no WhatsApp)
                  </p>
                  <div className="bg-[#075E54] rounded-lg p-4">
                    <div className="bg-[#DCF8C6] text-black p-3 rounded-lg max-w-[80%] ml-auto mb-2">
                      <p className="text-sm">Olá!</p>
                    </div>
                    <div className="bg-white text-black p-3 rounded-lg max-w-[80%]">
                      <p className="text-sm whitespace-pre-line">
                        Olá! Para melhor atendê-lo, por favor escolha uma das opções
                        abaixo:
                        {'\n\n'}
                        {queue.menu_option} - {queue.menu_label}
                        {'\n\n'}
                        Digite o número da opção desejada.
                      </p>
                    </div>
                    <div className="bg-[#DCF8C6] text-black p-3 rounded-lg max-w-[80%] ml-auto mt-2">
                      <p className="text-sm">{queue.menu_option}</p>
                    </div>
                    {queue.welcome_message && (
                      <div className="bg-white text-black p-3 rounded-lg max-w-[80%] mt-2">
                        <p className="text-sm">{queue.welcome_message}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Users */}
                {queue.users && queue.users.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Usuários atribuídos ({queue.users.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {queue.users.map((user) => (
                        <span
                          key={user.id}
                          className="px-3 py-1 bg-muted rounded-full text-sm"
                        >
                          {user.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Autodistribuição</span>
                  <span
                    className={`text-sm font-medium ${
                      queue.auto_distribute ? 'text-green-400' : 'text-muted-foreground'
                    }`}
                  >
                    {queue.auto_distribute ? 'Ativada' : 'Desativada'}
                  </span>
                </div>

                {/* Close */}
                <Button onClick={onClose} className="w-full">
                  Fechar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

