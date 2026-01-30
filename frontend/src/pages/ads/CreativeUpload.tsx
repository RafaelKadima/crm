import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Upload,
  Image,
  Video,
  Trash2,
  Eye,
  Link2,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Plus,
  FileImage,
  FileVideo,
} from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import api from '@/api/axios'

interface Creative {
  id: string
  name: string
  type: 'image' | 'video'
  file_url?: string
  external_url?: string
  thumbnail_url?: string
  status: 'uploaded' | 'processing' | 'ready' | 'used' | 'error'
  file_size?: number
  width?: number
  height?: number
  created_at: string
}

const statusConfig = {
  uploaded: { icon: Clock, color: 'text-yellow-500', label: 'Enviado' },
  processing: { icon: Clock, color: 'text-blue-500', label: 'Processando' },
  ready: { icon: CheckCircle, color: 'text-green-500', label: 'Pronto' },
  used: { icon: CheckCircle, color: 'text-purple-500', label: 'Em uso' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Erro' },
}

export default function CreativeUpload() {
  const queryClient = useQueryClient()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [urlForm, setUrlForm] = useState({
    url: '',
    name: '',
    type: 'image' as 'image' | 'video',
  })

  // Busca criativos
  const { data: creativesResponse, isLoading } = useQuery({
    queryKey: ['creatives'],
    queryFn: () => api.get('/ads/creatives').then(res => res.data),
  })

  const creatives: Creative[] = creativesResponse?.data || creativesResponse || []

  // Upload de arquivo
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name)
      
      return api.post('/ads/creatives', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      toast.success('Criativo enviado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['creatives'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao enviar criativo')
    },
  })

  // Upload via URL
  const uploadFromUrlMutation = useMutation({
    mutationFn: (data: typeof urlForm) =>
      api.post('/ads/creatives/from-url', data),
    onSuccess: () => {
      toast.success('Criativo adicionado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['creatives'] })
      setShowUrlDialog(false)
      setUrlForm({ url: '', name: '', type: 'image' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao adicionar criativo')
    },
  })

  // Deletar criativo
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ads/creatives/${id}`),
    onSuccess: () => {
      toast.success('Criativo removido!')
      queryClient.invalidateQueries({ queryKey: ['creatives'] })
    },
    onError: () => {
      toast.error('Erro ao remover criativo')
    },
  })

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      uploadMutation.mutate(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Criativos"
        subtitle="Faça upload de imagens e vídeos para usar em suas campanhas"
        actions={
          <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Link2 className="w-4 h-4 mr-2" />
                Adicionar via URL
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Criativo via URL</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do criativo</Label>
                  <Input
                    placeholder="Meu criativo"
                    value={urlForm.name}
                    onChange={e => setUrlForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL do arquivo</Label>
                  <Input
                    placeholder="https://..."
                    value={urlForm.url}
                    onChange={e => setUrlForm(prev => ({ ...prev, url: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={urlForm.type === 'image' ? 'default' : 'outline'}
                      onClick={() => setUrlForm(prev => ({ ...prev, type: 'image' }))}
                      className="flex-1"
                    >
                      <FileImage className="w-4 h-4 mr-2" />
                      Imagem
                    </Button>
                    <Button
                      variant={urlForm.type === 'video' ? 'default' : 'outline'}
                      onClick={() => setUrlForm(prev => ({ ...prev, type: 'video' }))}
                      className="flex-1"
                    >
                      <FileVideo className="w-4 h-4 mr-2" />
                      Vídeo
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => uploadFromUrlMutation.mutate(urlForm)}
                  disabled={!urlForm.url || !urlForm.name || uploadFromUrlMutation.isPending}
                >
                  {uploadFromUrlMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Upload Zone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-200
              ${isDragActive 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                : 'border-gray-300 dark:border-border hover:border-purple-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${isDragActive ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-gray-100 dark:bg-muted'}
              `}>
                <Upload className={`w-8 h-8 ${isDragActive ? 'text-purple-500' : 'text-muted-foreground'}`} />
              </div>
              
              {isDragActive ? (
                <p className="text-lg font-medium text-purple-600">
                  Solte os arquivos aqui...
                </p>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-700 dark:text-muted-foreground">
                    Arraste e solte arquivos aqui
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ou clique para selecionar
                  </p>
                </>
              )}
              
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  JPG, PNG, GIF
                </span>
                <span className="flex items-center gap-1">
                  <Video className="w-3 h-3" />
                  MP4, MOV, WEBM
                </span>
                <span>Máx. 100MB</span>
              </div>
            </div>
          </div>
          
          {uploadMutation.isPending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Enviando arquivo...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Criativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Seus Criativos ({creatives.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : creatives.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-muted flex items-center justify-center">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground dark:text-muted-foreground">
                Nenhum criativo ainda
              </p>
              <p className="text-sm text-muted-foreground">
                Faça upload de imagens ou vídeos para começar
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {creatives.map(creative => {
                const StatusIcon = statusConfig[creative.status]?.icon || Clock
                const statusColor = statusConfig[creative.status]?.color || 'text-muted-foreground'
                const mediaUrl = creative.file_url || creative.external_url
                const thumbnailUrl = creative.thumbnail_url || (creative.type === 'image' ? mediaUrl : null)
                
                return (
                  <div
                    key={creative.id}
                    className="group relative bg-gray-50 dark:bg-muted/50 rounded-xl overflow-hidden border border-gray-200 dark:border-border"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square relative bg-gray-200 dark:bg-accent">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={creative.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {creative.type === 'video' ? (
                            <Video className="w-12 h-12 text-muted-foreground" />
                          ) : (
                            <Image className="w-12 h-12 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      
                      {/* Type badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`
                          px-2 py-0.5 rounded text-xs font-medium
                          ${creative.type === 'video' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' 
                            : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                          }
                        `}>
                          {creative.type === 'video' ? 'Vídeo' : 'Imagem'}
                        </span>
                      </div>
                      
                      {/* Actions overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {mediaUrl && (
                          <button
                            onClick={() => setPreviewUrl(mediaUrl)}
                            className="p-2 bg-white rounded-full hover:bg-gray-100 transition"
                          >
                            <Eye className="w-4 h-4 text-gray-700" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(creative.id)}
                          className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {creative.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(creative.file_size)}
                        </span>
                        <span className={`flex items-center gap-1 text-xs ${statusColor}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[creative.status]?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          {previewUrl.match(/\.(mp4|mov|avi|webm)$/i) ? (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-[80vh] rounded-lg"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-[80vh] rounded-lg object-contain"
              onClick={e => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  )
}

