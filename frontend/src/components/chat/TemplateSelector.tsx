import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Search,
  X,
  Send,
  Loader2,
  ChevronRight,
  ArrowLeft,
  MessageSquareText,
  Sparkles,
  Tag,
  Clock,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { whatsAppTemplatesApi } from '@/api/endpoints'
import type { WhatsAppTemplate } from '@/types'
import { toast } from 'sonner'
import api from '@/api/axios'

interface TemplateSelectorProps {
  channelId: string | undefined
  ticketId: string | null
  isOpen: boolean
  onClose: () => void
  onSent: () => void
}

interface TemplateVariable {
  index: number
  value: string
  example?: string
}

const categoryColors: Record<string, string> = {
  MARKETING: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  UTILITY: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  AUTHENTICATION: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
}

const categoryIcons: Record<string, string> = {
  MARKETING: '📢',
  UTILITY: '🔧',
  AUTHENTICATION: '🔐',
}

export function TemplateSelector({ channelId, ticketId, isOpen, onClose, onSent }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [variables, setVariables] = useState<TemplateVariable[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Carrega templates aprovados quando abre o modal
  useEffect(() => {
    if (isOpen && channelId) {
      loadTemplates()
    }
  }, [isOpen, channelId])

  // Extrai variáveis quando seleciona um template
  useEffect(() => {
    if (selectedTemplate) {
      const bodyText = selectedTemplate.body_text || ''
      const matches = bodyText.match(/\{\{(\d+)\}\}/g) || []
      const uniqueIndices = [...new Set(matches.map(m => parseInt(m.replace(/\D/g, ''))))]
      
      setVariables(
        uniqueIndices.sort((a, b) => a - b).map(index => ({
          index,
          value: '',
          example: getExampleForVariable(index, selectedTemplate),
        }))
      )
    } else {
      setVariables([])
    }
  }, [selectedTemplate])

  const loadTemplates = async () => {
    if (!channelId) return
    
    setIsLoading(true)
    try {
      const response = await whatsAppTemplatesApi.getApproved(channelId)
      setTemplates(response.data.data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Erro ao carregar templates')
    } finally {
      setIsLoading(false)
    }
  }

  const getExampleForVariable = (index: number, template: WhatsAppTemplate): string => {
    // Tenta extrair exemplo do payload de requisição se disponível
    const payload = template.request_payload as any
    if (payload?.components) {
      for (const comp of payload.components) {
        if (comp.type === 'BODY' && comp.example?.body_text) {
          return comp.example.body_text[index - 1] || ''
        }
      }
    }
    return ''
  }

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = !search || 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.body_text.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !selectedCategory || t.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, search, selectedCategory])

  const previewText = useMemo(() => {
    if (!selectedTemplate) return ''
    
    let text = selectedTemplate.body_text
    variables.forEach(v => {
      text = text.replace(new RegExp(`\\{\\{${v.index}\\}\\}`, 'g'), v.value || `[Variável ${v.index}]`)
    })
    return text
  }, [selectedTemplate, variables])

  const canSend = useMemo(() => {
    return selectedTemplate && variables.every(v => v.value.trim() !== '')
  }, [selectedTemplate, variables])

  const handleSend = async () => {
    if (!ticketId || !selectedTemplate || !canSend) return

    setIsSending(true)
    try {
      // Monta os componentes com as variáveis
      const components: any[] = []
      
      if (variables.length > 0) {
        components.push({
          type: 'body',
          parameters: variables.map(v => ({
            type: 'text',
            text: v.value,
          })),
        })
      }

      // Monta o objeto de variáveis indexado
      const variablesObj: Record<number, string> = {}
      variables.forEach(v => {
        variablesObj[v.index] = v.value
      })

      await api.post(`/tickets/${ticketId}/template`, {
        template_id: selectedTemplate.id,
        variables: variablesObj,
      })

      toast.success('Template enviado com sucesso!')
      onSent()
      handleClose()
    } catch (error: any) {
      console.error('Error sending template:', error)
      toast.error(error.response?.data?.error || 'Erro ao enviar template')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setSelectedTemplate(null)
    setVariables([])
    setSearch('')
    setSelectedCategory(null)
    onClose()
  }

  const handleBack = () => {
    setSelectedTemplate(null)
    setVariables([])
  }

  const categories = useMemo(() => {
    const cats = new Set(templates.map(t => t.category))
    return Array.from(cats)
  }, [templates])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent size="lg" className="max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-green-500" />
            Templates WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envie mensagens pré-aprovadas pelo Meta para iniciar conversas
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!selectedTemplate ? (
            // Lista de templates
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Busca e Filtros */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {categories.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={selectedCategory === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="text-xs"
                    >
                      Todos
                    </Button>
                    {categories.map(cat => (
                      <Button
                        key={cat}
                        variant={selectedCategory === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className="text-xs"
                      >
                        {categoryIcons[cat]} {cat}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {templates.length === 0 
                        ? 'Nenhum template aprovado encontrado'
                        : 'Nenhum template corresponde à busca'
                      }
                    </p>
                    {templates.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Crie templates na página de Templates WhatsApp
                      </p>
                    )}
                  </div>
                ) : (
                  filteredTemplates.map(template => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all",
                        "hover:border-primary/50 hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{template.name}</span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs shrink-0", categoryColors[template.category])}
                            >
                              {categoryIcons[template.category]} {template.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.body_text}
                          </p>
                          {template.footer_text && (
                            <p className="text-xs text-muted-foreground/70 mt-1 italic">
                              {template.footer_text}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          ) : (
            // Detalhes e preenchimento de variáveis
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Header com botão voltar */}
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                  <h3 className="font-medium">{selectedTemplate.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", categoryColors[selectedTemplate.category])}
                    >
                      {categoryIcons[selectedTemplate.category]} {selectedTemplate.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {selectedTemplate.language}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {/* Preview da mensagem */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    Preview da mensagem
                  </label>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                    {selectedTemplate.header_text && (
                      <p className="font-semibold mb-2">{selectedTemplate.header_text}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{previewText}</p>
                    {selectedTemplate.footer_text && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {selectedTemplate.footer_text}
                      </p>
                    )}
                    {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-green-500/20 space-y-2">
                        {selectedTemplate.buttons.map((btn, idx) => (
                          <div 
                            key={idx}
                            className="text-center py-2 px-4 bg-background/50 rounded text-sm font-medium"
                          >
                            {btn.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Variáveis para preencher */}
                {variables.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-blue-500" />
                      Preencha as variáveis
                    </label>
                    {variables.map((variable, idx) => (
                      <div key={variable.index} className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Variável {variable.index}
                          {variable.example && (
                            <span className="ml-2 text-muted-foreground/70">
                              (ex: {variable.example})
                            </span>
                          )}
                        </label>
                        <Input
                          value={variable.value}
                          onChange={(e) => {
                            const newVars = [...variables]
                            newVars[idx].value = e.target.value
                            setVariables(newVars)
                          }}
                          placeholder={variable.example || `Digite o valor para {{${variable.index}}}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Info sobre janela de 24h */}
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-200">
                    Templates podem ser enviados para iniciar conversas ou após a janela de 24h do WhatsApp.
                    Após o envio, você poderá continuar a conversa normalmente.
                  </p>
                </div>
              </div>

              {/* Botão enviar */}
              <div className="pt-4 border-t mt-4">
                <Button
                  onClick={handleSend}
                  disabled={!canSend || isSending}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Template
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

