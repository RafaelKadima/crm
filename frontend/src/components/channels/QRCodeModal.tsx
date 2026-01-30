import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, CheckCircle, RefreshCw, Loader2, XCircle, Phone, Wifi, WifiOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import {
  useConnectInternalSession,
  useInternalStatus,
  useDisconnectInternalSession,
  type Channel,
} from '@/hooks/useChannels'

interface QRCodeModalProps {
  channel: Channel
  isOpen: boolean
  onClose: () => void
}

type ConnectionStep = 'idle' | 'connecting' | 'qr_ready' | 'connected' | 'error'

export function QRCodeModal({ channel, isOpen, onClose }: QRCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [step, setStep] = useState<ConnectionStep>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const connectSession = useConnectInternalSession()
  const disconnectSession = useDisconnectInternalSession()
  const { data: status, refetch: refetchStatus } = useInternalStatus(
    channel.id,
    isOpen && step !== 'connected'
  )

  // Check status on mount and when polling
  useEffect(() => {
    if (status) {
      if (status.connected) {
        setStep('connected')
        setQrCode(null)
      } else if (step === 'qr_ready' && !qrCode) {
        // QR expired, need to reconnect
        setStep('idle')
      }
    }
  }, [status, step, qrCode])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null)
      if (status?.connected) {
        setStep('connected')
      } else {
        setStep('idle')
        setQrCode(null)
      }
    }
  }, [isOpen, status?.connected])

  const handleConnect = useCallback(async () => {
    setStep('connecting')
    setErrorMessage(null)

    try {
      const result = await connectSession.mutateAsync(channel.id)

      if (result.status === 'qr_ready' && result.qr_code) {
        setQrCode(result.qr_code)
        setStep('qr_ready')
      } else if (result.status === 'already_connected') {
        setStep('connected')
        setQrCode(null)
        refetchStatus()
      } else if (result.error) {
        setErrorMessage(result.error)
        setStep('error')
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || error.message || 'Erro ao conectar')
      setStep('error')
    }
  }, [channel.id, connectSession, refetchStatus])

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectSession.mutateAsync(channel.id)
      setStep('idle')
      setQrCode(null)
      refetchStatus()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || error.message || 'Erro ao desconectar')
    }
  }, [channel.id, disconnectSession, refetchStatus])

  const handleRefreshQR = useCallback(async () => {
    setQrCode(null)
    await handleConnect()
  }, [handleConnect])

  // Auto-start connection when modal opens and not connected
  useEffect(() => {
    if (isOpen && step === 'idle' && !status?.connected) {
      handleConnect()
    }
  }, [isOpen, step, status?.connected, handleConnect])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            {channel.name} - WhatsApp Interno
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col items-center py-8">
          <AnimatePresence mode="wait">
            {/* Connected State */}
            {step === 'connected' && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-4"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Wifi className="h-3 w-3 text-white" />
                  </motion.div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg text-green-600">Conectado!</h3>
                  {status?.channel_config?.internal_phone_number && (
                    <p className="text-muted-foreground flex items-center justify-center gap-2 mt-1">
                      <Phone className="h-4 w-4" />
                      {status.channel_config.internal_phone_number}
                    </p>
                  )}
                  {status?.channel_config?.connected_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Conectado em {new Date(status.channel_config.connected_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={disconnectSession.isPending}
                  className="mt-4"
                >
                  {disconnectSession.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <WifiOff className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              </motion.div>
            )}

            {/* QR Code State */}
            {step === 'qr_ready' && qrCode && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-4"
              >
                <div className="relative group">
                  <img
                    src={`data:image/png;base64,${qrCode}`}
                    alt="QR Code"
                    className="w-64 h-64 border rounded-xl shadow-sm transition-transform group-hover:scale-[1.02]"
                  />
                  <motion.div
                    className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    whileHover={{ opacity: 1 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshQR}
                      className="text-white"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                  </motion.div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Abra o WhatsApp no seu celular
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>1. Toque em Menu ou Configuracoes</p>
                    <p>2. Toque em Aparelhos conectados</p>
                    <p>3. Toque em Conectar um aparelho</p>
                    <p>4. Aponte o celular para esta tela</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleRefreshQR}
                  disabled={connectSession.isPending}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Gerar novo QR Code
                </Button>
              </motion.div>
            )}

            {/* Loading State */}
            {(step === 'connecting' || step === 'idle') && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <QrCode className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/60" />
                </div>
                <p className="text-muted-foreground">Gerando QR Code...</p>
              </motion.div>
            )}

            {/* Error State */}
            {step === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>

                <div>
                  <h3 className="font-semibold text-red-600">Erro ao conectar</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {errorMessage || 'Ocorreu um erro inesperado'}
                  </p>
                </div>

                <Button onClick={handleConnect} disabled={connectSession.isPending}>
                  {connectSession.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Tentar novamente
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
