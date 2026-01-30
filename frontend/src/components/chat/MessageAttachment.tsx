import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Download,
  Play,
  Pause,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import api from '@/api/axios'

interface MessageAttachmentProps {
  metadata: {
    attachment_id?: string
    media_type?: string
    media_url?: string
    file_name?: string
    file_size?: number
    mime_type?: string
    image_url?: string
    audio_url?: string
    video_url?: string
    document_url?: string
    sticker_url?: string
  }
  direction: 'inbound' | 'outbound'
  ticketId?: string | null
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Extracts the media file path from various URL formats
 * Converts URLs to use the authenticated /api/media/ endpoint
 * This handles cases where URLs were saved with ngrok/production domain
 */
function extractMediaPath(url: string | undefined): string | undefined {
  if (!url) return url
  
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    
    // Extract file path from /api/media-public/... or /api/media/...
    // We'll use the authenticated endpoint which doesn't require URL signature
    const mediaPublicMatch = pathname.match(/\/api\/media-public\/(.+)/)
    if (mediaPublicMatch) {
      return mediaPublicMatch[1] // Just the file path without /api/media-public/
    }
    
    const mediaMatch = pathname.match(/\/api\/media\/(.+)/)
    if (mediaMatch) {
      return mediaMatch[1] // Just the file path without /api/media/
    }
    
    // Not an internal API URL
    return undefined
  } catch {
    // If URL parsing fails, check if it's already a path
    if (url.startsWith('/api/media-public/')) {
      return url.replace('/api/media-public/', '')
    }
    if (url.startsWith('/api/media/')) {
      return url.replace('/api/media/', '')
    }
    return undefined
  }
}

