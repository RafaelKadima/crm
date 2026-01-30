import { useState, useEffect } from 'react'
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { Dialog } from '@/components/ui/Dialog'
import type { 
  WhatsAppTemplateCategory, 
  WhatsAppTemplateButton,
  CreateWhatsAppTemplateData 
} from '@/types'

interface CreateTemplateModalProps {
  channelId: string
  onClose: () => void
  onSuccess: () => void
}

type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE'

export function CreateTemplateModal({ channelId, onClose, onSuccess }: CreateTemplateModalProps) {
  const { createTemplate, checkNameAvailability, previewTemplate, loading, error, clearError } = useWhatsAppTemplates()

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState<WhatsAppTemplateCategory>('UTILITY')
  const [language, setLanguage] = useState('pt_BR')
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT'>('NONE')
  const [headerText, setHeaderText] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [footerText, setFooterText] = useState('')
  const [buttons, setButtons] = useState<WhatsAppTemplateButton[]>([])

  // UI state
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [checkingName, setCheckingName] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState(1) // 1: Info básica, 2: Conteúdo, 3: Botões

  // Verifica disponibilidade do nome quando muda
  useEffect(() => {
    const checkName = async () => {
      if (name.length < 3) {
        setNameAvailable(null)
        return
      }
      setCheckingName(true)
      const available = await checkNameAvailability(name, channelId, language)
      setNameAvailable(available)
      setCheckingName(false)
    }

    const timeoutId = setTimeout(checkName, 500)
    return () => clearTimeout(timeoutId)
  }, [name, channelId, language, checkNameAvailability])

  // Limpa erro quando modal abre
  useEffect(() => {
    clearError()
  }, [clearError])

  const validateStep = (currentStep: number): boolean => {
    const errors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!name || name.length < 3) {
        errors.name = 'Nome deve ter pelo menos 3 caracteres'
      }
      if (!/^[a-zA-Z0-9_\s]+$/.test(name)) {
        errors.name = 'Nome pode conter apenas letras, números, underscores e espaços'
      }
      if (nameAvailable === false) {
        errors.name = 'Este nome já está em uso'
      }
    }

    if (currentStep === 2) {
      if (!bodyText || bodyText.length < 1) {
        errors.bodyText = 'O corpo da mensagem é obrigatório'
      }
      if (bodyText.length > 1024) {
        errors.bodyText = 'O corpo não pode ter mais de 1024 caracteres'
      }
      if (headerType === 'TEXT' && headerText && headerText.length > 60) {
        errors.headerText = 'O cabeçalho não pode ter mais de 60 caracteres'
      }
      if (footerText && footerText.length > 60) {
        errors.footerText = 'O rodapé não pode ter mais de 60 caracteres'
      }
    }

    if (currentStep === 3) {
      buttons.forEach((btn, idx) => {
        if (btn.type !== 'COPY_CODE' && (!btn.text || btn.text.length === 0)) {
          errors[`button_${idx}_text`] = 'Texto do botão é obrigatório'
        }
        if (btn.text && btn.text.length > 25) {
          errors[`button_${idx}_text`] = 'Texto não pode ter mais de 25 caracteres'
        }
        if (btn.type === 'URL' && !btn.url) {
          errors[`button_${idx}_url`] = 'URL é obrigatória'
        }
        if (btn.type === 'PHONE_NUMBER' && !btn.phone_number) {
          errors[`button_${idx}_phone`] = 'Número de telefone é obrigatório'
        }
      })
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleAddButton = () => {
    if (buttons.length >= 3) return
    setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }])
  }

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index))
  }

  const handleButtonChange = (index: number, field: keyof WhatsAppTemplateButton, value: string) => {
    const newButtons = [...buttons]
    newButtons[index] = { ...newButtons[index], [field]: value }
    setButtons(newButtons)
  }

  const handlePreview = async () => {
    if (!validateStep(1) || !validateStep(2)) return

    const data: CreateWhatsAppTemplateData = {
      channel_id: channelId,
      name,
      category,
      language,
      header_type: headerType,
      header_text: headerType === 'TEXT' ? headerText : undefined,
      body_text: bodyText,
      footer_text: footerText || undefined,
      buttons: buttons.length > 0 ? buttons : undefined,
    }

    try {
      const result = await previewTemplate(data)
      setPreview(result)
    } catch (err) {
      console.error('Preview error:', err)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return
    }

    const data: CreateWhatsAppTemplateData = {
      channel_id: channelId,
      name,
      category,
      language,
      header_type: headerType,
      header_text: headerType === 'TEXT' ? headerText : undefined,
      body_text: bodyText,
      footer_text: footerText || undefined,
      buttons: buttons.length > 0 ? buttons : undefined,
    }

    try {
      await createTemplate(data)
      onSuccess()
    } catch (err) {
      // Erro já tratado pelo hook
    }
  }

  // Conta variáveis no body
  const variableCount = (bodyText.match(/\{\{(\d+)\}\}/g) || []).length

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white dark:bg-muted rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-border">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Criar Template do WhatsApp
            </h2>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
              Passo {step} de 3 - {step === 1 ? 'Informações básicas' : step === 2 ? 'Conteúdo' : 'Botões'}
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Step 1: Informações básicas */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <Label htmlFor="name">Nome do Template *</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: confirmacao_pedido"
                      className={validationErrors.name ? 'border-red-500' : ''}
                    />
                    {checkingName && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Spinner size="sm" />
                      </div>
                    )}
                    {!checkingName && nameAvailable !== null && (
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${nameAvailable ? 'text-green-500' : 'text-red-500'}`}>
                        {nameAvailable ? '✓' : '✗'}
                      </div>
                    )}
                  </div>
                  {validationErrors.name && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Use apenas letras, números e underscores. Será convertido para snake_case.
                  </p>
                </div>

                {/* Categoria */}
                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WhatsAppTemplateCategory)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg bg-white dark:bg-muted text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="UTILITY">Utilidade - Atualizações e notificações</option>
                    <option value="MARKETING">Marketing - Promoções e ofertas</option>
                    <option value="AUTHENTICATION">Autenticação - Códigos de verificação</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Templates de Marketing podem ter aprovação mais rigorosa.
                  </p>
                </div>

                {/* Idioma */}
                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg bg-white dark:bg-muted text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="pt_BR">Português (Brasil)</option>
                    <option value="en_US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: Conteúdo */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <Label>Cabeçalho (opcional)</Label>
                  <select
                    value={headerType}
                    onChange={(e) => setHeaderType(e.target.value as 'NONE' | 'TEXT')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg bg-white dark:bg-muted text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent mb-2"
                  >
                    <option value="NONE">Sem cabeçalho</option>
                    <option value="TEXT">Texto</option>
                  </select>
                  {headerType === 'TEXT' && (
                    <>
                      <Input
                        value={headerText}
                        onChange={(e) => setHeaderText(e.target.value)}
                        placeholder="Texto do cabeçalho (máx 60 caracteres)"
                        maxLength={60}
                        className={validationErrors.headerText ? 'border-red-500' : ''}
                      />
                      {validationErrors.headerText && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.headerText}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{headerText.length}/60</p>
                    </>
                  )}
                </div>

                {/* Body */}
                <div>
                  <Label htmlFor="body">Corpo da Mensagem *</Label>
                  <textarea
                    id="body"
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Olá {{1}}! Seu pedido {{2}} está a caminho."
                    rows={5}
                    maxLength={1024}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-muted text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${validationErrors.bodyText ? 'border-red-500' : 'border-gray-300 dark:border-border'}`}
                  />
                  {validationErrors.bodyText && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.bodyText}</p>
                  )}
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Use {'{{1}}'}, {'{{2}}'}, etc para variáveis ({variableCount} encontrada{variableCount !== 1 ? 's' : ''})</span>
                    <span>{bodyText.length}/1024</span>
                  </div>
                </div>

                {/* Footer */}
                <div>
                  <Label htmlFor="footer">Rodapé (opcional)</Label>
                  <Input
                    id="footer"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Ex: Responda SAIR para cancelar"
                    maxLength={60}
                    className={validationErrors.footerText ? 'border-red-500' : ''}
                  />
                  {validationErrors.footerText && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.footerText}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{footerText.length}/60</p>
                </div>

                {/* Preview visual */}
                <div className="mt-6 p-4 bg-gray-100 dark:bg-accent rounded-lg">
                  <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-2">Preview:</p>
                  <div className="bg-white dark:bg-muted rounded-lg p-3 shadow-sm">
                    {headerType === 'TEXT' && headerText && (
                      <p className="font-bold text-gray-900 dark:text-white mb-1">{headerText}</p>
                    )}
                    <p className="text-gray-700 dark:text-muted-foreground whitespace-pre-wrap">{bodyText || 'Digite o corpo da mensagem...'}</p>
                    {footerText && (
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-2 italic">{footerText}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Botões */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Botões (opcional)</h3>
                    <p className="text-sm text-muted-foreground">Adicione até 3 botões ao seu template</p>
                  </div>
                  <Button
                    onClick={handleAddButton}
                    disabled={buttons.length >= 3}
                    variant="outline"
                    size="sm"
                  >
                    + Adicionar Botão
                  </Button>
                </div>

                {buttons.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-muted rounded-lg">
                    <p className="text-muted-foreground">Nenhum botão adicionado</p>
                    <p className="text-sm text-muted-foreground mt-1">Botões são opcionais</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {buttons.map((button, index) => (
                      <div key={index} className="p-4 border border-gray-200 dark:border-border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-gray-700 dark:text-muted-foreground">Botão {index + 1}</span>
                          <button
                            onClick={() => handleRemoveButton(index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remover
                          </button>
                        </div>

                        <div className="space-y-3">
                          {/* Tipo do botão */}
                          <div>
                            <Label>Tipo</Label>
                            <select
                              value={button.type}
                              onChange={(e) => handleButtonChange(index, 'type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg bg-white dark:bg-muted text-gray-900 dark:text-white"
                            >
                              <option value="QUICK_REPLY">Resposta Rápida</option>
                              <option value="URL">Link (URL)</option>
                              <option value="PHONE_NUMBER">Telefone</option>
                              <option value="COPY_CODE">Copiar Código</option>
                            </select>
                          </div>

                          {/* Texto do botão */}
                          {button.type !== 'COPY_CODE' && (
                            <div>
                              <Label>Texto do Botão</Label>
                              <Input
                                value={button.text || ''}
                                onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                                placeholder="Ex: Ver mais"
                                maxLength={25}
                                className={validationErrors[`button_${index}_text`] ? 'border-red-500' : ''}
                              />
                              {validationErrors[`button_${index}_text`] && (
                                <p className="text-sm text-red-500 mt-1">{validationErrors[`button_${index}_text`]}</p>
                              )}
                            </div>
                          )}

                          {/* URL (se tipo URL) */}
                          {button.type === 'URL' && (
                            <div>
                              <Label>URL</Label>
                              <Input
                                value={button.url || ''}
                                onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                                placeholder="https://exemplo.com"
                                className={validationErrors[`button_${index}_url`] ? 'border-red-500' : ''}
                              />
                              {validationErrors[`button_${index}_url`] && (
                                <p className="text-sm text-red-500 mt-1">{validationErrors[`button_${index}_url`]}</p>
                              )}
                            </div>
                          )}

                          {/* Telefone (se tipo PHONE_NUMBER) */}
                          {button.type === 'PHONE_NUMBER' && (
                            <div>
                              <Label>Número de Telefone</Label>
                              <Input
                                value={button.phone_number || ''}
                                onChange={(e) => handleButtonChange(index, 'phone_number', e.target.value)}
                                placeholder="+5511999999999"
                                className={validationErrors[`button_${index}_phone`] ? 'border-red-500' : ''}
                              />
                              {validationErrors[`button_${index}_phone`] && (
                                <p className="text-sm text-red-500 mt-1">{validationErrors[`button_${index}_phone`]}</p>
                              )}
                            </div>
                          )}

                          {/* Código (se tipo COPY_CODE) */}
                          {button.type === 'COPY_CODE' && (
                            <div>
                              <Label>Exemplo de Código</Label>
                              <Input
                                value={button.example || ''}
                                onChange={(e) => handleButtonChange(index, 'example', e.target.value)}
                                placeholder="CODIGO123"
                                maxLength={15}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview JSON */}
                {preview && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-muted-foreground mb-2">
                      Payload que será enviado ao Meta:
                    </h4>
                    <pre className="p-3 bg-background text-green-400 rounded-lg text-xs overflow-auto max-h-48">
                      {JSON.stringify(preview.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-border flex justify-between">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              {step < 3 ? (
                <Button onClick={handleNext} className="bg-green-600 hover:bg-green-700 text-white">
                  Próximo
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handlePreview}>
                    Ver Preview
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {loading ? <Spinner size="sm" /> : 'Criar Template'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

