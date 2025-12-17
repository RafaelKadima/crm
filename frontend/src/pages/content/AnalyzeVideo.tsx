import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Video,
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Zap,
  MessageSquare,
  Eye,
  ThumbsUp,
  Share2,
  ArrowLeft,
  Copy,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface ViralAnalysis {
  title: string
  hook_type: string
  hook_text: string
  retention_techniques: string[]
  mental_triggers: string[]
  pacing: string
  cta_text: string
  viral_score: number
  script_structure: {
    time: string
    description: string
  }[]
}

export function AnalyzeVideo() {
  const [videoUrl, setVideoUrl] = useState('')
  const [analysis, setAnalysis] = useState<ViralAnalysis | null>(null)

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await api.post('/ai/content/analyze-viral', { video_url: url })
      return response.data
    },
    onSuccess: (data) => {
      setAnalysis(data)
      toast.success('Video analisado com sucesso!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao analisar video')
    },
  })

  const handleAnalyze = () => {
    if (!videoUrl.trim()) {
      toast.error('Cole o link do video')
      return
    }
    analyzeMutation.mutate(videoUrl)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
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
            <Search className="h-8 w-8 text-blue-500" />
            Analisar Video Viral
          </h1>
          <p className="text-muted-foreground mt-1">
            Descubra a estrutura de videos virais do YouTube e TikTok
          </p>
        </div>
      </div>

      {/* Input */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cole o link do video (YouTube ou TikTok)"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="h-12 text-lg"
              />
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-600"
            >
              {analyzeMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Analisar
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            A IA vai transcrever o video e analisar sua estrutura viral
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      <AnimatePresence>
        {analyzeMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-500" />
                <p className="mt-4 text-lg font-medium">Analisando video...</p>
                <p className="text-muted-foreground">
                  Isso pode levar alguns segundos
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && !analyzeMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className={cn(
                "p-6",
                analysis.viral_score >= 80 && "bg-gradient-to-r from-green-500/10 to-emerald-500/10",
                analysis.viral_score >= 60 && analysis.viral_score < 80 && "bg-gradient-to-r from-yellow-500/10 to-orange-500/10",
                analysis.viral_score < 60 && "bg-gradient-to-r from-red-500/10 to-rose-500/10"
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">{analysis.title}</h2>
                    <p className="text-muted-foreground mt-1">Analise concluida</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={cn(
                        "h-8 w-8",
                        analysis.viral_score >= 80 && "text-green-500",
                        analysis.viral_score >= 60 && analysis.viral_score < 80 && "text-yellow-500",
                        analysis.viral_score < 60 && "text-red-500"
                      )} />
                      <span className="text-4xl font-bold">{analysis.viral_score}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Score Viral</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Hook */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Hook (Gancho)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    Tipo: {analysis.hook_type}
                  </Badge>
                </div>
                <div className="relative">
                  <div className="p-4 rounded-lg bg-muted/50 text-lg">
                    "{analysis.hook_text}"
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(analysis.hook_text)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Techniques */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    Tecnicas de Retencao
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.retention_techniques.map((technique, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {technique}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                    Gatilhos Mentais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.mental_triggers.map((trigger, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {trigger}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pacing & CTA */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-500" />
                    Ritmo (Pacing)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{analysis.pacing}</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-orange-500" />
                    CTA (Chamada para Acao)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-3 rounded-lg bg-muted/50">
                    "{analysis.cta_text}"
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Script Structure */}
            {analysis.script_structure && analysis.script_structure.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-cyan-500" />
                    Estrutura do Roteiro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.script_structure.map((item, index) => (
                      <div key={index} className="flex gap-4 p-3 rounded-lg bg-muted/50">
                        <Badge variant="outline" className="shrink-0">
                          {item.time}
                        </Badge>
                        <p className="text-sm">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action */}
            <div className="flex justify-center gap-4">
              <Link to={`/content/generate?video_url=${encodeURIComponent(videoUrl)}`}>
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600">
                  <FileText className="h-5 w-5 mr-2" />
                  Gerar Roteiro Baseado Neste Video
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!analysis && !analyzeMutation.isPending && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Video className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">Cole um link para comecar</h3>
            <p className="text-muted-foreground mt-2">
              Suportamos videos do YouTube e TikTok
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
