import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Video,
  TrendingUp,
  FileText,
  Sparkles,
  Play,
  Eye,
  ThumbsUp,
  Clock,
  ArrowRight,
  Zap,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import api from '@/api/axios'
import { Link } from 'react-router-dom'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  description?: string
}

function StatCard({ title, value, icon: Icon, color, description }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-3xl font-bold mt-2">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className={cn("p-3 rounded-xl", color)}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ContentDashboard() {
  // Stats mockados por enquanto - depois conectar com API
  const stats = {
    videosAnalyzed: 12,
    scriptsGenerated: 28,
    avgViralScore: 78,
    autoDiscoveries: 5,
  }

  const recentScripts = [
    {
      id: 1,
      title: 'Hook de Curiosidade - Produto X',
      viralScore: 85,
      createdAt: '2024-12-15',
      status: 'ready',
    },
    {
      id: 2,
      title: 'Roteiro Storytelling - Serviço Y',
      viralScore: 72,
      createdAt: '2024-12-14',
      status: 'ready',
    },
    {
      id: 3,
      title: 'Reels Trend - Oferta Z',
      viralScore: 91,
      createdAt: '2024-12-13',
      status: 'ready',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Video className="h-8 w-8 text-purple-500" />
            Content Creator
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie roteiros virais com inteligencia artificial
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/content/analyze">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Analisar Video
            </Button>
          </Link>
          <Link to="/content/generate">
            <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
              <Sparkles className="h-4 w-4" />
              Gerar Roteiro
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Videos Analisados"
          value={stats.videosAnalyzed}
          icon={Eye}
          color="bg-blue-500"
          description="Este mes"
        />
        <StatCard
          title="Roteiros Gerados"
          value={stats.scriptsGenerated}
          icon={FileText}
          color="bg-purple-500"
          description="Este mes"
        />
        <StatCard
          title="Score Viral Medio"
          value={`${stats.avgViralScore}%`}
          icon={TrendingUp}
          color="bg-green-500"
          description="Dos roteiros gerados"
        />
        <StatCard
          title="Auto-Descobertas"
          value={stats.autoDiscoveries}
          icon={Zap}
          color="bg-orange-500"
          description="Videos encontrados"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/content/analyze">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Search className="h-8 w-8 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Analisar Video Viral</h3>
                  <p className="text-sm text-muted-foreground">
                    Cole o link de um video viral e descubra sua estrutura
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/content/generate">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Sparkles className="h-8 w-8 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Gerar Roteiro</h3>
                  <p className="text-sm text-muted-foreground">
                    Crie um roteiro viral baseado em video de referencia
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/content/discover">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <Zap className="h-8 w-8 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Auto-Descoberta</h3>
                  <p className="text-sm text-muted-foreground">
                    IA busca videos virais e gera roteiros automaticamente
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Scripts */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Roteiros Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentScripts.map((script, index) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <FileText className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">{script.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Criado em {new Date(script.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-semibold",
                      script.viralScore >= 80 && "border-green-500 text-green-500",
                      script.viralScore >= 60 && script.viralScore < 80 && "border-yellow-500 text-yellow-500",
                      script.viralScore < 60 && "border-red-500 text-red-500"
                    )}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {script.viralScore}% viral
                  </Badge>
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {recentScripts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum roteiro gerado ainda</p>
              <Link to="/content/generate">
                <Button className="mt-4" variant="outline">
                  Gerar primeiro roteiro
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
