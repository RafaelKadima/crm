import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Video,
  TrendingUp,
  FileText,
  Clock,
  ArrowRight,
  Users,
  MessageSquare,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { contentApi } from '@/api/content'

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
  // Busca criadores para stats
  const { data: creatorsData } = useQuery({
    queryKey: ['content-creators'],
    queryFn: async () => {
      const response = await contentApi.listCreators()
      return response.data
    }
  })

  // Busca sessões para stats
  const { data: sessionsData } = useQuery({
    queryKey: ['content-sessions'],
    queryFn: async () => {
      const response = await contentApi.listSessions(10)
      return response.data
    }
  })

  const creators = creatorsData?.creators || []
  const sessions = sessionsData?.sessions || []
  const totalVideos = creators.reduce((sum, c) => sum + c.video_count, 0)
  const completedSessions = sessions.filter(s => s.current_step === 'completed').length

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
            Crie roteiros virais com inteligência artificial
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/content/creators">
            <Button variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Criadores
            </Button>
          </Link>
          <Link to="/content/chat">
            <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
              <Bot className="h-4 w-4" />
              Chat com Agente
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Criadores Cadastrados"
          value={creators.length}
          icon={Users}
          color="bg-blue-500"
          description="Para modelar estilo"
        />
        <StatCard
          title="Vídeos Transcritos"
          value={totalVideos}
          icon={Video}
          color="bg-purple-500"
          description="Base de conhecimento"
        />
        <StatCard
          title="Roteiros Gerados"
          value={completedSessions}
          icon={FileText}
          color="bg-green-500"
          description="Sessões completas"
        />
        <StatCard
          title="Conversas Ativas"
          value={sessions.filter(s => s.current_step !== 'completed').length}
          icon={MessageSquare}
          color="bg-orange-500"
          description="Em andamento"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/content/chat">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                  <Bot className="h-8 w-8 text-purple-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Chat com Agente</h3>
                  <p className="text-sm text-muted-foreground">
                    Converse com a IA para criar roteiros virais
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/content/creators">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Gerenciar Criadores</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicione criadores para modelar o estilo
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/content/viral-search">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Busca Viral</h3>
                  <p className="text-sm text-muted-foreground">
                    Encontre vídeos virais para inspiração
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Sessions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Conversas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.slice(0, 5).map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/content/chat?session=${session.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <MessageSquare className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {session.topic || 'Nova conversa'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.updated_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        session.current_step === 'completed' && "border-green-500 text-green-500",
                        session.current_step === 'write_reel' && "border-blue-500 text-blue-500",
                        session.current_step === 'idle' && "border-gray-500 text-gray-500"
                      )}
                    >
                      {session.current_step === 'completed' ? 'Concluído' :
                       session.current_step === 'write_reel' ? 'Escrevendo' :
                       session.current_step === 'generate_hooks' ? 'Hooks' :
                       session.current_step === 'select_creator' ? 'Seleção' :
                       session.current_step === 'research' ? 'Pesquisa' :
                       'Aguardando'}
                    </Badge>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {sessions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conversa ainda</p>
              <Link to="/content/chat">
                <Button className="mt-4" variant="outline">
                  Iniciar primeira conversa
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
