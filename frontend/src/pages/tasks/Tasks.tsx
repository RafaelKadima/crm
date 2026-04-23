import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const typeAccent: Record<string, string> = {
  call: '#25D366',
  whatsapp: '#10B981',
  meeting: '#A78BFA',
  follow_up: '#8AA4FF',
  other: 'var(--color-muted-foreground)',
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

  const filteredTasks = tasks.filter((task: Task) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return task.title.toLowerCase().includes(q) || task.description?.toLowerCase().includes(q)
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
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-bold-ink)' }} />
      </div>
    )
  }

  const statusTabs = [
    { key: 'all',     label: t('tasks.all'),              count: tasks.length },
    { key: 'pending', label: t('tasks.pendingFilter'),    count: pendingCount },
    { key: 'done',    label: t('tasks.completedFilter'),  count: completedCount },
  ]

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <p className="eyebrow">CRM · TAREFAS</p>
          <h1 className="mt-2 font-display text-[40px] leading-[1.02] tracking-[-0.02em] md:text-[48px]">
            {t('tasks.title')}
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            <span className="font-display text-[16px] leading-none tracking-[-0.015em]">{pendingCount}</span>{' '}
            {t('tasks.pending')} ·{' '}
            <span className="font-display text-[16px] leading-none tracking-[-0.015em]">{completedCount}</span>{' '}
            {t('tasks.completed')}
          </p>
        </div>
        <Button variant="bold" size="sm" onClick={handleNewTask}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('tasks.newTask')}
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div
          className="flex items-center gap-1 rounded-[12px] p-1"
          style={{ background: 'var(--color-secondary)' }}
        >
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                style={
                  isActive
                    ? { background: 'var(--color-bold-ink)', color: '#0A0A0C' }
                    : { color: 'var(--color-muted-foreground)' }
                }
              >
                <span>{tab.label}</span>
                <span
                  className="rounded-full px-1.5 py-0 text-[10.5px] font-bold"
                  style={{
                    background: isActive ? 'rgba(10,10,12,0.12)' : 'var(--color-card)',
                    color: isActive ? '#0A0A0C' : 'var(--color-muted-foreground)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('tasks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-[10px] pl-10 text-[13.5px]"
          />
        </div>
      </motion.div>

      {/* Tasks list */}
      <div className="space-y-2">
        {filteredTasks.map((task: Task, index: number) => {
          const Icon = typeIcons[task.type] || CheckCircle
          const accent = typeAccent[task.type] || typeAccent.other
          const isCompleted = task.status === 'concluida'
          const due = (task as any).due_at || task.due_date
          const isOverdue = due && new Date(due) < new Date() && !isCompleted

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
            >
              <div
                onClick={() => handleEditTask(task)}
                className={cn(
                  'group cursor-pointer rounded-[12px] border p-4 transition-all',
                  'hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)]',
                  isCompleted && 'opacity-55'
                )}
                style={{
                  background: 'var(--color-card)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => toggleTask(e, task.id)}
                    className="shrink-0 transition-transform hover:scale-110"
                    disabled={completeTaskMutation.isPending}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-[14px] font-medium leading-tight',
                        isCompleted && 'line-through text-muted-foreground'
                      )}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        borderColor: 'var(--color-border)',
                        background: 'var(--color-secondary)',
                        color: 'var(--color-foreground)',
                      }}
                    >
                      <Icon className="h-3 w-3" style={{ color: accent }} />
                      {t(`tasks.types.${task.type}`, { defaultValue: task.type })}
                    </span>
                    {due && (
                      <div
                        className="flex items-center gap-1 text-[12px] font-medium"
                        style={{ color: isOverdue ? 'var(--color-destructive)' : 'var(--color-muted-foreground)' }}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(due)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredTasks.length === 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-20 text-center"
        >
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: 'var(--color-secondary)' }}
          >
            <ListTodo className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="eyebrow mb-2">NENHUMA TAREFA</p>
          <h3 className="font-display text-[26px] leading-[1.1] tracking-[-0.015em]">
            {searchQuery ? t('tasks.noTaskFound') : t('tasks.noTaskRegistered')}
          </h3>
          <p className="mx-auto mt-2 max-w-[400px] text-[13.5px] text-muted-foreground">
            {searchQuery ? t('tasks.tryAnotherSearch') : t('tasks.startAddingFirst')}
          </p>
          {!searchQuery && (
            <div className="mt-5">
              <Button variant="bold" onClick={handleNewTask}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t('tasks.createTask')}
              </Button>
            </div>
          )}
        </motion.div>
      )}

      <TaskModal isOpen={isModalOpen} onClose={handleCloseModal} task={selectedTask} />
    </div>
  )
}
