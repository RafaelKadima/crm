import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function MainLayout() {
  const { sidebarCollapsed } = useUIStore()

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <Sidebar />
      <Header />

      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn("pt-16 flex-1 flex flex-col overflow-hidden")}
      >
        <div className="flex-1 p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </div>
      </motion.main>
    </div>
  )
}

