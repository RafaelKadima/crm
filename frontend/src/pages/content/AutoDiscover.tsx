import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  Loader2,
  TrendingUp,
  Copy,
  ArrowLeft,
  Package,
  FileText,
  Eye,
  Volume2,
  Clock,
  Search,
  Video,
  Sparkles,
  ExternalLink,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface DiscoveryResult {
  discovered_video: {
    url: string
    title: string
    views: number
    platform: string
  }
  generated_script: {
    title: string
    hook_type: string
    hook_text: string
    script_template: string
    script_body: {
      time: string
      visual: string
      audio: string
    }[]
    cta_text: string
    viral_score_prediction: number
    hashtags?: string[]
  }
}

export function AutoDiscover() {
  const [topic, setTopic] = useState('')
  const [productId, setProductId] = useState('')
  const [result, setResult] = useState<DiscoveryResult | null>(null)

  // Busca produtos
  const { data: products } = useQuery({
    queryKey: ['products-select'],
    queryFn: async () => {
      const response = await api.get('/products', { params: { per_page: 100 } })
      return response.data.data
    },
  })

  const discoverMutation = useMutation({
    mutationFn: async (data: { topic: string; product_id?: string }) => {
      const response = await api.post('/ai/content/auto-discover-script', data)
      return response.data
    },
    onSuccess: (data) => {
      setResult(data)
      toast.success('Video descoberto e roteiro gerado!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro na auto-descoberta')
    },
  })

  const handleDiscover = () => {
    if (!topic.trim()) {
      toast.error('Digite um tema ou nicho')
      return
    }

    discoverMutation.mutate({
      topic,
      product_id: productId || undefined,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const copyFullScript = () => {
    if (!result?.generated_script) return
    const script = result.generated_script

    const fullText = `
VIDEO DE REFERENCIA: ${result.discovered_video.url}
(${result.discovered_video.title})

---

TITULO: ${script.title}

HOOK (${script.hook_type}):
"${script.hook_text}"

ESTRUTURA:
${script.script_template}

ROTEIRO COMPLETO:
${script.script_body.map(item => `[${item.time}]
Visual: ${item.visual}
Audio: ${item.audio}
`).join('\n')}

CTA:
"${script.cta_text}"

${script.hashtags ? `HASHTAGS:\n${script.hashtags.join(' ')}` : ''}
    `.trim()

    navigator.clipboard.writeText(fullText)
    toast.success('Roteiro completo copiado!')
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/content">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Zap className="h-8 w-8 text-orange-500" />
            Auto-Descoberta
          </h1>
          <p className="text-muted-foreground mt-1">
            A IA busca videos virais e gera roteiros automaticamente
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-6">
          {/* Topic */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Tema / Nicho
            </label>
            <Input
              placeholder="Ex: emagrecimento, marketing digital, skincare..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              A IA vai buscar os videos mais virais sobre este tema
            </p>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produto para Adaptar (opcional)
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-12 px-3 rounded-md border border-input bg-background"
            >
              <option value="">Selecione um produto</option>
              {products?.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Discover Button */}
          <Button
            onClick={handleDiscover}
            disabled={discoverMutation.isPending}
            className="w-full h-12 bg-gradient-to-r from-orange-600 to-red-600"
          >
            {discoverMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Buscando e gerando...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Descobrir e Gerar Roteiro
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading */}
      <AnimatePresence>
        {discoverMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="relative">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-orange-500" />
                  <Zap className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-orange-500" />
                </div>
                <p className="mt-4 text-lg font-medium">Descobrindo videos virais...</p>
                <p className="text-muted-foreground">
                  Buscando tendencias e gerando roteiro adaptado
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  <Badge variant="outline" className="animate-pulse">
                    <Search className="h-3 w-3 mr-1" />
                    Buscando videos
                  </Badge>
                  <Badge variant="outline" className="animate-pulse delay-75">
                    <Eye className="h-3 w-3 mr-1" />
                    Analisando estrutura
                  </Badge>
                  <Badge variant="outline" className="animate-pulse delay-150">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Gerando roteiro
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !discoverMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Discovered Video */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/20">
                      <Video className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Video Descoberto</p>
                      <h3 className="font-semibold text-lg">{result.discovered_video.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline">
                          {result.discovered_video.platform}
                        </Badge>
                        <Badge variant="secondary">
                          <Eye className="h-3 w-3 mr-1" />
                          {formatViews(result.discovered_video.views)} views
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <a
                    href={result.discovered_video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Ver Video
                    </Button>
                  </a>
                </div>
              </div>
            </Card>

            {/* Generated Script Header */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={cn(
                "p-6",
                result.generated_script.viral_score_prediction >= 80 && "bg-gradient-to-r from-green-500/10 to-emerald-500/10",
                result.generated_script.viral_score_prediction >= 60 && result.generated_script.viral_score_prediction < 80 && "bg-gradient-to-r from-yellow-500/10 to-orange-500/10",
                result.generated_script.viral_score_prediction < 60 && "bg-gradient-to-r from-red-500/10 to-rose-500/10"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{result.generated_script.title}</h2>
                    <p className="text-muted-foreground mt-1">Roteiro gerado automaticamente</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <TrendingUp className={cn(
                          "h-6 w-6",
                          result.generated_script.viral_score_prediction >= 80 && "text-green-500",
                          result.generated_script.viral_score_prediction >= 60 && result.generated_script.viral_score_prediction < 80 && "text-yellow-500",
                          result.generated_script.viral_score_prediction < 60 && "text-red-500"
                        )} />
                        <span className="text-3xl font-bold">{result.generated_script.viral_score_prediction}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Previsao Viral</p>
                    </div>
                    <Button variant="outline" onClick={copyFullScript}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Tudo
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Hook */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Hook ({result.generated_script.hook_type})
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(result.generated_script.hook_text)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-lg font-medium">
                  "{result.generated_script.hook_text}"
                </div>
              </CardContent>
            </Card>

            {/* Full Script */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Roteiro Completo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.generated_script.script_body.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <Badge variant="outline" className="font-mono">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.time}
                      </Badge>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            VISUAL
                          </p>
                          <p className="text-sm">{item.visual}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Volume2 className="h-3 w-3" />
                            AUDIO
                          </p>
                          <p className="text-sm">{item.audio}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    CTA (Chamada para Acao)
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(result.generated_script.cta_text)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-lg font-medium">
                  "{result.generated_script.cta_text}"
                </div>
              </CardContent>
            </Card>

            {/* Hashtags */}
            {result.generated_script.hashtags && result.generated_script.hashtags.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-cyan-500" />
                      Hashtags Sugeridas
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(result.generated_script.hashtags!.join(' '))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.generated_script.hashtags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Discover Again */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setResult(null)
                  discoverMutation.reset()
                }}
              >
                <Zap className="h-5 w-5 mr-2" />
                Descobrir Outro Video
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!result && !discoverMutation.isPending && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="relative inline-block">
              <Search className="h-16 w-16 text-muted-foreground/50" />
              <Zap className="h-8 w-8 text-orange-500 absolute -bottom-1 -right-1" />
            </div>
            <h3 className="mt-4 text-lg font-medium">Digite um tema para comecar</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              A IA vai buscar os videos mais virais sobre o tema e gerar um roteiro adaptado para seu produto
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
