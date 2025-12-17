import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  Video,
  Loader2,
  TrendingUp,
  Clock,
  Copy,
  Download,
  ArrowLeft,
  Package,
  FileText,
  Eye,
  Volume2,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface GeneratedScript {
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

export function GenerateScript() {
  const [searchParams] = useSearchParams()
  const [videoUrl, setVideoUrl] = useState(searchParams.get('video_url') || '')
  const [productId, setProductId] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [script, setScript] = useState<GeneratedScript | null>(null)

  // Busca produtos
  const { data: products } = useQuery({
    queryKey: ['products-select'],
    queryFn: async () => {
      const response = await api.get('/products', { params: { per_page: 100 } })
      return response.data.data
    },
  })

  const generateMutation = useMutation({
    mutationFn: async (data: { video_url: string; product_id?: string; product_description?: string }) => {
      const response = await api.post('/ai/content/generate-viral-script', data)
      return response.data
    },
    onSuccess: (data) => {
      setScript(data)
      toast.success('Roteiro gerado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao gerar roteiro')
    },
  })

  const handleGenerate = () => {
    if (!videoUrl.trim()) {
      toast.error('Cole o link do video de referencia')
      return
    }
    if (!productId && !productDescription.trim()) {
      toast.error('Selecione um produto ou descreva o que quer promover')
      return
    }

    generateMutation.mutate({
      video_url: videoUrl,
      product_id: productId || undefined,
      product_description: productDescription || undefined,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const copyFullScript = () => {
    if (!script) return

    const fullText = `
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
            <Sparkles className="h-8 w-8 text-purple-500" />
            Gerar Roteiro Viral
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie roteiros baseados em videos de referencia
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 space-y-6">
          {/* Video URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video de Referencia
            </label>
            <Input
              placeholder="Cole o link do video viral (YouTube ou TikTok)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              A IA vai analisar a estrutura deste video e adaptar para seu produto
            </p>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produto
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full h-12 px-3 rounded-md border border-input bg-background"
            >
              <option value="">Selecione um produto (opcional)</option>
              {products?.map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Or description */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou descreva</span>
            </div>
          </div>

          {/* Product Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Descricao do Produto/Servico</label>
            <Textarea
              placeholder="Descreva o que voce quer promover (produto, servico, oferta...)"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Gerando roteiro...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Gerar Roteiro Viral
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Loading */}
      <AnimatePresence>
        {generateMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-purple-500" />
                <p className="mt-4 text-lg font-medium">Gerando roteiro viral...</p>
                <p className="text-muted-foreground">
                  Analisando video e adaptando para seu produto
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Script */}
      <AnimatePresence>
        {script && !generateMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Header with Score */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={cn(
                "p-6",
                script.viral_score_prediction >= 80 && "bg-gradient-to-r from-green-500/10 to-emerald-500/10",
                script.viral_score_prediction >= 60 && script.viral_score_prediction < 80 && "bg-gradient-to-r from-yellow-500/10 to-orange-500/10",
                script.viral_score_prediction < 60 && "bg-gradient-to-r from-red-500/10 to-rose-500/10"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{script.title}</h2>
                    <p className="text-muted-foreground mt-1">Roteiro gerado com sucesso!</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <TrendingUp className={cn(
                          "h-6 w-6",
                          script.viral_score_prediction >= 80 && "text-green-500",
                          script.viral_score_prediction >= 60 && script.viral_score_prediction < 80 && "text-yellow-500",
                          script.viral_score_prediction < 60 && "text-red-500"
                        )} />
                        <span className="text-3xl font-bold">{script.viral_score_prediction}%</span>
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
                    Hook ({script.hook_type})
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(script.hook_text)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-lg font-medium">
                  "{script.hook_text}"
                </div>
              </CardContent>
            </Card>

            {/* Script Structure */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Estrutura Narrativa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">
                  {script.script_template}
                </p>
              </CardContent>
            </Card>

            {/* Full Script */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-purple-500" />
                  Roteiro Completo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {script.script_body.map((item, index) => (
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
                    onClick={() => copyToClipboard(script.cta_text)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-lg font-medium">
                  "{script.cta_text}"
                </div>
              </CardContent>
            </Card>

            {/* Hashtags */}
            {script.hashtags && script.hashtags.length > 0 && (
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
                      onClick={() => copyToClipboard(script.hashtags!.join(' '))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {script.hashtags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
