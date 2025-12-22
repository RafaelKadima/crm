import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  TrendingUp,
  Play,
  Eye,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Youtube,
  Instagram,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Checkbox } from '@/components/ui/Checkbox'
import { contentApi } from '@/api/content'
import { toast } from 'sonner'

interface ViralVideo {
  title: string
  url: string
  platform: string
  views?: number
  duration?: number
  channel?: string
  thumbnail?: string
}

interface ContentCreator {
  id: string
  name: string
  video_count: number
  style_summary?: string
  created_at: string
}

export function ViralVideoSearch() {
  const [searchTopic, setSearchTopic] = useState('')
  const [platform, setPlatform] = useState('youtube')
  const [period, setPeriod] = useState('week')
  const [videos, setVideos] = useState<ViralVideo[]>([])
  const [selectedVideos, setSelectedVideos] = useState<Set<number>>(new Set())
  const [addToCreatorModal, setAddToCreatorModal] = useState(false)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>('')
  const [videoToAdd, setVideoToAdd] = useState<ViralVideo | null>(null)
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
      setSelectedVideos(new Set())
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
      setVideoToAdd(null)
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
    if (!videoToAdd || !selectedCreatorId) return
    addVideoMutation.mutate({
      creatorId: selectedCreatorId,
      videoUrl: videoToAdd.url
    })
  }

  const handleRemoveVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index))
    setSelectedVideos(prev => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
    toast.success('Vídeo removido da lista')
  }

  const handleRemoveSelected = () => {
    setVideos(prev => prev.filter((_, i) => !selectedVideos.has(i)))
    setSelectedVideos(new Set())
    toast.success(`${selectedVideos.size} vídeos removidos`)
  }

  const toggleSelectVideo = (index: number) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set())
    } else {
      setSelectedVideos(new Set(videos.map((_, i) => i)))
    }
  }

  const formatViews = (views?: number) => {
    if (!views) return '-'
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
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
              <p className="text-xs text-muted-foreground">
                * Busca via YouTube Shorts/Reels
              </p>
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
        <Card>
          <CardContent className="p-0">
            {/* Table Header Actions */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {videos.length} vídeos encontrados
                </span>
                {selectedVideos.size > 0 && (
                  <Badge variant="secondary">
                    {selectedVideos.size} selecionados
                  </Badge>
                )}
              </div>
              {selectedVideos.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveSelected}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover Selecionados
                </Button>
              )}
            </div>

            {/* Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedVideos.size === videos.length && videos.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-16">Thumb</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="w-32">Canal</TableHead>
                  <TableHead className="w-24 text-center">
                    <Eye className="h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="w-20 text-center">
                    <Clock className="h-4 w-4 inline" />
                  </TableHead>
                  <TableHead className="w-40 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video, index) => (
                  <TableRow key={index} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selectedVideos.has(index)}
                        onCheckedChange={() => toggleSelectVideo(index)}
                      />
                    </TableCell>
                    <TableCell>
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt=""
                          className="w-14 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-14 h-10 bg-muted rounded flex items-center justify-center">
                          <Play className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-primary line-clamp-2"
                      >
                        {video.title}
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate block max-w-[120px]">
                        {video.channel || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{formatViews(video.views)}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">{formatDuration(video.duration)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVideoToAdd(video)
                            setAddToCreatorModal(true)
                          }}
                          disabled={creators.length === 0}
                          title="Adicionar a um criador"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveVideo(index)}
                          className="text-destructive hover:text-destructive"
                          title="Remover da lista"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
            {videoToAdd && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium line-clamp-2">{videoToAdd.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {videoToAdd.channel}
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
