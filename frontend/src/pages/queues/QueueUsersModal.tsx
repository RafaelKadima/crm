import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, UserPlus, UserMinus, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSyncQueueUsers, type Queue } from '@/hooks/useQueues'
import { useUsers } from '@/hooks/useUsers'

interface QueueUsersModalProps {
  isOpen: boolean
  onClose: () => void
  queue: Queue | null
}

export function QueueUsersModal({ isOpen, onClose, queue }: QueueUsersModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const { data: usersData } = useUsers()
  const syncUsers = useSyncQueueUsers()

  const users = usersData?.data || []

  useEffect(() => {
    if (queue?.users) {
      setSelectedUserIds(queue.users.map((u) => u.id))
    } else {
      setSelectedUserIds([])
    }
    setSearchQuery('')
  }, [queue, isOpen])

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const query = searchQuery.toLowerCase()
    return users.filter(
      (user: any) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSave = async () => {
    if (!queue) return

    try {
      await syncUsers.mutateAsync({
        queueId: queue.id,
        userIds: selectedUserIds,
      })
      onClose()
    } catch (error) {
      console.error('Error syncing users:', error)
    }
  }

  const selectedCount = selectedUserIds.length

  return (
    <AnimatePresence>
      {isOpen && queue && (
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
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-800">
                <div>
                  <h2 className="text-xl font-semibold">Usuários da Fila</h2>
                  <p className="text-sm text-gray-400 mt-1">{queue.name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuários..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Selected count */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {selectedCount} usuário(s) selecionado(s)
                  </span>
                  {selectedCount > 0 && (
                    <button
                      onClick={() => setSelectedUserIds([])}
                      className="text-red-400 hover:text-red-300"
                    >
                      Limpar seleção
                    </button>
                  )}
                </div>

                {/* Users list */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredUsers.map((user: any) => {
                    const isSelected = selectedUserIds.includes(user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleUser(user.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 border border-blue-500/50'
                            : 'bg-gray-800 border border-transparent hover:border-gray-700'
                        }`}
                      >
                        <div className="text-left">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                        {isSelected ? (
                          <UserMinus className="w-5 h-5 text-red-400" />
                        ) : (
                          <UserPlus className="w-5 h-5 text-green-400" />
                        )}
                      </button>
                    )
                  })}

                  {filteredUsers.length === 0 && (
                    <p className="text-center text-gray-400 py-4">
                      Nenhum usuário encontrado
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={syncUsers.isPending}
                    className="flex-1"
                  >
                    {syncUsers.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

