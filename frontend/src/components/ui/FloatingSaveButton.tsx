import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, Loader2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface FloatingSaveButtonProps {
  isDirty: boolean
  isSaving: boolean
  onSave: () => void | Promise<void>
  onReset?: () => void
  changesCount?: number
  /** Distância de scroll (em px) antes de aparecer fixo no bottom */
  threshold?: number
}

/**
 * Aparece fixo no bottom-right quando há mudanças não salvas E
 * o user já scrollou além do threshold. Antes disso, fica embedded
 * no fluxo da page (renderiza inline).
 *
 * Padrão inspirado no ZPRO floating-save-button.
 */
export function FloatingSaveButton({
  isDirty,
  isSaving,
  onSave,
  onReset,
  changesCount,
  threshold = 200,
}: FloatingSaveButtonProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  if (!isDirty) return null

  const label = isSaving
    ? 'Salvando...'
    : changesCount && changesCount > 0
      ? `Salvar (${changesCount})`
      : 'Salvar'

  const button = (
    <div className="flex items-center gap-2">
      {onReset && !isSaving && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <Undo2 className="h-4 w-4 mr-1" />
          Descartar
        </Button>
      )}
      <Button onClick={onSave} disabled={isSaving} size="sm">
        {isSaving ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Save className="h-4 w-4 mr-1" />
        )}
        {label}
      </Button>
    </div>
  )

  return (
    <AnimatePresence>
      {scrolled ? (
        <motion.div
          key="floating"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg"
        >
          <span className="text-sm text-muted-foreground">
            {changesCount && changesCount > 0
              ? `${changesCount} mudança${changesCount > 1 ? 's' : ''} pendente${changesCount > 1 ? 's' : ''}`
              : 'Mudanças não salvas'}
          </span>
          {button}
        </motion.div>
      ) : (
        <motion.div
          key="inline"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex justify-end pt-4 border-t"
        >
          {button}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
