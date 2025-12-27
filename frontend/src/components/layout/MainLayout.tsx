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
        {/* Content wrapper with safe-area padding */}
        <div className="flex-1 flex items-start justify-center p-4 md:p-6 overflow-hidden box-border">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[1600px] h-full overflow-y-auto"
          >
            <Outlet />
          </motion.div>
        </div>
      </motion.main>
    </div>
  )
}

