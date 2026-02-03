import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function MainLayout() {
  const { sidebarCollapsed, mobileMenuOpen, setMobileMenuOpen } = useUIStore()

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Sidebar />
      <Header />

      {/* Mobile overlay when sidebar is open */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn("pt-16 flex-1 flex flex-col min-h-0 max-md:!ml-0")}
      >
        {/* Content wrapper with safe-area padding */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 sm:p-5 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[1600px] mx-auto flex-1 min-h-0 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </div>
      </motion.main>
    </div>
  )
}

