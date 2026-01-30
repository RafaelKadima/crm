import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Users,
  Filter,
  ArrowRight,
  User,
  Shuffle,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { useUsers } from '@/hooks/useUsers'
import { useUploadLeadImport, useDownloadLeadTemplate, useLeadImport } from '@/hooks/useLeadImports'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ImportLeadsModalProps {
  isOpen: boolean
  onClose: () => void
}

type ImportStep = 'upload' | 'configure' | 'processing' | 'complete'
type DistributionMode = 'self' | 'specific' | 'round-robin'

export function ImportLeadsModal({ isOpen, onClose }: ImportLeadsModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('self')
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [importId, setImportId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'gestor' || user?.role === 'super_admin'

  const { data: usersData } = useUsers()
  const sellers = (usersData?.data || []).filter((u: any) => 
    u.role === 'seller' || u.role === 'vendedor'
  )

  const uploadMutation = useUploadLeadImport()
  const downloadTemplateMutation = useDownloadLeadTemplate()
  const { data: importData } = useLeadImport(importId || '')

  // Reset state quando modal abre
  useEffect(() => {
    if (isOpen) {
      setStep('upload')
      setSelectedFile(null)
      setDistributionMode(isAdmin ? 'round-robin' : 'self')
      setSelectedOwnerId('')
      setSkipDuplicates(true)
      setImportId(null)
    }
  }, [isOpen, isAdmin])

  const handleFileSelect = useCallback((file: File) => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setSelectedFile(file)
      setStep('configure')
    } else {
      toast.error('Por favor, selecione um arquivo CSV')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplateMutation.mutateAsync()
      toast.success('Template baixado com sucesso!')
    } catch (error) {
      toast.error('Erro ao baixar template')
    }
  }

  const handleStartImport = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo')
      return
    }

    // Se modo específico, precisa selecionar usuário
    if (isAdmin && distributionMode === 'specific' && !selectedOwnerId) {
      toast.error('Selecione um vendedor')
      return
    }

    try {
      setStep('processing')
      
      // Montar payload
      const payload: any = {
        file: selectedFile,
        options: {
          skipDuplicates,
        },
      }

      if (isAdmin) {
        if (distributionMode === 'round-robin') {
          payload.options.distributeLeads = true
        } else if (distributionMode === 'specific') {
          payload.options.ownerId = selectedOwnerId
        }
      }
      // Vendedor não envia nada extra - backend atribui a ele automaticamente

      const result = await uploadMutation.mutateAsync(payload)

      setImportId(result.import.id)
      
      // Se for importação rápida, mostrar como completo
      if (result.import.status === 'completed') {
        setStep('complete')
      }
      
      toast.success('Importação iniciada!')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao iniciar importação')
      setStep('configure')
    }
  }

  const handleClose = () => {
    setStep('upload')
    setSelectedFile(null)
    setImportId(null)
    onClose()
  }

  // Atualizar step quando importação completar
  if (importData?.import?.status === 'completed' && step === 'processing') {
    setStep('complete')
  }

  const importStatus = importData?.import

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border text-foreground overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            Importar Leads
            {!isAdmin && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (para sua carteira)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {['upload', 'configure', 'processing', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step === s
                    ? 'bg-emerald-500 text-white'
                    : ['upload', 'configure', 'processing', 'complete'].indexOf(step) > i
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : 'bg-accent text-muted-foreground'
                )}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Drop Zone */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                  dragOver
                    ? 'border-emerald-400 bg-emerald-400/10'
                    : 'border-border hover:border-muted-foreground/20 hover:bg-muted/50'
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                
                <Upload className={cn(
                  'h-12 w-12 mx-auto mb-4 transition-colors',
                  dragOver ? 'text-emerald-400' : 'text-muted-foreground'
                )} />
                
                <p className="text-lg font-medium mb-2">
                  Arraste seu arquivo CSV aqui
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  ou clique para selecionar
                </p>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownloadTemplate()
                  }}
                  disabled={downloadTemplateMutation.isPending}
                >
                  {downloadTemplateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Baixar modelo de planilha
                </Button>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm text-emerald-400">📋 Instruções:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• O arquivo deve ser em formato <strong className="text-white">CSV</strong> separado por ponto e vírgula (;)</li>
                  <li>• Campos obrigatórios: <strong className="text-white">Nome</strong> e <strong className="text-white">Telefone</strong></li>
                  <li>• Telefone com DDD (ex: 11999998888)</li>
                  <li>• Baixe o modelo para ver o formato correto</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Step 2: Configure */}
          {step === 'configure' && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Selected File */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-emerald-400" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile?.size ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    setStep('upload')
                  }}
                >
                  Trocar
                </Button>
              </div>

              {/* Admin: Distribution Mode */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Distribuição dos leads
                  </label>
                  <div className="space-y-2">
                    <label className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                      distributionMode === 'round-robin' 
                        ? "bg-emerald-500/10 border-emerald-500/50" 
                        : "bg-muted/50 border-border hover:bg-muted"
                    )}>
                      <input
                        type="radio"
                        name="distribution"
                        checked={distributionMode === 'round-robin'}
                        onChange={() => setDistributionMode('round-robin')}
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Shuffle className="h-4 w-4 text-emerald-400" />
                          <span className="font-medium">Distribuir automaticamente (Round-Robin)</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Distribui igualmente entre todos os vendedores ativos
                        </p>
                      </div>
                    </label>

                    <label className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                      distributionMode === 'specific' 
                        ? "bg-emerald-500/10 border-emerald-500/50" 
                        : "bg-muted/50 border-border hover:bg-muted"
                    )}>
                      <input
                        type="radio"
                        name="distribution"
                        checked={distributionMode === 'specific'}
                        onChange={() => setDistributionMode('specific')}
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-400" />
                          <span className="font-medium">Atribuir a um vendedor específico</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Todos os leads vão para o vendedor selecionado
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Seller Selection */}
                  {distributionMode === 'specific' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3"
                    >
                      <select
                        value={selectedOwnerId}
                        onChange={(e) => setSelectedOwnerId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-foreground focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">Selecione um vendedor</option>
                        {sellers.map((seller: any) => (
                          <option key={seller.id} value={seller.id}>
                            {seller.name}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Vendedor: Info box */}
              {!isAdmin && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-blue-400" />
                    <span className="font-medium text-blue-400">Importação para sua carteira</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Os leads importados serão atribuídos automaticamente a você e entrarão como novos leads no seu pipeline.
                  </p>
                </div>
              )}

              {/* Skip Duplicates Option */}
              <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-accent text-emerald-500 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium">Ignorar duplicados</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Pula leads com telefone já cadastrado no sistema
                  </p>
                </div>
              </label>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null)
                    setStep('upload')
                  }}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleStartImport}
                  disabled={uploadMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Iniciar Importação
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-8 text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-4 border-accent rounded-full" />
                <div
                  className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"
                  style={{
                    animationDuration: '1s',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-400">
                    {importStatus?.processed_rows || 0}
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-medium mb-2">Processando importação...</h3>
              <p className="text-muted-foreground">
                {importStatus?.processed_rows || 0} de {importStatus?.total_rows || 0} leads processados
              </p>

              {/* Progress Bar */}
              <div className="mt-6 max-w-xs mx-auto">
                <div className="h-2 bg-accent rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${importData?.progress || 0}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {importData?.progress || 0}% concluído
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && importStatus && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-medium">Importação Concluída!</h3>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{importStatus.total_rows}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{importStatus.success_count}</p>
                  <p className="text-sm text-muted-foreground">Sucesso</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{importStatus.error_count}</p>
                  <p className="text-sm text-muted-foreground">Erros</p>
                </div>
              </div>

              {/* Errors List */}
              {importStatus.errors && importStatus.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="font-medium text-red-400">Erros encontrados:</span>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {importStatus.errors.slice(0, 10).map((error: any, i: number) => (
                      <li key={i}>
                        Linha {error.row}: {error.message}
                      </li>
                    ))}
                    {importStatus.errors.length > 10 && (
                      <li className="text-muted-foreground">
                        ... e mais {importStatus.errors.length - 10} erros
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-center">
                <Button
                  onClick={handleClose}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Concluir
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
