import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Trash2,
  Video,
  FileText,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Play,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { contentApi, ContentCreator } from '@/api/content'
import { toast } from 'sonner'

export function ContentCreators() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [expandedCreator, setExpandedCreator] = useState<string | null>(null)
  const [newCreatorName, setNewCreatorName] = useState('')
  const [newCreatorUrls, setNewCreatorUrls] = useState('')
  const [addVideoCreatorId, setAddVideoCreatorId] = useState<string | null>(null)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const queryClient = useQueryClient()

  // Busca criadores
  const { data: creatorsData, isLoading } = useQuery({
    queryKey: ['content-creators'],
    queryFn: async () => {
      const response = await contentApi.listCreators()
      return response.data
    }
  })

  // Criar criador
  const createMutation = useMutation({
    mutationFn: (data: { name: string; videoUrls: string[] }) =>
      contentApi.createCreator(data.name, data.videoUrls),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['content-creators'] })
      setIsAddModalOpen(false)
      setNewCreatorName('')
      setNewCreatorUrls('')
      const data = response.data
      toast.success(`Criador "${data.creator.name}" criado com ${data.transcribed_count} vídeos!`)
    },
    onError: () => {
      toast.error('Erro ao criar criador')
    }
  })

  // Deletar criador
  const deleteMutation = useMutation({
    mutationFn: (creatorId: string) => contentApi.deleteCreator(creatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-creators'] })
      toast.success('Criador removido')
    },
    onError: () => {
      toast.error('Erro ao remover criador')
    }
  })

  // Adicionar vídeo
  const addVideoMutation = useMutation({
    mutationFn: (data: { creatorId: string; videoUrl: string }) =>
      contentApi.addVideoToCreator(data.creatorId, data.videoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-creators'] })
      setAddVideoCreatorId(null)
      setNewVideoUrl('')
      toast.success('Vídeo adicionado com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao adicionar vídeo')
    }
  })

  const handleCreateCreator = () => {
    if (!newCreatorName.trim()) return

    const urls = newCreatorUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)

    createMutation.mutate({ name: newCreatorName.trim(), videoUrls: urls })
  }

  const handleAddVideo = () => {
    if (!addVideoCreatorId || !newVideoUrl.trim()) return
    addVideoMutation.mutate({ creatorId: addVideoCreatorId, videoUrl: newVideoUrl.trim() })
  }

  const creators = creatorsData?.creators || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-500" />
            Gerenciar Criadores
          </h1>
          <p className="text-muted-foreground mt-1">
            Adicione criadores para modelar o estilo dos seus roteiros
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
        >
          <Plus className="h-4 w-4" />
          Novo Criador
        </Button>
      </div>

      {/* Lista de Criadores */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : creators.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum criador cadastrado</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Adicione criadores de conteúdo para que a IA possa modelar o estilo deles nos seus roteiros.
            </p>
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Criador
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {creators.map((creator, index) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{creator.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="gap-1">
                            <Video className="h-3 w-3" />
                            {creator.video_count} vídeos
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Remover criador "${creator.name}"?`)) {
                            deleteMutation.mutate(creator.id)
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {creator.style_summary && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {creator.style_summary}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setExpandedCreator(
                          expandedCreator === creator.id ? null : creator.id
                        )}
                      >
                        {expandedCreator === creator.id ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Ver Vídeos
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddVideoCreatorId(creator.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Lista de Vídeos Expandida */}
                    <AnimatePresence>
                      {expandedCreator === creator.id && creator.transcriptions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 space-y-2 overflow-hidden"
                        >
                          {creator.transcriptions.map((t, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm"
                            >
                              <Play className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 truncate">
                                {t.video_title || t.video_url}
                              </span>
                              <a
                                href={t.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal: Novo Criador */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Criador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Criador</Label>
              <Input
                id="name"
                placeholder="Ex: MrBeast, Lex Fridman..."
                value={newCreatorName}
                onChange={(e) => setNewCreatorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="urls">URLs dos Vídeos (opcional)</Label>
              <Textarea
                id="urls"
                placeholder="Cole URLs de vídeos do YouTube, TikTok ou Instagram (uma por linha)"
                value={newCreatorUrls}
                onChange={(e) => setNewCreatorUrls(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Os vídeos serão transcritos automaticamente para análise de estilo
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCreator}
              disabled={!newCreatorName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Criador'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Vídeo */}
      <Dialog open={!!addVideoCreatorId} onOpenChange={() => setAddVideoCreatorId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Vídeo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="video-url">URL do Vídeo</Label>
              <Input
                id="video-url"
                placeholder="https://youtube.com/watch?v=..."
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Suporta YouTube, TikTok e Instagram
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddVideoCreatorId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddVideo}
              disabled={!newVideoUrl.trim() || addVideoMutation.isPending}
            >
              {addVideoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transcrevendo...
                </>
              ) : (
                'Adicionar Vídeo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
