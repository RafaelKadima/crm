import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import { 
  BookOpen, 
  Plus, 
  Search, 
  Upload, 
  FileText, 
  Star, 
  Shield, 
  TrendingUp, 
  Palette,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Brain
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import api from '@/api/axios'
import { cn } from '@/lib/utils'

// Tipos
interface KnowledgeItem {
  id: string
  title: string
  content: string
  category: string
  priority: number
  tags: string[]
  source: string
  usage_count: number
  created_at: string
}

interface KnowledgeStats {
  total: number
  total_usage: number
  avg_usage: number
  by_category: Record<string, number>
  by_source: Record<string, number>
  top_used: { id: string; title: string; category: string; usage_count: number }[]
}

// Categorias disponíveis
const CATEGORIES = [
  { id: 'rules', name: 'Regras de Negócio', icon: Shield, color: 'text-red-500', bg: 'bg-red-100' },
  { id: 'best_practices', name: 'Melhores Práticas', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  { id: 'brand_guidelines', name: 'Diretrizes de Marca', icon: Palette, color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: 'patterns', name: 'Padrões de Performance', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-100' },
  { id: 'documents', name: 'Documentos', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-100' },
]

export default function AdsKnowledgeBase() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  
  // Form state para novo conhecimento
  const [newKnowledge, setNewKnowledge] = useState({
    title: '',
    content: '',
    category: 'best_practices',
    priority: 5,
    tags: ''
  })

  // Busca conhecimento
  const { data: knowledgeData, isLoading } = useQuery({
    queryKey: ['ads-knowledge', selectedCategory, searchTerm],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (selectedCategory) params.category = selectedCategory
      if (searchTerm) params.search = searchTerm
      
      const response = await api.get('/ads/knowledge', { params })
      return response.data
    }
  })

  // Busca estatísticas
  const { data: stats } = useQuery<KnowledgeStats>({
    queryKey: ['ads-knowledge-stats'],
    queryFn: async () => {
      const response = await api.get('/ads/knowledge/insights')
      return response.data
    }
  })

  // Adiciona conhecimento manualmente
  const addKnowledge = useMutation({
    mutationFn: async (data: typeof newKnowledge) => {
      return api.post('/ads/knowledge', {
        ...data,
        tags: data.tags.split(',').map(t => t.trim()).filter(Boolean)
      })
    },
    onSuccess: () => {
      toast.success('Conhecimento adicionado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['ads-knowledge'] })
      setIsAddModalOpen(false)
      setNewKnowledge({ title: '', content: '', category: 'best_practices', priority: 5, tags: '' })
    },
    onError: () => {
      toast.error('Erro ao adicionar conhecimento')
    }
  })

  // Upload de arquivo
  const uploadFile = useMutation({
    mutationFn: async (formData: FormData) => {
      return api.post('/ai/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: (response) => {
      toast.success(`Documento processado: ${response.data.chunks_created} chunks criados`)
      queryClient.invalidateQueries({ queryKey: ['ads-knowledge'] })
      setIsUploadModalOpen(false)
    },
    onError: () => {
      toast.error('Erro ao processar documento')
    }
  })

  // Deleta conhecimento
  const deleteKnowledge = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/ads/knowledge/${id}`)
    },
    onSuccess: () => {
      toast.success('Conhecimento removido')
      queryClient.invalidateQueries({ queryKey: ['ads-knowledge'] })
    }
  })

  // Trigger de aprendizado
  const triggerLearning = useMutation({
    mutationFn: async () => {
      return api.post('/ads/knowledge/learn', {
        type: 'campaign_patterns',
        min_roas: 1.5,
        min_conversions: 5
      })
    },
    onSuccess: (response) => {
      toast.success(`Aprendizado iniciado: ${response.data.patterns_found || 0} padrões encontrados`)
      queryClient.invalidateQueries({ queryKey: ['ads-knowledge'] })
    }
  })

  // Dropzone para upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', 'documents')
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''))
    
    uploadFile.mutate(formData)
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxFiles: 1
  })

  const knowledge = knowledgeData?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Base de Conhecimento"
        subtitle="Regras, práticas e padrões para o Ads Agent"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => triggerLearning.mutate()}
              disabled={triggerLearning.isPending}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {triggerLearning.isPending ? 'Aprendendo...' : 'Aprender de Campanhas'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>

            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <div className="text-sm text-muted-foreground">Total de conhecimentos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.total_usage || 0}</div>
            <div className="text-sm text-muted-foreground">Vezes utilizado</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.by_source?.manual || 0}</div>
            <div className="text-sm text-muted-foreground">Manual</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats?.by_source?.learned || 0}</div>
            <div className="text-sm text-muted-foreground">Aprendido</div>
          </CardContent>
        </Card>
      </div>

      {/* Search e Filtros */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conhecimento..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {CATEGORIES.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              <cat.icon className={cn("w-4 h-4 mr-1", selectedCategory !== cat.id && cat.color)} />
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista de Conhecimento */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : knowledge.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum conhecimento encontrado</p>
            <p className="text-sm text-muted-foreground">
              Adicione regras, práticas ou faça upload de documentos
            </p>
          </div>
        ) : (
          knowledge.map((item: KnowledgeItem) => {
            const category = CATEGORIES.find(c => c.id === item.category)
            const isExpanded = expandedItem === item.id
            
            return (
              <Card key={item.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-start gap-4"
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                >
                  <div className={cn("p-2 rounded-lg", category?.bg || 'bg-gray-100')}>
                    {category && <category.icon className={cn("w-5 h-5", category.color)} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{item.title}</h3>
                      {item.source === 'learned' && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Aprendido
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.content}</p>
                    
                    {item.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {item.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{item.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">Usado {item.usage_count}x</div>
                      <div className="text-xs text-muted-foreground">
                        Prioridade: {item.priority}
                      </div>
                    </div>
                    
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t p-4 bg-gray-50">
                    <p className="text-sm whitespace-pre-wrap mb-4">{item.content}</p>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        Criado em: {new Date(item.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteKnowledge.mutate(item.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Modal Adicionar */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Conhecimento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={newKnowledge.title}
                onChange={(e) => setNewKnowledge(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Regra de orçamento máximo"
              />
            </div>
            
            <div>
              <Label>Categoria</Label>
              <select
                className="w-full border rounded-md p-2"
                value={newKnowledge.category}
                onChange={(e) => setNewKnowledge(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                rows={5}
                value={newKnowledge.content}
                onChange={(e) => setNewKnowledge(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Descreva a regra, prática ou informação..."
              />
            </div>
            
            <div>
              <Label>Prioridade (1-10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={newKnowledge.priority}
                onChange={(e) => setNewKnowledge(prev => ({ ...prev, priority: Number(e.target.value) }))}
              />
            </div>
            
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={newKnowledge.tags}
                onChange={(e) => setNewKnowledge(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Ex: budget, regra, limite"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => addKnowledge.mutate(newKnowledge)}
                disabled={!newKnowledge.title || !newKnowledge.content || addKnowledge.isPending}
              >
                {addKnowledge.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Upload */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload de Documento</DialogTitle>
          </DialogHeader>
          
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-blue-600">Solte o arquivo aqui...</p>
            ) : (
              <>
                <p className="text-muted-foreground">Arraste um arquivo ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground mt-2">PDF, DOCX, TXT ou MD</p>
              </>
            )}
          </div>
          
          {uploadFile.isPending && (
            <div className="text-center text-muted-foreground">
              Processando documento...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
