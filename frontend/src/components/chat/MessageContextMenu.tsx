import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy,
  UserPlus,
  Check,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  Calendar,
  X,
  Loader2,
} from 'lucide-react'
import { extractDataFromText, getCleanValue, type ExtractedData } from '@/lib/dataExtractor'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { notify } from '@/components/ui/FuturisticNotification'

interface MessageContextMenuProps {
  messageContent: string
  leadId: string
  position: { x: number; y: number }
  onClose: () => void
  onDataAdded?: () => void
}

// Ícones para cada tipo de dado
const typeIcons: Record<ExtractedData['type'], typeof Mail> = {
  email: Mail,
  phone: Phone,
  cpf: CreditCard,
  cep: MapPin,
  birth_date: Calendar,
}

// Cores para cada tipo
const typeColors: Record<ExtractedData['type'], string> = {
  email: 'text-blue-400 bg-blue-400/10',
  phone: 'text-green-400 bg-green-400/10',
  cpf: 'text-purple-400 bg-purple-400/10',
  cep: 'text-orange-400 bg-orange-400/10',
  birth_date: 'text-pink-400 bg-pink-400/10',
}

export function MessageContextMenu({
  messageContent,
  leadId,
  position,
  onClose,
  onDataAdded,
}: MessageContextMenuProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [savingItem, setSavingItem] = useState<string | null>(null)

  // Extrai dados da mensagem
  const extractedData = extractDataFromText(messageContent)

  // Handler para copiar para clipboard
  const handleCopy = async (data: ExtractedData) => {
    try {
      await navigator.clipboard.writeText(data.formatted)
      setCopiedItem(data.value)
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Handler para adicionar ao lead
  const handleAddToLead = async (data: ExtractedData) => {
    setSavingItem(data.value)

    try {
      const cleanValue = getCleanValue(data.type, data.value)

      // Determina se é campo do contato ou do lead
      const isContactField = ['email', 'phone', 'cpf'].includes(data.type)

      if (isContactField) {
        // Atualiza contato do lead
        await api.put(`/leads/${leadId}/contact`, {
          [data.fieldName]: cleanValue,
        })
      } else {
        // Atualiza customer_data do lead
        await api.put(`/leads/${leadId}`, {
          customer_data: {
            [data.fieldName]: cleanValue,
          },
        })
      }

      notify('success', {
        title: 'Dado adicionado!',
        description: `${data.label}: ${data.formatted}`,
        duration: 3000,
      })

      onDataAdded?.()
      onClose()
    } catch (err: any) {
      console.error('Failed to save:', err)
      notify('error', {
        title: 'Erro ao salvar',
        description: err?.response?.data?.message || 'Tente novamente',
        duration: 3000,
      })
    } finally {
      setSavingItem(null)
    }
  }

  // Se não encontrou dados, não mostra o menu
  if (extractedData.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[100] min-w-[280px] max-w-[350px] rounded-xl border bg-background shadow-xl overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <span className="text-sm font-medium">Dados Detectados</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lista de dados extraídos */}
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {extractedData.map((data, index) => {
            const Icon = typeIcons[data.type]
            const colorClass = typeColors[data.type]
            const isCopied = copiedItem === data.value
            const isSaving = savingItem === data.value

            return (
              <div
                key={`${data.type}-${index}`}
                className="p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Ícone do tipo */}
                  <div className={cn('p-2 rounded-lg', colorClass)}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Valor */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{data.label}</p>
                    <p className="font-medium truncate">{data.formatted}</p>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAddToLead(data)}
                    disabled={isSaving}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      isSaving && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Adicionar ao Lead
                  </button>

                  <button
                    onClick={() => handleCopy(data)}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      "bg-muted hover:bg-muted/80",
                      isCopied && "bg-green-500/20 text-green-400"
                    )}
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
