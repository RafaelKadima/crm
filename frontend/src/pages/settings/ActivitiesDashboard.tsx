import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Clock,
  CalendarClock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  User,
  ChevronRight,
  Calendar,
  Users,
  ChevronDown,
} from 'lucide-react'
import { useActivitiesDashboard } from '@/hooks/useStageActivities'
import { useUsers } from '@/hooks/useUsers'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DashboardActivity } from '@/api/endpoints'

interface ActivityCardProps {
  activity: DashboardActivity
  onClick?: () => void
}

function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const isOverdue = activity.is_overdue
  const dueDate = activity.due_at ? new Date(activity.due_at) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-700/30 ${
        isOverdue
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-gray-800/50 border-gray-700/50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
            isOverdue ? 'bg-red-500/20' : 'bg-amber-500/20'
          }`}
        >
          {activity.template?.icon || '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">
              {activity.template?.title || 'Atividade'}
            </h4>
            {activity.is_required && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">
                Obrigatoria
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
            <span className="truncate">{activity.lead?.name}</span>
            {activity.lead?.company && (
              <>
                <span>-</span>
                <span className="truncate">{activity.lead.company}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            {activity.stage && (
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activity.stage.color }}
                />
                <span className="text-xs text-gray-500">{activity.stage.name}</span>
              </div>
            )}
            {activity.lead?.user_name && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <User className="w-3 h-3" />
                <span>{activity.lead.user_name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          {isOverdue ? (
            <div className="flex items-center gap-1 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{activity.days_overdue}d atrasado</span>
            </div>
          ) : dueDate ? (
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>
                {formatDistanceToNow(dueDate, { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          ) : null}
          {activity.template?.points && activity.template.points > 0 && (
            <div className="text-xs text-yellow-400 mt-1">
              +{activity.template.points} pts
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function ActivitiesDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const { data, isLoading, refetch, isFetching } = useActivitiesDashboard(
    selectedUserId ? { user_id: selectedUserId } : undefined
  )
  const { data: usersResponse } = useUsers()
  const users = usersResponse?.data || []
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'soon'>('overdue')

  const selectedUser = users.find((u: any) => u.id === selectedUserId)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const summary = data?.summary
  const overdueActivities = data?.overdue_activities || []
  const dueTodayActivities = data?.due_today_activities || []

  const handleActivityClick = (activity: DashboardActivity) => {
    // Navegar para o lead
    if (activity.lead?.id) {
      window.location.href = `/leads?selected=${activity.lead.id}`
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-primary" />
            Dashboard de Atividades
          </h2>
          <p className="text-gray-400 mt-1">
            Acompanhe prazos e atividades da equipe
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* User Filter Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors min-w-[180px]"
            >
              <Users className="w-4 h-4" />
              <span className="flex-1 text-left truncate">
                {selectedUser ? selectedUser.name : 'Todos os usuarios'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedUserId(undefined)
                    setShowUserDropdown(false)
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                    !selectedUserId ? 'bg-primary/20 text-primary' : ''
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Todos os usuarios</span>
                </button>
                <div className="border-t border-gray-700" />
                {users.map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id)
                      setShowUserDropdown(false)
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                      selectedUserId === user.id ? 'bg-primary/20 text-primary' : ''
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">Atrasadas</span>
          </div>
          <p className="text-3xl font-bold text-red-400">{summary?.overdue || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Vencem Hoje</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{summary?.due_today || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-medium">Proximos 3 dias</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{summary?.due_soon || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <User className="w-5 h-5" />
            <span className="text-sm font-medium">Pendentes</span>
          </div>
          <p className="text-3xl font-bold text-gray-400">{summary?.pending || 0}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">Concluidas Hoje</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{summary?.completed_today || 0}</p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'overdue'
              ? 'border-red-500 text-red-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Atrasadas
            {(summary?.overdue || 0) > 0 && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs">
                {summary?.overdue}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'today'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Vencem Hoje
            {(summary?.due_today || 0) > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs">
                {summary?.due_today}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Activity Lists */}
      <div className="space-y-3">
        {activeTab === 'overdue' && (
          <>
            {overdueActivities.length > 0 ? (
              overdueActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onClick={() => handleActivityClick(activity)}
                />
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">Nenhuma atividade atrasada!</p>
                <p className="text-sm">Sua equipe esta em dia.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'today' && (
          <>
            {dueTodayActivities.length > 0 ? (
              dueTodayActivities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onClick={() => handleActivityClick(activity)}
                />
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="font-medium">Nenhuma atividade para hoje</p>
                <p className="text-sm">Verifique os proximos dias.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* View All Link */}
      {((activeTab === 'overdue' && (summary?.overdue || 0) > 10) ||
        (activeTab === 'today' && (summary?.due_today || 0) > 10)) && (
        <button className="w-full py-3 text-center text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2">
          Ver todas as atividades
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
