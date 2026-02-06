import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/layout/PageHeader'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  CheckCircle,
  Circle,
  Calendar,
  Phone,
  Mail,
  Video,
  Loader2,
  ListTodo,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn, formatDate } from '@/lib/utils'
import { useTasks, useCompleteTask } from '@/hooks/useTasks'
import { TaskModal } from './TaskModal'
import type { Task } from '@/types'

const typeIcons: Record<string, typeof Phone> = {
  call: Phone,
  whatsapp: MessageCircle,
  meeting: Video,
  follow_up: Mail,
  other: MoreHorizontal,
}

const typeColors: Record<string, string> = {
  call: 'text-green-400 bg-green-500/20',
  whatsapp: 'text-emerald-400 bg-emerald-500/20',
  meeting: 'text-purple-400 bg-purple-500/20',
  follow_up: 'text-blue-400 bg-blue-500/20',
  other: 'text-muted-foreground bg-gray-500/20',
}

export function TasksPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const { data: tasksData, isLoading } = useTasks({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })
  const completeTaskMutation = useCompleteTask()

  const tasks = tasksData?.data || []

  // Filtrar por busca
  const filteredTasks = tasks.filter((task: Task) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query)
    )
  })

  const pendingCount = tasks.filter((t: Task) => t.status === 'pendente').length
  const completedCount = tasks.filter((t: Task) => t.status === 'concluida').length

  const toggleTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    completeTaskMutation.mutate(taskId)
  }

  const handleNewTask = () => {
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={t('tasks.title')}
        subtitle={`${pendingCount} ${t('tasks.pending')} • ${completedCount} ${t('tasks.completed')}`}
        actions={
          <Button onClick={handleNewTask}>
            <Plus className="h-4 w-4 mr-2" />
            {t('tasks.newTask')}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('tasks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            {t('tasks.all')}
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
          >
            {t('tasks.pendingFilter')}
          </Button>
          <Button
            variant={statusFilter === 'done' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('done')}
          >
            {t('tasks.completedFilter')}
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {filteredTasks.map((task: Task, index: number) => {
          const Icon = typeIcons[task.type] || CheckCircle
          const colorClass = typeColors[task.type] || typeColors.outros
          const isCompleted = task.status === 'concluida'

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  "transition-all cursor-pointer hover:border-blue-500/50",
                  isCompleted && "opacity-60"
                )}
                onClick={() => handleEditTask(task)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => toggleTask(e, task.id)}
                      className="shrink-0"
                      disabled={completeTaskMutation.isPending}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "font-medium group-hover:text-blue-400 transition-colors",
                          isCompleted && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className={cn("gap-1.5 border-0", colorClass)}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {t(`tasks.types.${task.type}`, { defaultValue: task.type })}
                      </Badge>
                      {((task as any).due_at || task.due_date) && (
                        <div className={cn(
                          "flex items-center gap-1 text-sm",
                          new Date((task as any).due_at || task.due_date) < new Date() && !isCompleted
                            ? "text-red-400"
                            : "text-muted-foreground"
                        )}>
                          <Calendar className="h-4 w-4" />
                          {formatDate((task as any).due_at || task.due_date)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <ListTodo className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            {searchQuery ? t('tasks.noTaskFound') : t('tasks.noTaskRegistered')}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? t('tasks.tryAnotherSearch')
              : t('tasks.startAddingFirst')
            }
          </p>
          {!searchQuery && (
            <Button onClick={handleNewTask}>
              <Plus className="h-4 w-4 mr-2" />
              {t('tasks.createTask')}
            </Button>
          )}
        </motion.div>
      )}

      {/* Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
      />
    </div>
  )
}
