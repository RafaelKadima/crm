import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  BellOff,
  BellRing,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
  Menu,
  MessageSquare,
  X,
  Circle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/axios'
import { toast } from 'sonner'
import { useUIStore } from '@/store/uiStore'
import { useTheme } from '@/hooks/useTheme'
import { useNotificationStore } from '@/store/notificationStore'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Breadcrumbs } from './Breadcrumbs'
import { useSoundSettings } from '@/hooks/useSounds'
import { useQueryClient } from '@tanstack/react-query'

export function Header() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuthStore()
  const [togglingAvailability, setTogglingAvailability] = useState(false)

  const handleToggleAvailability = async () => {
    if (!user || togglingAvailability) return
    const next = !(user.is_available_for_leads ?? true)
    setTogglingAvailability(true)
    try {
      const { data } = await api.patch('/profile/availability', { is_available_for_leads: next })
      updateUser({ is_available_for_leads: data.is_available_for_leads })
      toast.success(data.message)
    } catch {
      toast.error('Não foi possível alterar disponibilidade.')
    } finally {
      setTogglingAvailability(false)
    }
  }
  const queryClient = useQueryClient()
  const { sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const { theme, setTheme } = useTheme()
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundSettings()
  const unreadMessages = useNotificationStore((s) => s.unreadMessages)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const totalUnread = useNotificationStore((s) => s.getTotalUnread())
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Close notification dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications])

  const unreadList = Array.from(unreadMessages.values())
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

  const formatTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'agora'
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }

  const handleToggleSound = () => {
    toggleSound()
  }

  const handleLogout = () => {
    // Limpa cache do React Query para não vazar dados do tenant anterior
    // (canais, mensagens, tickets etc.) quando o próximo usuário fizer login.
    queryClient.clear()
    logout()
    navigate('/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-14 transition-all duration-200",
        "bg-background/90 backdrop-blur-md border-b border-border",
        "left-0 md:left-[72px]",
        !sidebarCollapsed && "md:left-[280px]"
      )}
    >
      <div className="h-full flex items-center justify-between px-3 sm:px-6">
        {/* Mobile menu button + Breadcrumbs */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Breadcrumbs />
        </div>

        {/* Actions — minimal */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSound}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              soundEnabled && "text-foreground"
            )}
          >
            {soundEnabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative transition-all duration-200",
                "hover:bg-accent hover:text-foreground",
                showNotifications && "bg-accent"
              )}
            >
              <Bell className="h-5 w-5" />
              {totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1"
                  style={{ boxShadow: '0 0 8px var(--color-primary)' }}
                >
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden futuristic-card z-50"
                >
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <h3 className="font-display font-semibold text-foreground text-sm">
                      {t('settings.notifications')}
                      {totalUnread > 0 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({totalUnread})
                        </span>
                      )}
                    </h3>
                    {totalUnread > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          markAllAsRead()
                        }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  {unreadList.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                        <Bell className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                      Nenhuma notificação
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {unreadList.slice(0, 20).map((msg) => (
                        <button
                          key={msg.leadId}
                          onClick={() => {
                            markAsRead(msg.leadId)
                            setShowNotifications(false)
                            navigate(`/conversas?lead=${msg.leadId}`)
                          }}
                          className="w-full px-3 py-2.5 flex items-start gap-3 hover:bg-accent/50 transition-colors text-left border-b border-border/50 last:border-0"
                        >
                          <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <MessageSquare className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-foreground">
                                {msg.count} {msg.count === 1 ? 'nova mensagem' : 'novas mensagens'}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatTimeAgo(msg.lastMessageAt)}
                              </span>
                            </div>
                            {msg.lastMessagePreview && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {msg.lastMessagePreview}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(msg.leadId)
                            }}
                            className="mt-0.5 p-1 rounded hover:bg-muted transition-colors shrink-0"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl transition-all duration-200",
                "hover:bg-white/5 border border-transparent hover:border-border",
                showUserMenu && "bg-accent border-border"
              )}
            >
              <div className="relative">
                <Avatar
                  src={user?.avatar}
                  fallback={user?.name || 'U'}
                  size="sm"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-background"
                  style={{ boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)' }}
                />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                showUserMenu && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden futuristic-card"
                >
                  <div className="p-2">
                    {/* Toggle ON/OFF de recebimento de leads */}
                    {user && user.role !== 'admin' && (
                      <>
                        <button
                          onClick={handleToggleAvailability}
                          disabled={togglingAvailability}
                          className={cn(
                            "flex items-center justify-between gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200",
                            "hover:bg-accent",
                            togglingAvailability && "opacity-50 cursor-wait"
                          )}
                          title={
                            (user.is_available_for_leads ?? true)
                              ? 'Você está recebendo leads. Clique para desligar (folga).'
                              : 'Você NÃO está recebendo leads. Clique para voltar a receber.'
                          }
                        >
                          <div className="flex items-center gap-3">
                            <Circle
                              className={cn(
                                "h-3 w-3 fill-current",
                                (user.is_available_for_leads ?? true)
                                  ? "text-emerald-500"
                                  : "text-zinc-500"
                              )}
                            />
                            <span className="text-sm">
                              {(user.is_available_for_leads ?? true) ? 'Disponível' : 'De folga'}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            {(user.is_available_for_leads ?? true) ? 'ON' : 'OFF'}
                          </span>
                        </button>
                        <div className="my-1 border-t border-border" />
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        navigate('/settings/profile')
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200",
                        "hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm">{t('common.profile')}</span>
                    </button>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={handleLogout}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200",
                        "hover:bg-destructive/10 text-destructive"
                      )}
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm">{t('common.logout')}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
