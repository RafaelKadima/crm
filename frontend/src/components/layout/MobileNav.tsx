import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Kanban,
  MessageSquare,
  CheckSquare,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: LayoutDashboard, label: 'Home', path: '/' },
  { icon: Kanban, label: 'Leads', path: '/leads' },
  { icon: MessageSquare, label: 'Tickets', path: '/tickets' },
  { icon: CheckSquare, label: 'Tarefas', path: '/tasks' },
  { icon: Menu, label: 'Mais', path: '/menu' },
]

export function MobileNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/95 backdrop-blur-xl border-t md:hidden">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path))

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-1 w-8 h-1 rounded-full bg-primary"
                />
              )}
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

