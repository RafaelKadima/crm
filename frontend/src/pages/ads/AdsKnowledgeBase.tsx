import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Brain,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Eye,
  Sparkles,
  BookOpen,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import api from '@/api/axios'

interface Knowledge {
  id: string
  title: string
  content: string
  category: string
  priority: number
  tags: string[]
  source: string
  usage_count: number
  is_verified: boolean
  created_at: string
}

const CATEGORIES = [
  { value: 'rules', label: 'Regras', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  { value: 'best_practices', label: 'Melhores Práticas', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'performance', label: 'Performance', icon: TrendingUp, color: 'bg-blue-100 text-blue-800' },
  { value: 'guidelines', label: 'Diretrizes', icon: BookOpen, color: 'bg-purple-100 text-purple-800' },
  { value: 'patterns', label: 'Padrões Aprendidos', icon: Sparkles, color: 'bg-yellow-100 text-yellow-800' },
]

export default function AdsKnowledgeBase() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedKnowledge, setSelectedKnowledge] = useState<Knowledge | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'best_practices',
    priority: 5,
    tags: '',
  })

  // Busca conhecimentos
  const { data: knowledgeData, isLoading } = useQuery({
    queryKey: ['ads-knowledge', selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      const response = await api.get(`/ads/knowledge?${params.toString()}`)
      return response.data
    },
  })

  // Criar conhecimento
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      const response = await api.post('/ads/knowledge', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Conhecimento adicionado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['ads-knowledge'] })
      setIsAddModalOpen(false)
      resetForm()
    },
    onError: () => {
      toast.error('Erro ao adicionar conhecimento')
    },
  })

  // Atualizar conhecimento
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const payload = {
        ...data,
        tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      const response = await api.put(`/ads/knowledge/${id}`, payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Conhecimento atualizado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['ads-knowledge'] })
      setIsAddModalOpen(false)
      setSelectedKnowledge(null)
      resetForm()
    },
    onError: () => {
      toast.error('Erro ao atualizar conhecimento')
    },
  })

  // Excluir conhecimento
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ads/knowledge/${id}`)
    },
    onSuccess: () => {
      toast.success('Conhecimento removido')
      queryClient.invalidateQueries({ queryKey: ['ads-knowledge'] })
    },
    onError: () => {
      toast.error('Erro ao remover conhecimento')
    },
  })

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'best_practices',
      priority: 5,
      tags: '',
    })
  }

  const handleEdit = (knowledge: Knowledge) => {
    setSelectedKnowledge(knowledge)
    setFormData({
      title: knowledge.title,
      content: knowledge.content,
      category: knowledge.category,
      priority: knowledge.priority,
      tags: knowledge.tags.join(', '),
    })
    setIsAddModalOpen(true)
  }

  const handleView = (knowledge: Knowledge) => {
    setSelectedKnowledge(knowledge)
    setIsViewModalOpen(true)
  }

  const handleSubmit = () => {
    if (selectedKnowledge) {
      updateMutation.mutate({ id: selectedKnowledge.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-600" />
            Base de Conhecimento
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie regras, melhores práticas e conhecimento do agente de Ads
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Conhecimento
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-5 gap-4">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const count = knowledgeData?.data?.filter((k: Knowledge) => k.category === cat.value).length || 0
          return (
            <Card 
              key={cat.value}
              className={`cursor-pointer transition-all ${selectedCategory === cat.value ? 'ring-2 ring-purple-500' : ''}`}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? 'all' : cat.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-gray-500">{cat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar conhecimento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Conhecimentos */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Carregando...
            </CardContent>
          </Card>
        ) : knowledgeData?.data?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum conhecimento encontrado</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar o primeiro
              </Button>
            </CardContent>
          </Card>
        ) : (
          knowledgeData?.data?.map((knowledge: Knowledge) => {
            const catInfo = getCategoryInfo(knowledge.category)
            const Icon = catInfo.icon
            return (
              <Card key={knowledge.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${catInfo.color} h-fit`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{knowledge.title}</h3>
                          {knowledge.is_verified && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                              Verificado
                            </Badge>
                          )}
                          {knowledge.source === 'learned' && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Aprendido
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{knowledge.content}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>Prioridade: {knowledge.priority}</span>
                          <span>Usos: {knowledge.usage_count}</span>
                          {knowledge.tags.length > 0 && (
                            <span className="flex gap-1">
                              {knowledge.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="ghost" size="sm" onClick={() => handleView(knowledge)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(knowledge)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm('Remover este conhecimento?')) {
                            deleteMutation.mutate(knowledge.id)
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Modal Adicionar/Editar */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open)
        if (!open) {
          setSelectedKnowledge(null)
          resetForm()
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedKnowledge ? 'Editar Conhecimento' : 'Adicionar Conhecimento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Regra de orçamento mínimo"
              />
            </div>
            
            <div>
              <Label>Conteúdo</Label>
              <textarea
                className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Descreva o conhecimento em detalhes..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.value !== 'patterns').map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Prioridade (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="orçamento, campanha, limite"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {selectedKnowledge ? 'Salvar Alterações' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedKnowledge && (
                <>
                  {(() => {
                    const catInfo = getCategoryInfo(selectedKnowledge.category)
                    const Icon = catInfo.icon
                    return (
                      <div className={`p-2 rounded-lg ${catInfo.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    )
                  })()}
                  {selectedKnowledge.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedKnowledge && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge>{getCategoryInfo(selectedKnowledge.category).label}</Badge>
                {selectedKnowledge.is_verified && (
                  <Badge variant="outline" className="bg-green-50 text-green-700">Verificado</Badge>
                )}
                {selectedKnowledge.source === 'learned' && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Aprendido pela IA
                  </Badge>
                )}
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="whitespace-pre-wrap">{selectedKnowledge.content}</p>
              </div>
              
              <div className="flex gap-4 text-sm text-gray-500">
                <span>Prioridade: {selectedKnowledge.priority}</span>
                <span>Usos: {selectedKnowledge.usage_count}</span>
                <span>Criado em: {new Date(selectedKnowledge.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              
              {selectedKnowledge.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedKnowledge.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setIsViewModalOpen(false)
              if (selectedKnowledge) handleEdit(selectedKnowledge)
            }}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
