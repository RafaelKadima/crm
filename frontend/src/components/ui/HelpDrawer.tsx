import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface HelpSection {
  title: string
  content: string | React.ReactNode
}

export interface HelpContent {
  description?: string
  sections?: HelpSection[]
  externalLink?: { href: string; label: string }
}

interface HelpDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  help: HelpContent
}

/**
 * Drawer right-side com docs contextuais da page atual.
 *
 * Aberto por ícone `?` no header da page (renderizado pelo ConfigPage
 * quando `help` prop está presente). Largura fixa 380px. ESC fecha.
 *
 * Inspirado no PageHelpProps do ZPRO.
 */
export function HelpDrawer({ open, onClose, title, help }: HelpDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-[380px] max-w-[90vw] border-l bg-card shadow-xl flex flex-col"
            role="dialog"
            aria-label={`Ajuda: ${title}`}
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{title}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {help.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {help.description}
                </p>
              )}

              {help.sections?.map((section, i) => (
                <div key={i} className="space-y-2">
                  <h4 className="text-sm font-medium">{section.title}</h4>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {section.content}
                  </div>
                </div>
              ))}

              {help.externalLink && (
                <a
                  href={help.externalLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {help.externalLink.label}
                </a>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
