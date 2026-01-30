import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  BellOff,
  BellRing,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useTheme } from '@/hooks/useTheme'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { UserPointsBadge } from '@/components/gamification/UserPointsBadge'
import { Breadcrumbs } from './Breadcrumbs'
import { useSoundSettings } from '@/hooks/useSounds'

export function Header() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore()
  const { theme, setTheme } = useTheme()
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundSettings()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [soundAnimating, setSoundAnimating] = useState(false)

  const handleToggleSound = () => {
    toggleSound()
    setSoundAnimating(true)
    setTimeout(() => setSoundAnimating(false), 600)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 transition-all duration-200",
        "bg-background/80 backdrop-blur-xl",
        "left-0 md:left-[72px]",
        !sidebarCollapsed && "md:left-[280px]"
      )}
      style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Compact Search */}
          <div className="hidden md:block relative">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors duration-200",
              searchFocused ? "text-white" : "text-muted-foreground"
            )} />
            <Input
              placeholder="Buscar..."
              className={cn(
                "pl-9 w-44 h-9 text-sm bg-card/50 transition-all duration-200",
                "border-white/5 focus:border-white/20 focus:w-56",
                "placeholder:text-muted-foreground/60"
              )}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>

          {/* Gamification Points Badge */}
          <UserPointsBadge className="hidden md:block" />

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "relative overflow-hidden transition-all duration-200",
              "hover:bg-white/5 hover:text-white",
              "border border-transparent hover:border-white/10"
            )}
          >
            <AnimatePresence mode="wait">
              {theme === 'dark' ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Sun className="h-5 w-5 text-white/80" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3 }}
                >
                  <Moon className="h-5 w-5 text-slate-600" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSound}
            title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
            className={cn(
              "relative transition-all duration-300",
              "hover:bg-white/5 hover:text-white",
              "border border-transparent hover:border-white/10",
              soundEnabled && "text-amber-400",
              !soundEnabled && "text-muted-foreground/50",
              soundAnimating && "scale-110"
            )}
          >
            <AnimatePresence mode="wait">
              {soundEnabled ? (
                <motion.div
                  key="bell-on"
                  initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    rotate: [0, 15, -15, 10, -10, 0],
                  }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <BellRing className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="bell-off"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <BellOff className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Glow indicator when sound is ON */}
            {soundEnabled && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400"
                style={{ boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)' }}
              />
            )}
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative transition-all duration-200",
                "hover:bg-white/5 hover:text-white",
                "border border-transparent hover:border-white/10",
                showNotifications && "bg-white/5 border-white/10"
              )}
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-white/80"
                style={{ boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)' }}
              />
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 rounded-xl overflow-hidden futuristic-card"
                >
                  <div className="p-4 border-b border-white/5">
                    <h3 className="font-display font-semibold text-white">Notificações</h3>
                  </div>
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                      <Bell className="h-6 w-6 text-white/30" />
                    </div>
                    Nenhuma notificação
                  </div>
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
                "hover:bg-white/5 border border-transparent hover:border-white/10",
                showUserMenu && "bg-white/5 border-white/10"
              )}
            >
              <div className="relative">
                <Avatar
                  src={user?.avatar}
                  fallback={user?.name || 'U'}
                  size="sm"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background"
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
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        navigate('/settings/profile')
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200",
                        "hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm">Meu Perfil</span>
                    </button>
                    <div className="my-1 border-t border-white/5" />
                    <button
                      onClick={handleLogout}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200",
                        "hover:bg-destructive/10 text-destructive"
                      )}
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm">Sair</span>
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
