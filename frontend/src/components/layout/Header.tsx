import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useTheme } from '@/hooks/useTheme'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function Header() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { sidebarCollapsed } = useUIStore()
  const { theme, setTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

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
        "fixed top-0 right-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b transition-all duration-200",
        sidebarCollapsed ? "left-[72px]" : "left-[260px]"
      )}
    >
      <div className="h-full flex items-center justify-between px-6">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads, contatos..."
              className="pl-10 bg-secondary/50 border-0"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            <AnimatePresence mode="wait">
              {theme === 'dark' ? (
                <motion.div
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                >
                  <Sun className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                >
                  <Moon className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 rounded-xl bg-card border shadow-xl overflow-hidden"
                >
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">Notificações</h3>
                  </div>
                  <div className="p-4 text-center text-sm text-muted-foreground">
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
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <Avatar
                src={user?.avatar}
                fallback={user?.name || 'U'}
                size="sm"
              />
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-card border shadow-xl overflow-hidden"
                >
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false)
                        navigate('/settings/profile')
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm">Meu Perfil</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
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

