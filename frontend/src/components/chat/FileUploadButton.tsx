import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Paperclip,
  X,
  Upload,
  Loader2,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  AlertCircle,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { filesApi, whatsAppMediaApi, type AttachmentResponse } from '@/api/endpoints'
import { toast } from 'sonner'

interface FileUploadButtonProps {
  ticketId: string | null
  channelType?: string
  onUploadComplete?: (attachment: AttachmentResponse) => void
  onMediaSent?: () => void
  disabled?: boolean
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'confirming' | 'sending' | 'complete' | 'error'
  error?: string
  attachment?: AttachmentResponse
}

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
}

const MAX_SIZES = {
  image: 16 * 1024 * 1024, // 16MB
  video: 64 * 1024 * 1024, // 64MB
  audio: 16 * 1024 * 1024, // 16MB
  document: 100 * 1024 * 1024, // 100MB
}

const ALL_ALLOWED_TYPES = Object.values(ALLOWED_TYPES).flat()

function getFileCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | null {
  for (const [category, types] of Object.entries(ALLOWED_TYPES)) {
    if (types.includes(mimeType)) {
      return category as 'image' | 'video' | 'audio' | 'document'
    }
  }
  return null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileIcon(category: string | null) {
  switch (category) {
    case 'image':
      return ImageIcon
    case 'video':
      return Video
    case 'audio':
      return Music
    case 'document':
      return FileText
    default:
      return Paperclip
  }
}

export function FileUploadButton({
  ticketId,
  channelType,
  onUploadComplete,
  onMediaSent,
  disabled,
}: FileUploadButtonProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [showDropzone, setShowDropzone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isWhatsApp = channelType?.toLowerCase() === 'whatsapp'

  const updateFileStatus = useCallback(
    (
      id: string,
      updates: Partial<UploadingFile>
    ) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      )
    },
    []
  )

  const removeFile = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const uploadFile = useCallback(
    async (file: File) => {
      if (!ticketId) {
        toast.error('Selecione um ticket primeiro')
        return
      }

      const category = getFileCategory(file.type)
      if (!category) {
        toast.error(`Tipo de arquivo não suportado: ${file.type}`)
        return
      }

      const maxSize = MAX_SIZES[category]
      if (file.size > maxSize) {
        toast.error(
          `Arquivo muito grande. Máximo: ${formatFileSize(maxSize)}`
        )
        return
      }

      const uploadId = crypto.randomUUID()
      const uploadingFile: UploadingFile = {
        id: uploadId,
        file,
        progress: 0,
        status: 'uploading',
      }

      setUploadingFiles((prev) => [...prev, uploadingFile])

      try {
        // 1. Get presigned URL
        const presignedResponse = await filesApi.getPresignedUrl({
          filename: file.name,
          mime_type: file.type,
          file_size: file.size,
          ticket_id: ticketId,
        })

        const { upload_url, method, attachment_id, headers, use_form_data } =
          presignedResponse.data

        updateFileStatus(uploadId, { progress: 20 })

        // 2. Upload file directly to storage
        if (use_form_data) {
          // Local storage fallback - use form data
          await filesApi.uploadDirect(attachment_id, file)
        } else {
          // S3/R2 - use PUT with presigned URL
          const uploadResponse = await fetch(upload_url, {
            method: method,
            headers: {
              'Content-Type': file.type,
              ...headers,
            },
            body: file,
          })

          if (!uploadResponse.ok) {
            throw new Error('Falha no upload do arquivo')
          }
        }

        updateFileStatus(uploadId, { progress: 60, status: 'confirming' })

        // 3. Confirm upload
        const confirmResponse = await filesApi.confirmUpload(attachment_id)
        const attachment = confirmResponse.data.attachment

        updateFileStatus(uploadId, {
          progress: 80,
          status: 'complete',
          attachment,
        })

        // 4. If WhatsApp, send media automatically
        if (isWhatsApp) {
          updateFileStatus(uploadId, { status: 'sending', progress: 90 })

          try {
            await whatsAppMediaApi.sendMedia(ticketId, attachment.id)
            updateFileStatus(uploadId, { progress: 100, status: 'complete' })
            onMediaSent?.()
            toast.success('Arquivo enviado com sucesso!')
          } catch (sendError: any) {
            console.error('Error sending media:', sendError)
            toast.error(
              sendError.response?.data?.error || 'Erro ao enviar mídia'
            )
            // Keep the attachment, just mark as complete
            updateFileStatus(uploadId, { progress: 100, status: 'complete' })
          }
        } else {
          updateFileStatus(uploadId, { progress: 100 })
          toast.success('Arquivo enviado com sucesso!')
        }

        onUploadComplete?.(attachment)

        // Remove from list after delay
        setTimeout(() => {
          removeFile(uploadId)
        }, 2000)
      } catch (error: any) {
        console.error('Upload error:', error)
        updateFileStatus(uploadId, {
          status: 'error',
          error: error.response?.data?.error || error.message || 'Erro no upload',
        })
        toast.error(error.response?.data?.error || 'Erro no upload do arquivo')
      }
    },
    [ticketId, isWhatsApp, updateFileStatus, removeFile, onUploadComplete, onMediaSent]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      Array.from(files).forEach((file) => {
        uploadFile(file)
      })

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      setShowDropzone(false)
    },
    [uploadFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer.files
      Array.from(files).forEach((file) => {
        uploadFile(file)
      })
      setShowDropzone(false)
    },
    [uploadFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const hasActiveUploads = uploadingFiles.some(
    (f) => f.status === 'uploading' || f.status === 'confirming' || f.status === 'sending'
  )

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ALL_ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 relative"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || !ticketId}
        title="Anexar arquivo"
      >
        {hasActiveUploads ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Paperclip className="h-5 w-5" />
        )}
      </Button>

      {/* Upload progress overlay */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 mb-2 mx-4"
          >
            <div className="bg-background border rounded-lg shadow-lg p-3 space-y-2">
              {uploadingFiles.map((item) => {
                const category = getFileCategory(item.file.type)
                const FileIcon = getFileIcon(category)

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded"
                  >
                    <div
                      className={cn(
                        'p-2 rounded',
                        category === 'image' && 'bg-blue-500/10 text-blue-500',
                        category === 'video' && 'bg-purple-500/10 text-purple-500',
                        category === 'audio' && 'bg-green-500/10 text-green-500',
                        category === 'document' && 'bg-orange-500/10 text-orange-500'
                      )}
                    >
                      <FileIcon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.file.name}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={cn(
                              'h-full rounded-full',
                              item.status === 'error'
                                ? 'bg-red-500'
                                : item.status === 'complete'
                                ? 'bg-green-500'
                                : 'bg-primary'
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatFileSize(item.file.size)}
                        </span>
                      </div>
                      {item.error && (
                        <p className="text-xs text-red-500 mt-1">{item.error}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {item.status === 'complete' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : item.status === 'error' ? (
                        <button onClick={() => removeFile(item.id)}>
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

