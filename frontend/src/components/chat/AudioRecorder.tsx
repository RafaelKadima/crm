import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Square, Send, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { Mp3Encoder } from 'lamejs'

// Helper function to write string to DataView
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

// Convert audio blob to WAV format using AudioContext
async function convertToWav(blob: Blob): Promise<Blob> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const arrayBuffer = await blob.arrayBuffer()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

  const numChannels = 1 // mono for voice
  const sampleRate = audioBuffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  // Get audio data (use first channel only for mono)
  const samples = audioBuffer.getChannelData(0)
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)

  // WAV header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, format, true) // audio format (PCM)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true) // byte rate
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, samples.length * bytesPerSample, true)

  // Write samples
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    offset += 2
  }

  await audioContext.close()
  return new Blob([buffer], { type: 'audio/wav' })
}

// Convert WAV to MP3 using lamejs
async function convertToMp3(wavBlob: Blob): Promise<Blob> {
  const arrayBuffer = await wavBlob.arrayBuffer()
  const view = new DataView(arrayBuffer)

  // Read WAV header
  const numChannels = view.getUint16(22, true)
  const sampleRate = view.getUint32(24, true)

  // Get samples (skip 44 byte header)
  const samples = new Int16Array(arrayBuffer, 44)

  // Create MP3 encoder (mono, sample rate, 128kbps)
  const mp3encoder = new Mp3Encoder(numChannels, sampleRate, 128)
  const mp3Data: Int8Array[] = []

  const sampleBlockSize = 1152
  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    const sampleChunk = samples.subarray(i, i + sampleBlockSize)
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk)
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }
  }

  const end = mp3encoder.flush()
  if (end.length > 0) {
    mp3Data.push(end)
  }

  // Combine all MP3 chunks
  const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0)
  const mp3Array = new Uint8Array(totalLength)
  let offset = 0
  for (const buf of mp3Data) {
    mp3Array.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.length), offset)
    offset += buf.length
  }

  return new Blob([mp3Array], { type: 'audio/mpeg' })
}

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
  const [isConverting, setIsConverting] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
    setIsConverting(true)
    setError(null)

    try {
      // 1. Convert WebM to MP3 for universal compatibility (especially iOS)
      console.log('Converting audio...', audioBlob.type, audioBlob.size)

      let finalBlob: Blob
      let finalMimeType: string
      let extension: string

      try {
        // Convert WebM → WAV → MP3
        const wavBlob = await convertToWav(audioBlob)
        console.log('Converted to WAV:', wavBlob.size)

        finalBlob = await convertToMp3(wavBlob)
        finalMimeType = 'audio/mpeg'
        extension = 'mp3'
        console.log('Converted to MP3:', finalBlob.size)
      } catch (conversionError) {
        console.error('Conversion failed, using original:', conversionError)
        // Fallback to original blob if conversion fails
        finalBlob = audioBlob
        finalMimeType = audioBlob.type || 'audio/webm'
        extension = finalMimeType.includes('ogg') ? 'ogg' :
                    finalMimeType.includes('mp4') ? 'm4a' :
                    finalMimeType.includes('mpeg') ? 'mp3' : 'webm'
      }

      setIsConverting(false)

      const fileName = `audio_${Date.now()}.${extension}`
      console.log('Final audio:', finalMimeType, extension, finalBlob.size)

      // 2. Request presigned URL for upload
      const presignedResponse = await api.post('/files/presigned-url', {
        ticket_id: ticketId,
        filename: fileName,
        mime_type: finalMimeType,
        file_size: finalBlob.size,
      })
      
      const { upload_url, attachment_id, method, use_form_data } = presignedResponse.data

      // 3. Upload to S3 or local storage
      if (use_form_data) {
        // Local storage fallback - use FormData
        const formData = new FormData()
        formData.append('file', finalBlob, fileName)
        await api.post(upload_url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        // S3 direct upload with MP3
        await fetch(upload_url, {
          method: method || 'PUT',
          body: finalBlob,
          headers: {
            'Content-Type': finalMimeType,
          },
        })
      }
      
      // 4. Confirm upload
      await api.post('/files/confirm', {
        attachment_id: attachment_id,
      })
      
      // 5. Send via WhatsApp (if WhatsApp channel)
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
          file_size: backendAttachment?.file_size || finalBlob.size,
          mime_type: backendAttachment?.mime_type || finalMimeType,
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
      setIsConverting(false)
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

