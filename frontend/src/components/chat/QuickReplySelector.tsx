import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquareText, Hash, Loader2 } from 'lucide-react'
import { useQuickReplies, useRenderQuickReply } from '@/hooks/useQuickReplies'
import { cn } from '@/lib/utils'
import type { QuickReply } from '@/types'

interface QuickReplySelectorProps {
  inputValue: string
  leadId?: string
  onSelect: (content: string) => void
  onClose: () => void
  isVisible: boolean
  position?: { top: number; left: number }
}

export function QuickReplySelector({
  inputValue,
  leadId,
  onSelect,
  onClose,
  isVisible,
  position,
}: QuickReplySelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const { data: replies, isLoading } = useQuickReplies({ active_only: true })
  const renderMutation = useRenderQuickReply()

  // Filtra respostas baseado no que o usuário digitou após "/"
  const filteredReplies = useMemo(() => {
    if (!replies) return []

    // Remove o "/" inicial para buscar
    const searchTerm = inputValue.startsWith('/')
      ? inputValue.slice(1).toLowerCase()
      : inputValue.toLowerCase()

    if (!searchTerm) return replies.slice(0, 8) // Mostra primeiras 8 se só digitou "/"

    return replies
      .filter(
        (r) =>
          r.shortcut.toLowerCase().includes('/' + searchTerm) ||
          r.title.toLowerCase().includes(searchTerm)
      )
      .slice(0, 8)
  }, [replies, inputValue])

  // Reset index quando filtro muda
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredReplies])

  // Scroll para item selecionado
  useEffect(() => {
    if (listRef.current && filteredReplies.length > 0) {
      const items = listRef.current.querySelectorAll('[data-reply-item]')
      const selectedItem = items[selectedIndex] as HTMLElement
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, filteredReplies])

  // Handler de teclado (chamado pelo pai)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredReplies.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
          e.preventDefault()
          if (filteredReplies[selectedIndex]) {
            handleSelect(filteredReplies[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Tab':
          e.preventDefault()
          if (filteredReplies[selectedIndex]) {
            handleSelect(filteredReplies[selectedIndex])
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, selectedIndex, filteredReplies])

  const handleSelect = async (reply: QuickReply) => {
    try {
      // Renderiza a resposta com variáveis substituídas
      const result = await renderMutation.mutateAsync({
        id: reply.id,
        lead_id: leadId,
      })
      onSelect(result.rendered_content)
    } catch (error) {
      // Se falhar, usa o conteúdo original
      onSelect(reply.content)
    }
    onClose()
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute z-50 bottom-full left-0 mb-2 w-80 bg-popover border rounded-lg shadow-lg overflow-hidden"
        style={position}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageSquareText className="h-4 w-4 text-primary" />
            Respostas Rápidas
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use ↑↓ para navegar, Enter para selecionar
          </p>
        </div>

        {/* List */}
        <div ref={listRef} className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma resposta encontrada
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Crie respostas em Atendimento → Respostas Rápidas
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filteredReplies.map((reply, index) => (
                <button
                  key={reply.id}
                  data-reply-item
                  onClick={() => handleSelect(reply)}
                  className={cn(
                    'w-full px-3 py-2 text-left hover:bg-muted transition-colors',
                    index === selectedIndex && 'bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate flex-1">
                      {reply.title}
                    </span>
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                      {reply.shortcut}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {reply.content}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {filteredReplies.length > 0 && (
          <div className="px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground">
            <kbd className="px-1 bg-muted rounded">Tab</kbd> ou{' '}
            <kbd className="px-1 bg-muted rounded">Enter</kbd> para inserir
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default QuickReplySelector