export function MessageAttachment({ metadata, direction, ticketId }: MessageAttachmentProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [proxyUrl, setProxyUrl] = useState<string | undefined>(undefined)

  const originalMediaUrl = metadata.sticker_url || metadata.media_url || metadata.image_url || metadata.video_url || metadata.audio_url || metadata.document_url
  const mediaFilePath = extractMediaPath(originalMediaUrl)
  const mediaType = metadata.media_type || detectMediaType(metadata)
  const fileName = metadata.file_name || 'Arquivo'
  const fileSize = metadata.file_size

  // Determine URL type for proper handling:
  // - Internal API URLs (have /api/media/ in path): fetch via authenticated endpoint
  // - Meta URLs: need WhatsApp proxy
  // - S3/external URLs: can be used directly
  const isInternalApiUrl = mediaFilePath !== undefined
  const isExternalStorageUrl = originalMediaUrl?.includes('s3.') || 
                               originalMediaUrl?.includes('amazonaws.com')
  const isMetaUrl = !isInternalApiUrl && !isExternalStorageUrl && 
                    (originalMediaUrl?.includes('graph.facebook.com') || originalMediaUrl?.includes('lookaside.fbsbx.com'))
  
  // URLs that need proxy/fetch: Internal API URLs and Meta URLs
  const needsProxy = isInternalApiUrl || isMetaUrl

  // Use proxy for internal API/Meta URLs, direct for external S3 URLs
  const mediaUrl = proxyUrl || (!needsProxy ? originalMediaUrl : undefined)

  // Track if we already tried to fetch this URL (to avoid infinite retries)
  const [fetchAttempted, setFetchAttempted] = React.useState(false)

  // Load media via API for internal URLs and Meta URLs
  React.useEffect(() => {
    if (needsProxy && !proxyUrl && !imageError && !fetchAttempted) {
      setFetchAttempted(true)
      
      const fetchMedia = async () => {
        try {
          if (isMetaUrl && ticketId) {
            // For Meta URLs, use the WhatsApp proxy endpoint
            const response = await api.post(
              `/whatsapp/tickets/${ticketId}/proxy-media`,
              { media_url: originalMediaUrl },
              { responseType: 'blob' }
            )
            const blobUrl = URL.createObjectURL(response.data)
            setProxyUrl(blobUrl)
          } else if (isInternalApiUrl && mediaFilePath) {
            // For internal API URLs, use the authenticated /media/ endpoint
            // This works regardless of the original URL signature
            const response = await api.get(
              `/media/${mediaFilePath}`,
              { responseType: 'blob' }
            )
            const blobUrl = URL.createObjectURL(response.data)
            setProxyUrl(blobUrl)
          }
        } catch (error: any) {
          // Don't log error for expired/missing media (404) - it's expected
          if (error?.response?.status !== 404) {
            console.error('Error fetching media:', error)
          }
          setImageError(true)
        }
      }
      fetchMedia()
    }
  }, [needsProxy, isMetaUrl, isInternalApiUrl, mediaFilePath, originalMediaUrl, ticketId, proxyUrl, imageError, fetchAttempted])

  // Cleanup blob URL on unmount
  React.useEffect(() => {
    return () => {
      if (proxyUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(proxyUrl)
      }
    }
  }, [proxyUrl])

  if (!originalMediaUrl && !metadata.attachment_id) {
    return null
  }

  const isOutbound = direction === 'outbound'

  // Show loading while fetching proxy for Meta URLs or old internal URLs
  if (needsProxy && !proxyUrl && !imageError) {
    return (
      <div className="mt-2 mb-1">
        <div className="relative rounded-lg overflow-hidden max-w-[280px] bg-muted animate-pulse min-h-[150px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Render based on media type
  switch (mediaType) {
    case 'sticker':
      return (
        <div className="mt-1 mb-1">
          {!imageError ? (
            <img
              src={mediaUrl}
              alt="Sticker"
              className={cn(
                "max-w-[180px] max-h-[180px] transition-opacity",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setImageError(true)
              }}
            />
          ) : (
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg w-[180px] h-[180px]">
              <div className="text-center">
                <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Sticker indisponível</p>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="w-[180px] h-[180px] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )

    case 'image':
      return (
        <div className="mt-2 mb-1">
          <div 
            className={cn(
              "relative rounded-lg overflow-hidden max-w-[280px]",
              isLoading && "bg-muted animate-pulse min-h-[150px]"
            )}
          >
            {!imageError ? (
              <img
                src={mediaUrl}
                alt={fileName}
                className={cn(
                  "max-w-full rounded-lg cursor-pointer transition-opacity",
                  isLoading ? "opacity-0" : "opacity-100"
                )}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false)
                  setImageError(true)
                }}
                onClick={() => window.open(mediaUrl, '_blank')}
              />
            ) : (
              <div className="flex items-center justify-center p-4 bg-muted rounded-lg min-h-[100px]">
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Mídia indisponível</p>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )

    case 'video':
      // Show loading while fetching media URL
      if (!mediaUrl) {
        return (
          <div className="mt-2 mb-1">
            <div className="relative rounded-lg overflow-hidden max-w-[280px] bg-black min-h-[150px] flex items-center justify-center">
              {imageError ? (
                <div className="text-center p-4">
                  <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Vídeo indisponível</p>
                </div>
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        )
      }
      return (
        <div className="mt-2 mb-1">
          <div className="relative rounded-lg overflow-hidden max-w-[280px] bg-black">
            <video
              src={mediaUrl}
              className="max-w-full rounded-lg"
              controls
              preload="metadata"
              onLoadedMetadata={() => setIsLoading(false)}
            >
              Seu navegador não suporta vídeos.
            </video>
          </div>
        </div>
      )

    case 'audio':
      // Show loading while fetching media URL
      if (!mediaUrl) {
        return (
          <div className="mt-2 mb-1">
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg",
              isOutbound ? "bg-primary-foreground/10" : "bg-muted"
            )}>
              <div className={cn(
                "p-2 rounded-full",
                isOutbound ? "bg-primary-foreground/20" : "bg-background"
              )}>
                <Music className={cn(
                  "h-4 w-4",
                  isOutbound ? "text-primary-foreground" : "text-foreground"
                )} />
              </div>
              <div className="flex-1 flex items-center justify-center h-8">
                {imageError ? (
                  <p className="text-xs text-muted-foreground">Áudio indisponível</p>
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
        )
      }
      return (
        <div className="mt-2 mb-1">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg",
            isOutbound ? "bg-primary-foreground/10" : "bg-muted"
          )}>
            <div className={cn(
              "p-2 rounded-full",
              isOutbound ? "bg-primary-foreground/20" : "bg-background"
            )}>
              <Music className={cn(
                "h-4 w-4",
                isOutbound ? "text-primary-foreground" : "text-foreground"
              )} />
            </div>
            <audio
              src={mediaUrl}
              className="flex-1 h-8"
              controls
              preload="metadata"
            >
              Seu navegador não suporta áudios.
            </audio>
          </div>
        </div>
      )

    case 'document':
    default:
      return (
        <div className="mt-2 mb-1">
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              isOutbound 
                ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" 
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <div className={cn(
              "p-2 rounded-lg",
              isOutbound ? "bg-primary-foreground/20" : "bg-background"
            )}>
              <FileText className={cn(
                "h-5 w-5",
                isOutbound ? "text-primary-foreground" : "text-orange-500"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isOutbound ? "text-primary-foreground" : "text-foreground"
              )}>
                {fileName}
              </p>
              {fileSize && (
                <p className={cn(
                  "text-xs",
                  isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {formatFileSize(fileSize)}
                </p>
              )}
            </div>
            <Download className={cn(
              "h-4 w-4 shrink-0",
              isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"
            )} />
          </a>
        </div>
      )
  }
}

function detectMediaType(metadata: MessageAttachmentProps['metadata']): string {
  if (metadata.sticker_url || metadata.media_type === 'sticker') return 'sticker'
  if (metadata.image_url) return 'image'
  if (metadata.video_url) return 'video'
  if (metadata.audio_url) return 'audio'
  if (metadata.document_url) return 'document'

  const mimeType = metadata.mime_type?.toLowerCase() || ''
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'

  return 'document'
}

