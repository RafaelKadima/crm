import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  TrendingUp,
  Play,
  Eye,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  FileText,
  Youtube,
  Instagram,
  Filter,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { contentApi, ViralVideo, ContentCreator } from '@/api/content'
import { toast } from 'sonner'

const platformIcons: Record<string, React.ElementType> = {
  youtube: Youtube,
  instagram: Instagram,
  tiktok: Play, // TikTok icon não existe no Lucide
}

const platformColors: Record<string, string> = {
  youtube: 'bg-red-500',
  instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
  tiktok: 'bg-black',
}

export function ViralVideoSearch() {
  const [searchTopic, setSearchTopic] = useState('')
  const [platform, setPlatform] = useState('youtube')
  const [period, setPeriod] = useState('week')
  const [videos, setVideos] = useState<ViralVideo[]>([])
  const [selectedVideo, setSelectedVideo] = useState<ViralVideo | null>(null)
  const [addToCreatorModal, setAddToCreatorModal] = useState(false)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('')
  const queryClient = useQueryClient()

  // Busca criadores para adicionar vídeos
  const { data: creatorsData } = useQuery({
    queryKey: ['content-creators'],
    queryFn: async () => {
      const response = await contentApi.listCreators()
      return response.data
    }
  })

  // Mutation para buscar vídeos
  const searchMutation = useMutation({
    mutationFn: () => contentApi.searchViralVideos(searchTopic, platform, period),
    onSuccess: (response) => {
      setVideos(response.data.videos)
      if (response.data.videos.length === 0) {
        toast.info('Nenhum vídeo encontrado. Tente outros termos.')
      }
    },
    onError: () => {
      toast.error('Erro ao buscar vídeos')
    }
  })

  // Mutation para adicionar vídeo a criador
  const addVideoMutation = useMutation({
    mutationFn: (data: { creatorId: string; videoUrl: string }) =>
      contentApi.addVideoToCreator(data.creatorId, data.videoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-creators'] })
      setAddToCreatorModal(false)
      setSelectedVideo(null)
      setSelectedCreatorId('')
      toast.success('Vídeo adicionado ao criador!')
    },
    onError: () => {
      toast.error('Erro ao adicionar vídeo')
    }
  })

  const handleSearch = () => {
    if (!searchTopic.trim()) {
      toast.error('Digite um tema para buscar')
      return
    }
    searchMutation.mutate()
  }

  const handleAddToCreator = () => {
    if (!selectedVideo || !selectedCreatorId) return
    addVideoMutation.mutate({
      creatorId: selectedCreatorId,
      videoUrl: selectedVideo.url
    })
  }

  const formatViews = (views?: number) => {
    if (!views) return 'N/A'
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const creators = creatorsData?.creators || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-orange-500" />
          Busca de Vídeos Virais
        </h1>
        <p className="text-muted-foreground mt-1">
          Encontre vídeos virais para inspiração e adicione aos seus criadores
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="topic">Tema / Nicho</Label>
              <Input
                id="topic"
                placeholder="Ex: produtividade, finanças, marketing..."
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">
                    <div className="flex items-center gap-2">
                      <Youtube className="h-4 w-4 text-red-500" />
                      YouTube
                    </div>
                  </SelectItem>
                  <SelectItem value="tiktok">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      TikTok
                    </div>
                  </SelectItem>
                  <SelectItem value="instagram">
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-pink-500" />
                      Instagram
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Últimas 24h</SelectItem>
                  <SelectItem value="week">Última Semana</SelectItem>
                  <SelectItem value="month">Último Mês</SelectItem>
                  <SelectItem value="year">Último Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              className="gap-2"
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar Vídeos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchMutation.isPending ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : videos.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {videos.length} vídeos encontrados
            </h2>
            <Badge variant="outline" className="gap-1">
              <Filter className="h-3 w-3" />
              {platform} • {period === 'day' ? '24h' : period === 'week' ? '7 dias' : period === 'month' ? '30 dias' : '1 ano'}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {videos.map((video, index) => {
                const PlatformIcon = platformIcons[video.platform] || Play

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Thumbnail */}
                      {video.thumbnail ? (
                        <div className="aspect-video relative bg-muted">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 rounded-full bg-white/20 hover:bg-white/30"
                            >
                              <Play className="h-8 w-8 text-white" />
                            </a>
                          </div>
                          {video.duration && (
                            <Badge className="absolute bottom-2 right-2 bg-black/70">
                              {formatDuration(video.duration)}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          <PlatformIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}

                      <CardContent className="p-4">
                        <h3 className="font-medium line-clamp-2 mb-2">
                          {video.title}
                        </h3>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                          {video.channel && (
                            <span className="truncate">{video.channel}</span>
                          )}
                          {video.views && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {formatViews(video.views)}
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            asChild
                          >
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Ver
                            </a>
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedVideo(video)
                              setAddToCreatorModal(true)
                            }}
                            disabled={creators.length === 0}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : videos.length === 0 && !searchMutation.isPending && searchTopic ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum vídeo encontrado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Tente outros termos de busca ou altere os filtros
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Empty State */}
      {videos.length === 0 && !searchMutation.isPending && !searchTopic && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Busque vídeos virais</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Digite um tema ou nicho para encontrar vídeos virais e adicionar à biblioteca de criadores
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal: Adicionar a Criador */}
      <Dialog open={addToCreatorModal} onOpenChange={setAddToCreatorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Vídeo ao Criador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedVideo && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium line-clamp-2">{selectedVideo.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedVideo.channel}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Selecione o Criador</Label>
              <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um criador..." />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.name} ({creator.video_count} vídeos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {creators.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Você precisa criar um criador primeiro antes de adicionar vídeos.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToCreatorModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddToCreator}
              disabled={!selectedCreatorId || addVideoMutation.isPending}
            >
              {addVideoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adicionando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
