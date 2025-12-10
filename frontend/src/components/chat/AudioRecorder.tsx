import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Send, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import api from '@/api/axios'

interface AudioMessage {
  id: string
  content: string
  sender_type: string
  direction: string
  created_at: string
  status: 'sending' | 'sent' | 'delivered'
  metadata?: {
    media_type?: string
    file_name?: string
    file_size?: number
    mime_type?: string
  }
}

interface AudioRecorderProps {
  ticketId: string | null
  channelType?: string
  onAudioSent?: (message: AudioMessage) => void
  disabled?: boolean
}

export function AudioRecorder({ 
  ticketId, 
  channelType, 
  onAudioSent,
  disabled 
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  // Audio visualization
  const [audioLevel, setAudioLevel] = useState(0)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Format duration as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Start recording
  const startRecording = async () => {
    try {
      setError(null)
      chunksRef.current = []
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })
      
      streamRef.current = stream
      
      // Setup audio analyzer for visualization
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 256
      source.connect(analyzer)
      analyzerRef.current = analyzer
      
      // Start visualization
      const updateLevel = () => {
        if (analyzerRef.current) {
          const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount)
          analyzerRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average / 255)
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }
      updateLevel()
      
      // Create MediaRecorder with best available format
      // Chrome/Edge only reliably support webm, Safari supports mp4
      // We'll use webm and convert to ogg on backend for WhatsApp
      let mimeType = 'audio/webm;codecs=opus' // Best quality for Chrome
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm'
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus'
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else {
          // Fallback - let browser choose
          mimeType = ''
        }
      }
      
      console.log('MediaRecorder using MIME type:', mimeType || 'browser default')
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
      }
      
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setDuration(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
      
    } catch (err: any) {
      console.error('Error starting recording:', err)
      if (err.name === 'NotAllowedError') {
        setError('Permissão para microfone negada')
      } else if (err.name === 'NotFoundError') {
        setError('Nenhum microfone encontrado')
      } else {
        setError('Erro ao iniciar gravação')
      }
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      // Stop visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      
      // Stop stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }

  // Cancel recording
  const cancelRecording = () => {
    stopRecording()
    setAudioBlob(null)
    setDuration(0)
    setAudioLevel(0)
  }

  // Send audio
  const sendAudio = async () => {
    if (!audioBlob || !ticketId) return
    
    setIsSending(true)
    setError(null)
    
    try {
      // 1. Request presigned URL for upload
      // Determine extension based on actual MIME type
      const mimeType = audioBlob.type || 'audio/webm'
      let extension = 'webm' // default for Chrome
      
      if (mimeType.includes('ogg')) {
        extension = 'ogg'
      } else if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
        extension = 'm4a'
      } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
        extension = 'mp3'
      } else if (mimeType.includes('webm')) {
        extension = 'webm'
      }
      
      console.log('Audio blob type:', mimeType, 'extension:', extension)
      const fileName = `audio_${Date.now()}.${extension}`
      
      const presignedResponse = await api.post('/files/presigned-url', {
        ticket_id: ticketId,
        filename: fileName,
        mime_type: audioBlob.type,
        file_size: audioBlob.size,
      })
      
      const { upload_url, attachment_id, method, use_form_data } = presignedResponse.data
      
      // 2. Upload to S3 or local storage
      if (use_form_data) {
        // Local storage fallback - use FormData
        const formData = new FormData()
        formData.append('file', audioBlob, fileName)
        await api.post(upload_url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        // S3 direct upload
        await fetch(upload_url, {
          method: method || 'PUT',
          body: audioBlob,
          headers: {
            'Content-Type': audioBlob.type,
          },
        })
      }
      
      // 3. Confirm upload
      await api.post('/files/confirm', {
        attachment_id: attachment_id,
      })
      
      // 4. Send via WhatsApp (if WhatsApp channel)
      let mediaResponse: any = null
      if (channelType?.toLowerCase() === 'whatsapp') {
        const response = await api.post(`/whatsapp/tickets/${ticketId}/media`, {
          attachment_id: attachment_id,
          voice: true, // Flag para enviar como mensagem de voz (PTT)
        })
        mediaResponse = response.data
      }
      
      // Success! Create message object for real-time display
      // Use the actual message from backend if available
      const backendMessage = mediaResponse?.message
      const backendAttachment = mediaResponse?.attachment
      
      // Get the media URL from backend response
      const mediaUrl = backendAttachment?.url || 
                       backendMessage?.metadata?.media_url ||
                       upload_url
      
      const audioMessage: AudioMessage = {
        id: backendMessage?.id || `temp-audio-${Date.now()}`,
        content: backendMessage?.message || `[audio: ${fileName}]`,
        sender_type: 'user',
        direction: 'outbound',
        created_at: backendMessage?.sent_at || new Date().toISOString(),
        status: 'sent',
        metadata: {
          media_type: 'audio',
          media_url: mediaUrl,
          file_name: backendAttachment?.file_name || fileName,
          file_size: backendAttachment?.file_size || audioBlob.size,
          mime_type: backendAttachment?.mime_type || mimeType,
          ...backendMessage?.metadata,
        }
      }
      
      console.log('Audio message created:', audioMessage)
      
      setAudioBlob(null)
      setDuration(0)
      onAudioSent?.(audioMessage)
      
    } catch (err: any) {
      console.error('Error sending audio:', err)
      setError(err.response?.data?.error || 'Erro ao enviar áudio')
    } finally {
      setIsSending(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Show error toast
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const isWhatsApp = channelType?.toLowerCase() === 'whatsapp'

  // If not recording and no audio, show mic button
  if (!isRecording && !audioBlob) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={startRecording}
          disabled={disabled || !ticketId || !isWhatsApp}
          title={isWhatsApp ? "Gravar áudio" : "Áudio só disponível para WhatsApp"}
        >
          <Mic className={cn(
            "h-5 w-5",
            isWhatsApp ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50"
          )} />
        </Button>
        
        {/* Error tooltip */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded whitespace-nowrap"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Recording or has audio to send
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-full"
    >
      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={cancelRecording}
        disabled={isSending}
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </Button>
      
      {/* Audio visualization or duration */}
      <div className="flex items-center gap-2 flex-1 min-w-[100px]">
        {isRecording ? (
          <>
            {/* Recording indicator */}
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            
            {/* Audio level bars */}
            <div className="flex items-center gap-0.5 h-6">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  animate={{
                    height: isRecording 
                      ? `${Math.max(4, audioLevel * 24 * Math.sin((i + Date.now() / 100) * 0.5) + 12)}px`
                      : '4px'
                  }}
                  transition={{ duration: 0.1 }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Audio icon */}
            <Mic className="h-4 w-4 text-muted-foreground" />
          </>
        )}
        
        {/* Duration */}
        <span className="text-sm font-mono text-muted-foreground min-w-[45px]">
          {formatDuration(duration)}
        </span>
      </div>
      
      {/* Stop/Send button */}
      {isRecording ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 bg-red-500/10 hover:bg-red-500/20"
          onClick={stopRecording}
        >
          <Square className="h-4 w-4 text-red-500" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 bg-primary/10 hover:bg-primary/20"
          onClick={sendAudio}
          disabled={isSending || !audioBlob}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 text-primary" />
          )}
        </Button>
      )}
      
      {/* Error tooltip */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded whitespace-nowrap"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

